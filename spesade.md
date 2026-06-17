# Spesade — Food Stock Management App
**Date:** 2026-05-15

## Overview

A mobile-first webapp for managing food stock of a company. Buyers maintain a template list of items with target quantities, conduct stock walks to count what's available, and generate shopping lists. Consumers can report out-of-stock items. Everyone can see incoming orders.

---

## 1. Architecture & Monorepo Structure

### Stack
- **Backend:** Go + Echo + sqlc + goose + PostgreSQL
- **Frontend:** React + Vite + shadcn/ui + Tailwind CSS + TanStack Query + PWA (vite-plugin-pwa)
- **Auth:** Google OAuth 2.0 → JWT in httpOnly cookie
- **Language management:** asdf (`.tool-versions` at repo root: Go 1.24, Node 22)
- **Local dev:** monade-cli (`monade.yaml` at root); local PostgreSQL instance

### Directory Layout

```
new-spesade/
├── .tool-versions              # asdf: Go 1.24, Node 22
├── .gitignore
├── monade.yaml                 # monade-cli service definitions
├── api/
│   ├── script/
│   │   ├── server              # starts Go dev server
│   │   └── setup               # creates DB, runs migrations
│   ├── cmd/server/             # main entrypoint
│   ├── internal/
│   │   ├── auth/               # Google OAuth + JWT logic
│   │   ├── handler/            # HTTP handlers (one file per domain)
│   │   ├── middleware/         # auth, role checks, CORS, logging
│   │   ├── service/            # business logic
│   │   └── db/                 # sqlc-generated code
│   ├── db/
│   │   ├── migrations/         # goose SQL migrations
│   │   └── queries/            # sqlc .sql query files
│   ├── go.mod
│   └── sqlc.yaml
└── frontend/
    ├── script/
    │   ├── server              # starts Vite dev server
    │   └── setup               # npm install
    ├── src/
    │   ├── components/         # shadcn + custom components
    │   ├── pages/              # one folder per role/flow
    │   ├── hooks/              # TanStack Query hooks
    │   └── lib/                # API client, auth helpers
    ├── package.json
    ├── vite.config.ts
    └── public/
        ├── manifest.webmanifest  # PWA manifest (name, icons, theme colour)
        └── icons/                # App icons (192x192, 512x512)
```

### monade.yaml Services
- `api` — Go, port 3000, runs `script/server`
- `frontend` — Node, port 5173, runs `script/server`
- `proxy` — routes `spesade.test` to both services

### Local Dev Setup
- PostgreSQL runs locally (brew/system install)
- `api/script/setup` creates the database and runs goose migrations
- No docker-compose needed

---

## 2. Data Model

### Tables

**`users`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| email | text unique | |
| name | text | |
| google_id | text unique | |
| role | enum | admin / buyer / consumer |
| active | bool | default true |
| created_at | timestamptz | |

**`categories`**
| Column | Type |
|---|---|
| id | uuid PK |
| name | text unique |
| created_at | timestamptz |

**`locations`**
| Column | Type |
|---|---|
| id | uuid PK |
| name | text unique |
| created_at | timestamptz |

**`items`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| category_id | uuid FK → categories | |
| target_quantity | int | total desired stock |
| unit | text | e.g. "cans", "boxes" |
| active | bool | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**`item_locations`** *(many-to-many, informational only)*
| Column | Type |
|---|---|
| item_id | uuid FK → items |
| location_id | uuid FK → locations |

**`stock_walks`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| buyer_id | uuid FK → users | |
| status | enum | in_progress / completed |
| started_at | timestamptz | |
| completed_at | timestamptz nullable | |

**`stock_walk_entries`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| walk_id | uuid FK → stock_walks | |
| item_id | uuid FK → items | |
| observed_quantity | int | counted by buyer |
| updated_at | timestamptz | |

*When a walk is started (`POST /stock-walks`), the API pre-populates one entry per active item with `observed_quantity = NULL`. This allows the frontend to show total progress (e.g. "12 / 34 checked") and lets the buyer see the full checklist from the start. An entry is considered "checked" once `observed_quantity` is set (including 0).*

**`shortage_reports`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| item_id | uuid FK → items | |
| reporter_id | uuid FK → users | |
| notes | text nullable | |
| created_at | timestamptz | |
| resolved_at | timestamptz nullable | |

**`purchase_orders`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| buyer_id | uuid FK → users | |
| walk_id | uuid FK → stock_walks nullable | originating walk |
| status | enum | ordered / received / cancelled |
| expected_by | date | target delivery date |
| notes | text nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**`purchase_order_items`**
| Column | Type |
|---|---|
| id | uuid PK |
| order_id | uuid FK → purchase_orders |
| item_id | uuid FK → items |
| quantity_ordered | int |

### Computed Data (not stored)

- **Shopping list**: derived from a completed walk — items where `observed_quantity < target_quantity`, need = `target_quantity - observed_quantity`. Also includes any `shortage_reports` that are still unresolved (`resolved_at IS NULL`) and whose item is not already on the shortage list from the walk itself.
- **Incoming orders**: all `purchase_orders` with `status = 'ordered'`, visible to all roles.

---

## 3. API Design

Base path: `/api/v1`. Auth via JWT in httpOnly cookie.

### Auth
| Method | Path | Description |
|---|---|---|
| GET | `/auth/google` | Redirect to Google OAuth |
| GET | `/auth/google/callback` | Exchange code, set cookie, redirect to app |
| POST | `/auth/logout` | Clear cookie |
| GET | `/auth/me` | Current user + role |

### Items *(admin + buyer: full CRUD; consumer: read)*
| Method | Path | Description |
|---|---|---|
| GET | `/items` | List active items (with category, locations, open shortage reports) |
| POST | `/items` | Create item |
| PUT | `/items/:id` | Update item |
| DELETE | `/items/:id` | Soft delete (active = false) |

### Categories *(admin + buyer: full CRUD; consumer: read)*
| Method | Path |
|---|---|
| GET | `/categories` |
| POST | `/categories` |
| PUT | `/categories/:id` |
| DELETE | `/categories/:id` |

### Locations *(admin + buyer: full CRUD; consumer: read)*
| Method | Path |
|---|---|
| GET | `/locations` |
| POST | `/locations` |
| PUT | `/locations/:id` |
| DELETE | `/locations/:id` |

### Stock Walks *(admin + buyer)*
| Method | Path | Description |
|---|---|---|
| POST | `/stock-walks` | Start a new walk |
| GET | `/stock-walks/:id` | Get walk with all entries |
| PUT | `/stock-walks/:id/entries/:itemId` | Update observed quantity for one item |
| POST | `/stock-walks/:id/complete` | Finalize walk |
| GET | `/stock-walks/:id/shopping-list` | Computed shopping list |

### Purchase Orders *(create/update: buyer + admin; read: all)*
| Method | Path | Description |
|---|---|---|
| POST | `/purchase-orders` | Create order (body: walk_id?, item list, expected_by) |
| GET | `/purchase-orders` | List orders (filterable by status) |
| GET | `/purchase-orders/:id` | Order detail with items |
| PUT | `/purchase-orders/:id` | Update status or expected_by |

### Shortage Reports *(create: all roles; read/resolve: buyer + admin)*
| Method | Path | Description |
|---|---|---|
| POST | `/shortage-reports` | Report item out of stock |
| GET | `/shortage-reports` | List open reports |
| PUT | `/shortage-reports/:id/resolve` | Mark resolved |

### Users *(admin only)*
| Method | Path | Description |
|---|---|---|
| GET | `/users` | List users |
| PUT | `/users/:id` | Update role or deactivate |

---

## 4. Frontend Structure & Key Flows

### Routes (role-gated)

```
/login                          → Google OAuth entry point
/dashboard                      → home, adapts by role

# All roles
/orders                         → incoming orders (read-only for consumer)
/report                         → quick out-of-stock report

# Buyer + Admin
/walk/new                       → start stock walk
/walk/:id                       → active walk checklist
/walk/:id/shopping-list         → completed walk results + order creation
/items                          → item list + CRUD
/categories                     → category management
/locations                      → location management

# Admin only
/users                          → user management
```

### PWA Support

The frontend is configured as a Progressive Web App via `vite-plugin-pwa`:
- `manifest.webmanifest` declares app name, icons, `display: standalone`, and theme colour
- Service worker uses a **network-first** strategy for API calls (fresh data when online) and **cache-first** for static assets
- Users can install the app to their home screen on iOS and Android for a native-app feel
- Offline support is limited to cached static assets; API-dependent screens show a graceful "you're offline" message

### Buyer Stock Walk UX (mobile-optimised)

This is the core interaction. Design principles: minimal taps, no finicky inputs, fast.

- Items in a scrollable list grouped by category
- Each row: item name, unit, target quantity
- Tapping an item opens a **bottom sheet** with a large numeric stepper (+/- buttons) and a number input
- Once a quantity is entered the row shows ✓ with the observed count
- Progress bar at top: "12 / 34 checked"
- Floating **"Complete Walk"** button when all items are checked; **"Complete anyway"** option always available
- On completion → immediately navigates to shopping list

### Consumer Out-of-Stock Report (2 taps)

1. Search/scroll to find item
2. Tap "Report as empty" → optional note → confirm
3. Done

### Incoming Orders View (all roles)

Simple list: item name, quantity ordered, expected date, status badge (ordered / received / cancelled).

---

## 5. Auth Flow & Role Management

- Unauthenticated users → redirected to `/login`
- Google OAuth → API verifies token, checks that the `hd` (hosted domain) claim in the Google ID token matches the company's Google Workspace domain (configured as an env variable `GOOGLE_ALLOWED_DOMAIN`)
- New users created with role `consumer` by default; admin upgrades as needed
- `active = false` users → rejected with 403
- JWT: 7-day expiry, `httpOnly` + `Secure` + `SameSite=Strict` cookie
- Role embedded in JWT claims; re-verified from DB on sensitive mutations
- Frontend uses `/auth/me` on load to hydrate current user and drive route gating

### Role Matrix

| Action | Consumer | Buyer | Admin |
|---|---|---|---|
| Report shortage | ✓ | ✓ | ✓ |
| View orders | ✓ | ✓ | ✓ |
| View items/categories/locations | ✓ | ✓ | ✓ |
| Start/run stock walk | | ✓ | ✓ |
| Manage items/categories/locations | | ✓ | ✓ |
| Create/update purchase orders | | ✓ | ✓ |
| Manage users | | | ✓ |

---

## 6. AWS Deployment (Post-MVP)

*Design is finalised but implementation is deferred until after MVP.*

| Component | Service |
|---|---|
| API container | ECS Fargate (1 task, auto-scaling) |
| Database | RDS PostgreSQL (t3.micro staging / t3.small prod) |
| Frontend | S3 + CloudFront (static SPA build) |
| Container registry | ECR |
| Load balancer | ALB (HTTPS; `/api/*` → Fargate, rest → CloudFront) |
| Secrets | AWS Secrets Manager |
| DNS | Route 53 |

**CI/CD (GitHub Actions):**
- `push` to `main` → deploy to staging
- Manual trigger or tag → deploy to production
- Pipeline: tests → build Docker image → push ECR → update ECS → build frontend → upload S3 → invalidate CloudFront

Each environment (staging, prod) has its own RDS instance, ECS service, S3 bucket, and CloudFront distribution. Secrets namespaced by environment.

---

## Out of Scope (MVP)

- Real-time push notifications
- Export shopping list to PDF/email
- Per-location stock tracking (locations are informational only)
- AWS deployment (post-MVP)

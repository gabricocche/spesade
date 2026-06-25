# Spesade

Gestionale per la spesa di un'azienda: gestisce l'inventario in dispensa, le liste della spesa e gli ordini d'acquisto ai fornitori. Unisce un backend robusto in Python a un frontend React moderno, reattivo e ottimizzato per l'uso mobile.

## Struttura del progetto

```text
listadellaspesa/
├── backend/
│   ├── src/
│   │   ├── main.py              ← Entrypoint FastAPI e configurazione router
│   │   ├── core/
│   │   │   ├── config.py        ← Gestione configurazioni e .env con Pydantic
│   │   │   └── database.py      ← Inizializzazione della connessione al DB
│   │   ├── models/              ← Modelli delle tabelle del database
│   │   ├── schemas/             ← Schemi Pydantic per validazione Request/Response
│   │   ├── crud/                ← Funzioni e query di interazione con il database
│   │   └── routers/             ← Endpoint dell'API (sotto /api/v1)
│   └── .env                     ← Credenziali e URL del database (locale)
└── frontend/
    └── src/
        ├── App.tsx              ← Layout base, navigazione, Dark/Light mode, Toast provider
        ├── lib/api.ts           ← Helper tipizzati per comunicare col backend
        ├── index.css            ← Variabili CSS globali, animazioni (shake, ecc.)
        ├── components/
        │   └── Toast.tsx        ← Sistema toast custom (success / error / info)
        └── pages/
            ├── DashboardPage.tsx     ← Home con riepilogo stato dispensa e attività recente
            ├── DispensaPage.tsx      ← Catalogo e inventario (raggruppato per categorie)
            ├── ListePage.tsx         ← Gestione liste della spesa
            ├── OrdersManage.tsx      ← Storico e gestione ordini d'acquisto
            ├── ReportShortage.tsx    ← Segnalazioni mancanze in dispensa
            └── walk/
                ├── WalkActivePage.tsx   ← Controller principale del flusso lista
                ├── WalkHeader.tsx       ← Header con nome lista e stato
                ├── WalkDraftView.tsx    ← Vista ricognizione (stato: bozza)
                ├── WalkPendingView.tsx  ← Vista riepilogo e ordine (stato: in corso)
                ├── WalkStatusView.tsx   ← Vista sola lettura (stato: ordinata/completata/annullata)
                ├── WalkCountSheet.tsx   ← Bottom sheet per inserimento quantità durante ricognizione
                └── WalkPendingSheet.tsx ← Bottom sheet per modifica quantità da ordinare
```

## Requisiti

- **Backend:** Python 3.12+ con `uv` (consigliato) o `pip`
- **Frontend:** Node.js 18+ con `npm`
- **Database:** PostgreSQL

---

## Come avviare il progetto

### 1. Configura le variabili d'ambiente

Crea (o verifica) il file `.env` dentro `backend/`:

```text
DATABASE_URL="postgresql://utente:password@localhost:5432/spesade_db"
```

### 2. Installa le dipendenze Python

```bash
# Con uv (consigliato)
uv sync

# Oppure con pip
pip install fastapi uvicorn pydantic-settings psycopg2-binary sqlalchemy
```

### 3. Avvia il backend (terminale 1)

```bash
uv run uvicorn backend.src.main:app --reload
```

Il server parte su `http://127.0.0.1:8000`.  
La documentazione interattiva è su `http://127.0.0.1:8000/docs`.

### 4. Avvia il frontend (terminale 2)

```bash
cd frontend
npm install
npm run dev
```

L'interfaccia si apre su `http://localhost:5173`.

> Per esporre l'app sulla rete locale (es. accesso da mobile): `npm run dev -- --host`

---

## Flusso principale

```
BOZZA → ricognizione dispensa → Genera lista automatica
   ↓
IN CORSO → revisione quantità → Invia ordine al fornitore
   ↓
ORDINATA → in attesa della consegna
   ↓
COMPLETATA (merce ricevuta) | ANNULLATA
```

1. **Ricognizione (draft)** — Si apre una lista e si inserisce la quantità fisicamente presente in dispensa per ogni prodotto. Si può salvare il progresso e riprendere in un secondo momento.
2. **Auto-generazione (→ pending)** — Il backend calcola il delta tra *target* e *presente* e popola la lista con i soli prodotti da ordinare.
3. **Ordine (→ ordered)** — Si compilano note e data di consegna prevista, poi si invia l'ordine al fornitore.
4. **Chiusura** — L'ordine viene marcato come *Ricevuto* (→ completed) o *Annullato*.

---

## Endpoint API

Tutti gli endpoint rispondono sotto il prefisso `/api/v1`.

| Modulo | Endpoint base | Descrizione |
| :--- | :--- | :--- |
| **Prodotti** | `/api/v1/items` | CRUD prodotti; toggle attivo/disattivo |
| **Categorie** | `/api/v1/categories` | CRUD categorie |
| **Liste** | `/api/v1/lists` | Creazione, cambio stato, ricognizione e auto-generazione |
| **Segnalazioni** | `/api/v1/shortage-reports` | Segnalazione mancanze in dispensa e risoluzione rapida |
| **Ordini** | `/api/v1/purchase-orders` | Creazione e gestione ordini d'acquisto (ricezione/annullamento) |

---

## Funzionalità principali

### Dispensa (`DispensaPage`)
- Prodotti raggruppati per categoria con barra di ricerca istantanea
- CRUD completo: aggiunta, modifica inline, eliminazione, toggle attivo/disattivo
- Form a comparsa (accordion) per aggiungere categorie e prodotti

### Liste (`ListePage`)
- Creazione lista con validazione nome (feedback visivo + animazione shake se vuoto)
- Filtri per stato: Attive, Bozze, In corso, Archivio
- Elimina lista (solo bozze e annullate)

### Ricognizione (`WalkDraftView`)
- Barra di progresso conteggio
- **Swipe destro** su un prodotto per segnare che tutta la quantità è disponibile
- Bottom sheet con tastiera numerica (solo cifre, filtra caratteri non numerici)
- **Salva ed esci** con persistenza in `localStorage` — il progresso viene ripristinato alla riapertura
- Segnalazioni di mancanza visibili inline su ogni prodotto

### Ordini (`WalkPendingView` + `OrdersManage`)
- Alert visivo se la data di consegna selezionata è già passata
- Alert "In ritardo!" su ordini con data di consegna scaduta ancora in attesa
- Accordeon dettaglio articoli ordinati
- Filtraggio per stato (tutti / ordinati / ricevuti / annullati)

### Segnalazioni (`ReportShortage`)
- Segnalazione per prodotto specifico o generica
- Campo note con limite 200 caratteri e contatore live
- Tab Aperte / Risolte con ricerca full-text

### UX Globale
- **Dark/Light mode** con persistenza in `localStorage`
- **Logo cliccabile** → torna alla home
- Badge rosso pulsante sulla tab Segnalazioni quando ci sono avvisi aperti (polling 10s)
- Sistema Toast custom per feedback su ogni azione
- Blocco scroll del body quando i bottom sheet sono aperti

---

## Tecnologie

- **Backend:** FastAPI (Python 3.12+), SQLAlchemy, PostgreSQL
- **Frontend:** React 19 + Vite + TypeScript
- **Styling:** Tailwind CSS + variabili CSS custom in `index.css`
- **Iconografia:** Lucide React
- **Routing:** React Router DOM v6
- **HTTP:** `fetch` nativo incapsulato in helper tipizzati (`src/lib/api.ts`) — niente Axios, niente React Query

---

## Note tecniche

- Il proxy `/api` → `http://127.0.0.1:8000` è configurato in `vite.config.ts`
- `Promise.all` per chiamate parallele al caricamento delle pagine
- Race-condition sulle quantità protetta con `AbortController`
- Progresso ricognizione persistito in `localStorage` con chiave `draft_counts_{listId}`
- `PATCH /lists/{id}/status` si aspetta `new_status` come **query parameter**
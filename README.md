# Spesade

Gestionale intelligente per la spesa con backend in FastAPI e frontend interattivo in Streamlit.

## Struttura del progetto

```text
spesade/
├── backend/
│   ├── src/
│   │   ├── main.py          ← Entrypoint FastAPI e configurazione router
│   │   ├── core/
│   │   │   ├── config.py        ← Gestione configurazioni e .env con Pydantic
│   │   │   ├── database.py      ← Inizializzazione della connessione al DB
│   │   ├── models/          ← Modelli delle tabelle del database
│   │   ├── schemas/         ← Schemi Pydantic per validazione Request/Response
│   │   ├── crud/            ← Funzioni e query di interazione con il database
│   │   └── routers/         ← Endpoint della nostra API (sotto /api/v1)
│   └── .env                 ← Credenziali e URL del database (locale)
├── frontend/
│   └── main.py              ← Applicazione e interfaccia Streamlit
└── README.md
```

## Requisiti

Assicurati di avere Python installato sul sistema. Per installare le dipendenze:

```bash
# Se usi il package manager moderno 'uv'
uv sync

# Metodo classico con pip
pip install fastapi uvicorn streamlit pydantic-settings psycopg2-binary requests
```

---

## Come avviare il progetto

### 1. Configura le variabili d'ambiente
Crea un file `.env` dentro la cartella `backend/` e inserisci la stringa di connessione al tuo database PostgreSQL:
```text
DATABASE_URL="postgresql://utente:password@localhost:5432/spesade_db"
```

### 2. Avvia il Backend FastAPI (terminale 1)
```bash
cd backend
uvicorn src.main:app --reload
```
Il server si avvierà in modalità hot-reload su `http://127.0.0.1:8000`.  
La documentazione interattiva sarà disponibile su `http://127.0.0.1:8000/docs`.

### 3. Avvia il Frontend Streamlit (terminale 2)
```bash
cd frontend
streamlit run main.py
```
L'interfaccia si aprirà automaticamente nel browser su `http://localhost:8501`.

### 4. Esegui i test automatici
```bash
cd ..
python -m unittest discover -s tests
```

---

## Stato del progetto ed Endpoint API

Tutti gli endpoint rispondono sotto il prefisso globale interpolato `/api/v1`.

| Modulo | Endpoint Base | Stato | Descrizione |
| :--- | :--- | :--- | :--- |
| **Carrello / Algoritmo** | `/api/v1/cart` | ✅ Funzionante | Gestione del carrello e calcolo delle logiche di spesa |
| **Prodotti / Catalogo** | `/api/v1/items` | ✅ Funzionante | CRUD completo per la gestione dei prodotti |
| **Utenti** | `/api/v1/users` | ⏳ In Sviluppo | Gestione dei profili e dei permessi di accesso |
| **Location** | `/api/v1/locations` | ⏳ In Sviluppo | Configurazione dei punti vendita e delle corsie |

### Esempio risposta API (`GET /api/v1/items`)
```json
[
  {
    "id": 1,
    "name": "Pane Integrale",
    "category": "Panetteria",
    "quantity": 2,
    "updated_at": "2026-06-17 09:30:00"
  }
]
```

---

## Tecnologie utilizzate
- **Backend:** FastAPI (Python 3.12+) per performance asincrone elevate.
- **Frontend:** Streamlit per una prototipazione rapida dell'interfaccia utente (Pianificato passaggio a React).
- **Database:** PostgreSQL gestito tramite query native ultra-veloci.
- **Gestione pacchetti:** `uv` per un ambiente virtuale fulmineo e sicuro.
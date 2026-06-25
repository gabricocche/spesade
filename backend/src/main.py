from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.database import engine, Base
from .models import models # Importiamo i modelli affinché Base li "veda"
from .routers import categories, items, lists, shortages, orders

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,  # Evita 307→GET che trasforma PATCH/DELETE in GET → 405
)

# Configurazione del middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Un endpoint di base per confermare che l'API è viva
@app.get("/")
def home():
    return {
        "message": "Spesade API - work in progress",
        "status": "online",
        "docs_url": "/docs"
    }

# Agganciamo i routers con il prefisso di sicurezza letto dal file .env
app.include_router(items.router, prefix=f"{settings.API_V1_STR}/items", tags=["Items"])
app.include_router(categories.router, prefix=f"{settings.API_V1_STR}/categories", tags=["Categories"])
app.include_router(lists.router, prefix=f"{settings.API_V1_STR}/lists", tags=["Lists"])
app.include_router(shortages.router, prefix=f"{settings.API_V1_STR}/shortage-reports", tags=["Shortage Reports"])
app.include_router(orders.router, prefix=f"{settings.API_V1_STR}/purchase-orders", tags=["Purchase Orders"])
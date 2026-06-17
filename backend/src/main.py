from fastapi import FastAPI
from .core.config import settings
from .core.database import engine, Base
from .models import models # Importiamo i modelli affinché Base li "veda"
from .routers import categories, items, lists

app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    version="1.0.0"
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

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
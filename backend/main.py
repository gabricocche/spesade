from fastapi import FastAPI
from api.v1.endpoints import items, categories, lists
from database import engine, Base
import models

#creo le tabelle per il db se non esistono già
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Spesade API", version="1.0.0")

@app.get("/")
def home():
    return {"message": "Spesade API - work in progress"}

app.include_router(items.router, prefix="/api/v1/items", tags=["Items"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(lists.router, prefix="/api/v1/lists", tags=["Lists"])
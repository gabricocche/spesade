from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from backend.src.core.database import get_db
from ..crud import items as crud
from ..schemas import items as schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.ItemResponse])
def get_items(db: Session = Depends(get_db)):
    return crud.get_all_items(db)

@router.post("/", response_model=schemas.ItemResponse, status_code=201)
def create_item(item: schemas.ItemCreate, db: Session = Depends(get_db)):
    return crud.create_item(db, item)

@router.put("/{item_id}", response_model=schemas.ItemResponse)
def update_item(item_id: str, item_data: schemas.ItemCreate, db: Session = Depends(get_db)):
    return crud.update_item(db, item_id, item_data)

@router.delete("/{item_id}")
def delete_item(item_id: str, db: Session = Depends(get_db)):
    return crud.delete_item(db, item_id)

@router.patch("/{item_id}/toggle-active", response_model=schemas.ItemResponse)
def toggle_item_active(item_id: str, db: Session = Depends(get_db)):
    return crud.toggle_item_active(db, item_id)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from backend.src.core.database import get_db
from ..models import models

router = APIRouter()


class ItemCreate(BaseModel):
    name: str
    category_id: str
    target_quantity: int
    unit: str
    active: bool = True

class ItemResponse(BaseModel):
    id: str
    name: str
    category_id: str
    target_quantity: int
    unit: str
    active: bool

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ItemResponse])
def get_items(db: Session = Depends(get_db)):
    return db.query(models.Item).all()

@router.post("/", response_model=ItemResponse, status_code=201)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    
    category = db.query(models.Category).filter(models.Category.id == item.category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail="The specified category does not exist.")
    
    new_item = models.Item(
        name=item.name,
        category_id=item.category_id,
        target_quantity=item.target_quantity,
        unit=item.unit,
        active=item.active
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return new_item

@router.put("/{item_id}", response_model=ItemResponse)
def update_item(item_id: str, item_data: ItemCreate, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.name = item_data.name
    item.category_id = item_data.category_id
    item.target_quantity = item_data.target_quantity
    item.unit = item_data.unit
    item.active = item_data.active

    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_item(item_id: str, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    db.delete(item)
    db.commit()
    
    return {"message": "Item deleted!"}

@router.patch("/{item_id}/toggle-active", response_model=ItemResponse)
def toggle_item_active(item_id: str, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    item.active = not item.active
    
    db.commit()
    db.refresh(item)
    
    return item
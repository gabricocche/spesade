from sqlalchemy.orm import Session
from sqlalchemy import exists
from fastapi import HTTPException
from typing import List
from ..models import models
from ..schemas import items as schemas
from .base import commit_and_refresh

def get_all_items(db: Session) -> List[models.Item]:
    return db.query(models.Item).all()

def create_item(db: Session, item: schemas.ItemCreate) -> models.Item:
    category_exists = db.query(exists(db.query(models.Category).filter(models.Category.id == item.category_id))).scalar()
    if not category_exists:
        raise HTTPException(status_code=400, detail="The specified category does not exist.")

    new_item = models.Item(
        name=item.name,
        category_id=item.category_id,
        target_quantity=item.target_quantity,
        unit=item.unit,
        active=item.active
    )

    db.add(new_item)
    return commit_and_refresh(db, new_item)

def get_item(db: Session, item_id: str) -> models.Item:
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

def update_item(db: Session, item_id: str, item_data: schemas.ItemCreate) -> models.Item:
    item = get_item(db, item_id)

    category_exists = db.query(exists(db.query(models.Category).filter(models.Category.id == item_data.category_id))).scalar()
    if not category_exists:
        raise HTTPException(status_code=400, detail="The specified category does not exist.")

    item.name = item_data.name
    item.category_id = item_data.category_id
    item.target_quantity = item_data.target_quantity
    item.unit = item_data.unit
    item.active = item_data.active

    return commit_and_refresh(db, item)

def delete_item(db: Session, item_id: str):
    item = get_item(db, item_id)

    # Verifica se l'item è presente in una o più liste
    item_in_list = db.query(exists(db.query(models.ListItem).filter(models.ListItem.item_id == item_id))).scalar()
    if item_in_list:
        raise HTTPException(status_code=400, detail="Impossibile eliminare questo prodotto perché è presente in una o più liste della spesa.")

    db.delete(item)
    db.commit()
    return {"message": "Item deleted!"}

def toggle_item_active(db: Session, item_id: str) -> models.Item:
    item = get_item(db, item_id)
    item.active = not item.active
    return commit_and_refresh(db, item)

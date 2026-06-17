from sqlalchemy.orm import Session
from sqlalchemy import exists
from fastapi import HTTPException
from typing import List
from ..models import models
from ..schemas import lists as schemas
from .base import commit_and_refresh

VALID_STATUSES = [status.value for status in schemas.ListStatus]

def get_all_lists(db: Session) -> List[models.List]:
    return db.query(models.List).all()

def create_list(db: Session, list_data: schemas.ListCreate) -> models.List:
    new_list = models.List(name=list_data.name)
    db.add(new_list)
    return commit_and_refresh(db, new_list)

def get_list(db: Session, list_id: str) -> models.List:
    current_list = db.query(models.List).filter(models.List.id == list_id).first()
    if not current_list:
        raise HTTPException(status_code=404, detail="List not found")
    return current_list

def add_item_to_list(db: Session, list_id: str, item_data: schemas.ListItemCreate):
    current_list = get_list(db, list_id)

    if current_list.status != "draft":
        raise HTTPException(status_code=400, detail="Cannot add items to a list that isn't in draft status")

    item_exists = db.query(exists(db.query(models.Item).filter(models.Item.id == item_data.item_id).subquery())).scalar()
    if not item_exists:
        raise HTTPException(status_code=404, detail="Item not found")

    if item_data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")

    list_item = db.query(models.ListItem).filter(
        models.ListItem.list_id == list_id,
        models.ListItem.item_id == item_data.item_id
    ).first()

    if list_item:
        list_item.quantity += item_data.quantity
        return {"message": "Product quantity updated in list", "item_id": commit_and_refresh(db, list_item).item_id}

    new_list_item = models.ListItem(
        list_id=list_id,
        item_id=item_data.item_id,
        quantity=item_data.quantity
    )

    db.add(new_list_item)
    return {"message": "Product added to list", "item_id": commit_and_refresh(db, new_list_item).item_id}

def get_list_details(db: Session, list_id: str):
    current_list = get_list(db, list_id)

    items_in_list = db.query(
        models.ListItem.item_id,
        models.Item.name,
        models.Item.category_id,
        models.ListItem.quantity,
        models.ListItem.bought
    ).join(
        models.Item, models.Item.id == models.ListItem.item_id
    ).filter(
        models.ListItem.list_id == list_id
    ).all()

    result = []
    for row in items_in_list:
        result.append({
            "item_id": row.item_id,
            "product_name": row.name,
            "quantity": row.quantity,
            "bought": row.bought
        })

    return {
        "list_name": current_list.name,
        "status": current_list.status,
        "products": result
    }

def toggle_item_bought(db: Session, list_id: str, item_id: str):
    current_list = get_list(db, list_id)

    if current_list.status != "draft":
        raise HTTPException(status_code=400, detail="Cannot modify items in a list that isn't in draft status")

    list_item = db.query(models.ListItem).filter(
        models.ListItem.list_id == list_id,
        models.ListItem.item_id == item_id
    ).first()

    if not list_item:
        raise HTTPException(status_code=404, detail="Product not found in this list")

    list_item.bought = not list_item.bought

    return {"message": "Product status changed", "bought": commit_and_refresh(db, list_item).bought}

def update_list_status(db: Session, list_id: str, new_status: str):
    current_list = get_list(db, list_id)

    if new_status.lower() not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {VALID_STATUSES}")

    current_list.status = new_status.lower()
    return {"message": "List status updated", "new_status": commit_and_refresh(db, current_list).status}

def auto_generate_list_items(db: Session, list_id: str, request_data: schemas.AutoGenerateRequest):
    current_list = get_list(db, list_id)

    if current_list.status != "draft":
        raise HTTPException(status_code=400, detail="Cannot auto-generate items for a non-draft list")

    inventory_dict = {check.item_id: check.current_quantity for check in request_data.inventory}

    all_items = db.query(models.Item).filter(models.Item.active).all()

    added_count = 0
    updated_count = 0

    for item in all_items:
        current_qty = inventory_dict.get(item.id, 0)
        needed_quantity = item.target_quantity - current_qty

        if needed_quantity <= 0:
            continue

        list_item = db.query(models.ListItem).filter(
            models.ListItem.list_id == list_id,
            models.ListItem.item_id == item.id
        ).first()

        if list_item:
            if list_item.quantity < needed_quantity:
                list_item.quantity = needed_quantity
                updated_count += 1
        else:
            list_item = models.ListItem(
                list_id=list_id,
                item_id=item.id,
                quantity=needed_quantity
            )
            db.add(list_item)
            added_count += 1

    db.commit()

    return {
        "message": f"Auto-generation complete! Added {added_count} products and updated {updated_count} existing products.",
        "list_id": list_id
    }

def clear_list_items(db: Session, list_id: str):
    current_list = get_list(db, list_id)

    if current_list.status != "draft":
        raise HTTPException(status_code=400, detail="Cannot clear a list that isn't in the draft status")

    deleted_rows = db.query(models.ListItem).filter(models.ListItem.list_id == list_id).delete()

    db.commit()

    return {
        "message": "List cleared successfully!",
        "items_removed": deleted_rows
    }

def delete_list(db: Session, list_id: str):
    current_list = get_list(db, list_id)

    deleted_items = db.query(models.ListItem).filter(models.ListItem.list_id == list_id).delete()

    db.delete(current_list)
    db.commit()

    return {
        "message": "List deleted successfully!",
        "items_removed": deleted_items
    }

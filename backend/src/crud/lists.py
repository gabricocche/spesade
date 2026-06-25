from sqlalchemy.orm import Session
from sqlalchemy import exists, func
from fastapi import HTTPException
from datetime import datetime, timezone
from typing import List
from ..models import models
from ..schemas import lists as schemas
from .base import commit_and_refresh

VALID_STATUSES = [status.value for status in schemas.ListStatus]

# transizioni di stato permesse
ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    "draft":     ["pending", "cancelled"],
    "pending":   ["ordered", "cancelled", "draft"],
    "ordered":   ["completed", "cancelled"],
    "completed": [],
    "cancelled": [],
}


def get_all_lists(db: Session) -> list[dict]:
    # Subquery per contare gli articoli di ogni lista
    item_counts = db.query(
        models.ListItem.list_id,
        func.count(models.ListItem.id).label("item_count")
    ).group_by(models.ListItem.list_id).subquery()

    results = db.query(
        models.List,
        func.coalesce(item_counts.c.item_count, 0).label("item_count")
    ).outerjoin(
        item_counts, item_counts.c.list_id == models.List.id
    ).order_by(models.List.created_at.desc()).all()

    return [
        {
            "id": row.List.id,
            "name": row.List.name,
            "status": row.List.status,
            "created_at": row.List.created_at or datetime.now(timezone.utc),  # fallback se NULL nel DB
            "item_count": row.item_count
        }
        for row in results
    ]


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

    # Subquery per evitare duplicati da shortages multiple sullo stesso item
    active_shortage = db.query(
        models.ShortageReport.item_id,
        func.min(models.ShortageReport.notes).label("shortage_notes")
    ).filter(
        models.ShortageReport.resolved_at.is_(None)
    ).group_by(
        models.ShortageReport.item_id
    ).subquery()

    items_in_list = db.query(
        models.ListItem.item_id,
        models.Item.name,
        models.Item.category_id,
        models.ListItem.quantity,
        models.ListItem.bought,
        active_shortage.c.shortage_notes
    ).join(
        models.Item, models.Item.id == models.ListItem.item_id
    ).outerjoin(
        active_shortage, active_shortage.c.item_id == models.ListItem.item_id
    ).filter(
        models.ListItem.list_id == list_id
    ).all()

    result = []
    for row in items_in_list:
        result.append({
            "item_id": row.item_id,
            "product_name": row.name,
            "quantity": row.quantity,
            "bought": row.bought,
            "shortage_notes": row.shortage_notes
        })

    return {
        "list_name": current_list.name,
        "status": current_list.status,
        "products": result
    }


def toggle_item_bought(db: Session, list_id: str, item_id: str):
    current_list = get_list(db, list_id)

    if current_list.status not in ["draft", "pending"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot modify items in a list that isn't in draft or pending status"
        )

    list_item = db.query(models.ListItem).filter(
        models.ListItem.list_id == list_id,
        models.ListItem.item_id == item_id
    ).first()

    if not list_item:
        raise HTTPException(status_code=404, detail="Product not found in this list")

    list_item.bought = not list_item.bought

    return {"message": "Product status changed", "bought": commit_and_refresh(db, list_item).bought}


def update_item_quantity(db: Session, list_id: str, item_id: str, quantity: int):
    current_list = get_list(db, list_id)

    if current_list.status not in ["draft", "pending"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot modify items in a list that isn't in draft or pending status"
        )

    list_item = db.query(models.ListItem).filter(
        models.ListItem.list_id == list_id,
        models.ListItem.item_id == item_id
    ).first()

    if not list_item:
        raise HTTPException(status_code=404, detail="Product not found in this list")

    if quantity <= 0:
        db.delete(list_item)
        db.commit()
        return {"message": "Product removed from list", "quantity": 0}

    list_item.quantity = quantity
    return {"message": "Product quantity updated", "quantity": commit_and_refresh(db, list_item).quantity}


def update_list_status(db: Session, list_id: str, new_status: str):
    current_list = get_list(db, list_id)

    new_status = new_status.lower()

    if new_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {VALID_STATUSES}")

    # stesso stato, niente da fare
    if new_status == current_list.status:
        return {"message": "Status unchanged", "new_status": current_list.status}

    # verifica se la transizione è permessa
    allowed = ALLOWED_TRANSITIONS.get(current_list.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{current_list.status}' to '{new_status}'. Allowed transitions: {allowed}"
        )

    current_list.status = new_status
    return {"message": "List status updated", "new_status": commit_and_refresh(db, current_list).status}


def auto_generate_list_items(db: Session, list_id: str, request_data: schemas.AutoGenerateRequest):
    current_list = get_list(db, list_id)

    if current_list.status != "draft":
        raise HTTPException(status_code=400, detail="Cannot auto-generate items for a non-draft list")

    inventory_dict = {check.item_id: check.current_quantity for check in request_data.inventory}

    all_items = db.query(models.Item).filter(models.Item.active.is_(True)).all()

    # carichiamo i prodotti già presenti nella lista in un dict (evita N+1)
    existing_list_items: dict[str, models.ListItem] = {
        li.item_id: li
        for li in db.query(models.ListItem).filter(models.ListItem.list_id == list_id).all()
    }

    added_count = 0
    updated_count = 0

    for item in all_items:
        current_qty = inventory_dict.get(item.id, 0)
        needed_quantity = item.target_quantity - current_qty

        # Aggiorna anche la current_quantity dell'item nel DB
        item.current_quantity = current_qty

        if needed_quantity <= 0:
            continue

        list_item = existing_list_items.get(item.id)

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

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "message": f"Auto-generation complete! Added {added_count} products and updated {updated_count} existing products.",
        "list_id": list_id
    }


def clear_list_items(db: Session, list_id: str):
    current_list = get_list(db, list_id)

    if current_list.status not in ["draft", "pending"]:
        raise HTTPException(status_code=400, detail="Cannot clear a list that isn't in draft or pending status")

    deleted_rows = db.query(models.ListItem).filter(models.ListItem.list_id == list_id).delete()
    current_list.status = "draft"

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "message": "List cleared successfully!",
        "items_removed": deleted_rows
    }


def delete_list(db: Session, list_id: str):
    current_list = get_list(db, list_id)

    # solo le liste in bozza o cancellate possono essere eliminate
    if current_list.status not in ["draft", "cancelled"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete a list with status '{current_list.status}'. Only draft or cancelled lists can be deleted."
        )

    # Verifica se ci sono ordini associati
    has_orders = db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.list_id == list_id
    ).first()
    if has_orders:
        # Scollega gli ordini dalla lista invece di bloccare il delete
        db.query(models.PurchaseOrder).filter(
            models.PurchaseOrder.list_id == list_id
        ).update({"list_id": None})

    deleted_items = db.query(models.ListItem).filter(models.ListItem.list_id == list_id).delete()
    db.delete(current_list)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "message": "List deleted successfully!",
        "items_removed": deleted_items
    }

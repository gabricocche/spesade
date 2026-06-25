from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from ..models import models
from ..schemas import orders as schemas
from .base import commit_and_refresh

# Transizioni di stato permesse per gli ordini
ORDER_TRANSITIONS: dict[str, list[str]] = {
    "ordered":   ["received", "cancelled"],
    "received":  [],  # Stato terminale
    "cancelled": [],  # Stato terminale
}

def get_all_orders(db: Session, status: str = None, list_id: str = None):
    query = db.query(models.PurchaseOrder).options(
        joinedload(models.PurchaseOrder.list)
    )
    if status:
        query = query.filter(models.PurchaseOrder.status == status.lower())
    if list_id:
        query = query.filter(models.PurchaseOrder.list_id == list_id)
    return query.order_by(models.PurchaseOrder.created_at.desc()).all()

def get_order_details(db: Session, order_id: str):
    order = db.query(models.PurchaseOrder).options(
        joinedload(models.PurchaseOrder.list)
    ).filter(models.PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Ordine non trovato")

    # Recupera tutti gli articoli legati all'ordine
    order_items = db.query(
        models.PurchaseOrderItem.id,
        models.PurchaseOrderItem.item_id,
        models.Item.name.label("product_name"),
        models.PurchaseOrderItem.quantity_ordered
    ).join(
        models.Item, models.Item.id == models.PurchaseOrderItem.item_id
    ).filter(
        models.PurchaseOrderItem.order_id == order_id
    ).all()

    items_list = []
    for row in order_items:
        items_list.append({
            "id": row.id,
            "item_id": row.item_id,
            "product_name": row.product_name,
            "quantity_ordered": row.quantity_ordered
        })

    return {
        "id": order.id,
        "list_id": order.list_id,
        "list_name": order.list.name if order.list else None,  # era mancante → nome sempre null
        "status": order.status,
        "expected_by": order.expected_by,
        "notes": order.notes,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "items": items_list
    }

def create_purchase_order(db: Session, order_data: schemas.PurchaseOrderCreate) -> models.PurchaseOrder:
    # Se l'ordine è generato da una lista, verifica che sia in stato "pending"
    if order_data.list_id:
        shopping_list = db.query(models.List).filter(models.List.id == order_data.list_id).first()
        if not shopping_list:
            raise HTTPException(status_code=404, detail="Lista di origine non trovata")
        if shopping_list.status != "pending":
            raise HTTPException(
                status_code=400,
                detail=f"La lista deve essere in stato 'pending' per generare un ordine, "
                       f"ma è in stato '{shopping_list.status}'."
            )

    # Crea la testata dell'ordine
    new_order = models.PurchaseOrder(
        list_id=order_data.list_id,
        expected_by=order_data.expected_by,
        notes=order_data.notes,
        status="ordered"
    )
    db.add(new_order)
    db.flush()  # Ottiene l'ID dell'ordine senza committare ancora

    # Aggiunge gli articoli legati all'ordine
    for item_data in order_data.items:
        item_exists = db.query(models.Item).filter(models.Item.id == item_data.item_id).first()
        if not item_exists:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Articolo con ID {item_data.item_id} non trovato a catalogo")

        order_item = models.PurchaseOrderItem(
            order_id=new_order.id,
            item_id=item_data.item_id,
            quantity_ordered=item_data.quantity_ordered
        )
        db.add(order_item)

    # Aggiorna lo stato della lista a 'ordered'
    if order_data.list_id and shopping_list:
        shopping_list.status = "ordered"

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return db.query(models.PurchaseOrder).options(joinedload(models.PurchaseOrder.list)).filter(models.PurchaseOrder.id == new_order.id).first()

def update_order_status(db: Session, order_id: str, new_status: str):
    order = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Ordine non trovato")

    status_clean = new_status.lower()
    if status_clean not in ["ordered", "received", "cancelled"]:
        raise HTTPException(status_code=400, detail="Stato ordine non valido. Scegli tra: ordered, received, cancelled")

    # Verifica transizioni di stato permesse
    if status_clean == order.status:
        return order  # Nessun cambiamento, ritorna l'ordine com'è

    allowed = ORDER_TRANSITIONS.get(order.status, [])
    if status_clean not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Transizione da '{order.status}' a '{status_clean}' non permessa. "
                   f"Transizioni valide: {allowed}"
        )

    order.status = status_clean

    # Quando l'ordine è ricevuto, aggiorna le scorte in inventario
    if status_clean == "received":
        order_items = db.query(models.PurchaseOrderItem).filter(
            models.PurchaseOrderItem.order_id == order_id
        ).all()
        for oi in order_items:
            item = db.query(models.Item).filter(models.Item.id == oi.item_id).first()
            if item:
                item.current_quantity = min(
                    item.target_quantity,
                    item.current_quantity + oi.quantity_ordered
                )

    # Aggiorna automaticamente la lista associata
    if order.list_id:
        shopping_list = db.query(models.List).filter(models.List.id == order.list_id).first()
        if shopping_list and shopping_list.status == "ordered":
            if status_clean == "received":
                shopping_list.status = "completed"
            elif status_clean == "cancelled":
                shopping_list.status = "cancelled"

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return db.query(models.PurchaseOrder).options(joinedload(models.PurchaseOrder.list)).filter(models.PurchaseOrder.id == order.id).first()

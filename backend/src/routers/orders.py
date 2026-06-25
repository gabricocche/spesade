from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..core.database import get_db
from ..crud import orders as crud
from ..schemas import orders as schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.PurchaseOrderResponse])
def get_orders(
    status: Optional[schemas.OrderStatus] = Query(None, description="Filtra gli ordini per stato: ordered, received, cancelled"),
    list_id: Optional[str] = Query(None, description="Filtra gli ordini per lista di origine"),
    db: Session = Depends(get_db)
):
    return crud.get_all_orders(db, status.value if status else None, list_id=list_id)

@router.get("/{order_id}", response_model=schemas.PurchaseOrderDetail)
def get_order_detail(order_id: str, db: Session = Depends(get_db)):
    return crud.get_order_details(db, order_id)

@router.post("/", response_model=schemas.PurchaseOrderResponse, status_code=201)
def create_order(order: schemas.PurchaseOrderCreate, db: Session = Depends(get_db)):
    return crud.create_purchase_order(db, order)

@router.patch("/{order_id}/status", response_model=schemas.PurchaseOrderResponse)
def update_status(
    order_id: str, 
    new_status: schemas.OrderStatus = Query(..., description="Stato: ordered, received, cancelled"), 
    db: Session = Depends(get_db)
):
    return crud.update_order_status(db, order_id, new_status.value)

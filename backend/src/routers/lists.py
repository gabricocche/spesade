from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..crud import lists as crud
from ..schemas import lists as schemas

router = APIRouter()

@router.post("/", status_code=201, response_model=schemas.ListResponse)
def create_new_list(list_data: schemas.ListCreate, db: Session = Depends(get_db)):
    return crud.create_list(db, list_data)

@router.get("/", response_model=list[schemas.ListResponse])
def get_all_lists(db: Session = Depends(get_db)):
    return crud.get_all_lists(db)

@router.post("/{list_id}/items", status_code=201, response_model=schemas.AddItemResponse)
def add_item_to_list(list_id: str, item_data: schemas.ListItemCreate, db: Session = Depends(get_db)):
    return crud.add_item_to_list(db, list_id, item_data)

@router.get("/{list_id}/items", response_model=schemas.ListDetails)
def get_list_details(list_id: str, db: Session = Depends(get_db)):
    return crud.get_list_details(db, list_id)

@router.patch("/{list_id}/items/{item_id}/toggle-bought", response_model=schemas.ToggleBoughtResponse)
def toggle_item_bought(list_id: str, item_id: str, db: Session = Depends(get_db)):
    return crud.toggle_item_bought(db, list_id, item_id)

@router.patch("/{list_id}/items/{item_id}/quantity", response_model=schemas.UpdateQuantityResponse)
def update_item_quantity(list_id: str, item_id: str, update_data: schemas.QuantityUpdate, db: Session = Depends(get_db)):
    return crud.update_item_quantity(db, list_id, item_id, update_data.quantity)

@router.patch("/{list_id}/status", response_model=schemas.UpdateStatusResponse)
def update_list_status(
    list_id: str,
    new_status: schemas.ListStatus = Query(...),
    db: Session = Depends(get_db)
):
    return crud.update_list_status(db, list_id, new_status.value)

@router.post("/{list_id}/auto-generate", response_model=schemas.AutoGenerateResponse)
def auto_generate_list_items(list_id: str, request_data: schemas.AutoGenerateRequest, db: Session = Depends(get_db)):
    return crud.auto_generate_list_items(db, list_id, request_data)

@router.delete("/{list_id}/clear", response_model=schemas.ClearListResponse)
def clear_list_items(list_id: str, db: Session = Depends(get_db)):
    return crud.clear_list_items(db, list_id)

@router.delete("/{list_id}", response_model=schemas.DeleteListResponse)
def delete_list(list_id: str, db: Session = Depends(get_db)):
    return crud.delete_list(db, list_id)
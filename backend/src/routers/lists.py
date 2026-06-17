from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.src.core.database import get_db
from ..crud import lists as crud
from ..schemas import lists as schemas

router = APIRouter()

@router.post("/", status_code=201)
def create_new_list(list_data: schemas.ListCreate, db: Session = Depends(get_db)):
    return crud.create_list(db, list_data)

@router.get("/")
def get_all_lists(db: Session = Depends(get_db)):
    return crud.get_all_lists(db)

@router.post("/{list_id}/items", status_code=201)
def add_item_to_list(list_id: str, item_data: schemas.ListItemCreate, db: Session = Depends(get_db)):
    return crud.add_item_to_list(db, list_id, item_data)

@router.get("/{list_id}/items")
def get_list_details(list_id: str, db: Session = Depends(get_db)):
    return crud.get_list_details(db, list_id)

@router.patch("/{list_id}/items/{item_id}/toggle-bought")
def toggle_item_bought(list_id: str, item_id: str, db: Session = Depends(get_db)):
    return crud.toggle_item_bought(db, list_id, item_id)

@router.patch("/{list_id}/status")
def update_list_status(list_id: str, new_status: str, db: Session = Depends(get_db)):
    return crud.update_list_status(db, list_id, new_status)

@router.post("/{list_id}/auto-generate")
def auto_generate_list_items(list_id: str, request_data: schemas.AutoGenerateRequest, db: Session = Depends(get_db)):
    return crud.auto_generate_list_items(db, list_id, request_data)

@router.delete("/{list_id}/clear")
def clear_list_items(list_id: str, db: Session = Depends(get_db)):
    return crud.clear_list_items(db, list_id)

@router.delete("/{list_id}")
def delete_list(list_id: str, db: Session = Depends(get_db)):
    return crud.delete_list(db, list_id)
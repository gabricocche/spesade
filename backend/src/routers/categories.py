from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from backend.src.core.database import get_db
from ..crud import categories as crud
from ..schemas import categories as schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return crud.get_all_categories(db)

@router.post("/", response_model=schemas.CategoryResponse, status_code=201)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    return crud.create_category(db, category)

@router.put("/{category_id}", response_model=schemas.CategoryResponse)
def update_category(category_id: str, category_data: schemas.CategoryCreate, db: Session = Depends(get_db)):
    return crud.update_category(db, category_id, category_data)

@router.delete("/{category_id}")
def delete_category(category_id: str, db: Session = Depends(get_db)):
    return crud.delete_category(db, category_id)
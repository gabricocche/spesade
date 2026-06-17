from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from database import get_db
import models

router = APIRouter()

# data in ingresso
class CategoryCreate(BaseModel):
    name: str

# data in uscita 
class CategoryResponse(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True

# endpoints

@router.get("/", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """Fetch all categories from the database."""
    return db.query(models.Category).all()

@router.post("/", response_model=CategoryResponse, status_code=201)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    new_category = models.Category(name=category.name)
    db.add(new_category)

    db.commit()
    db.refresh(new_category)
    return new_category

@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(category_id: str, category_data: CategoryCreate, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    category.name = category_data.name
    
    db.commit()
    db.refresh(category)
    return category

@router.delete("/{category_id}")
def delete_category(category_id: str, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    linked_items = db.query(models.Item).filter(models.Item.category_id == category_id).first()
    
    if linked_items:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete this category because it contains items."
        )
        
    db.delete(category)
    db.commit()
    
    return {"message": "Category deleted successfully!"}
    
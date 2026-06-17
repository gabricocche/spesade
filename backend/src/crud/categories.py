from sqlalchemy.orm import Session
from sqlalchemy import exists
from fastapi import HTTPException
from ..models import models
from ..schemas import categories as schemas
from typing import List
from .base import commit_and_refresh, exists_by_id

def get_all_categories(db: Session) -> List[models.Category]:
    return db.query(models.Category).all()

def get_category(db: Session, category_id: str) -> models.Category:
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

def create_category(db: Session, category_data: schemas.CategoryCreate) -> models.Category:
    new_category = models.Category(name=category_data.name)
    db.add(new_category)
    return commit_and_refresh(db, new_category)

def update_category(db: Session, category_id: str, category_data: schemas.CategoryCreate) -> models.Category:
    category = get_category(db, category_id)
    category.name = category_data.name
    return commit_and_refresh(db, category)

def delete_category(db: Session, category_id: str):
    category = get_category(db, category_id)

    has_items = db.query(exists(db.query(models.Item).filter(models.Item.category_id == category_id).subquery())).scalar()
    if has_items:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete this category because it contains items."
        )

    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully!"}
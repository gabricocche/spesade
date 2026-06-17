from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..models import models
from ..schemas import categories as schemas
from typing import List

def get_all_categories(db: Session) -> List[models.Category]:
    return db.query(models.Category).all()

def get_category(db: Session, category_id: str) -> models.Category:
    return db.query(models.Category).filter(models.Category.id == category_id).first()

def create_category(db: Session, category_data: schemas.CategoryCreate) -> models.Category:
    new_category = models.Category(name=category_data.name)
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category

def update_category(db: Session, category_id: str, category_data: schemas.CategoryCreate) -> models.Category:
    category = get_category(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    category.name = category_data.name
    db.commit()
    db.refresh(category)
    return category

def delete_category(db: Session, category_id: str):
    category = get_category(db, category_id)
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
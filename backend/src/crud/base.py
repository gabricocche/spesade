from sqlalchemy.orm import Session
from sqlalchemy import exists
from typing import Optional, Type, TypeVar
from ..models import models

Model = TypeVar("Model")

def get_by_id(db: Session, model: Type[Model], id: str) -> Optional[Model]:
    return db.query(model).filter(model.id == id).first()

def exists_by_id(db: Session, model: Type[Model], id: str) -> bool:
    return db.query(exists(db.query(model).filter(model.id == id))).scalar()

def commit_and_refresh(db: Session, obj):
    try:
        db.commit()
        db.refresh(obj)
        return obj
    except Exception:
        db.rollback()
        raise

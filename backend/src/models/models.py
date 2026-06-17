import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend.src.core.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Item(Base):
    __tablename__ = "items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True, nullable=False)
    
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    
    target_quantity = Column(Integer, nullable=False)
    unit = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class List(Base):
    __tablename__ = "lists"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    status = Column(String, default="draft")  # di default va in bozza
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# lo "scontrino"
class ListItem(Base):
    __tablename__ = "list_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    list_id = Column(String, ForeignKey("lists.id"), nullable=False)
    item_id = Column(String, ForeignKey("items.id"), nullable=False)
    
    quantity = Column(Integer, nullable=False)
    bought = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
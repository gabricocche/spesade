import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.src.core.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Item(Base):
    __tablename__ = "items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), index=True, nullable=False)
    
    category_id = Column(String, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    target_quantity = Column(Integer, nullable=False)
    current_quantity = Column(Integer, nullable=False, default=0, server_default="0")
    unit = Column(String(50), nullable=False)
    active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class List(Base):
    __tablename__ = "lists"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    status = Column(String(20), default="draft")  # di default va in bozza
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# lo "scontrino"
class ListItem(Base):
    __tablename__ = "list_items"
    # un prodotto può apparire una sola volta per lista
    __table_args__ = (UniqueConstraint("list_id", "item_id", name="uq_list_item"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    list_id = Column(String, ForeignKey("lists.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(String, ForeignKey("items.id", ondelete="RESTRICT"), nullable=False, index=True)

    quantity = Column(Integer, nullable=False)
    bought = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ShortageReport(Base):
    __tablename__ = "shortage_reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    item_id = Column(String, ForeignKey("items.id", ondelete="CASCADE"), nullable=True, index=True)
    notes = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    list_id = Column(String, ForeignKey("lists.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), default="ordered") # ordered / received / cancelled
    expected_by = Column(DateTime(timezone=True), nullable=True)
    notes = Column(String(2000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    list = relationship("List", lazy="raise")
    items = relationship("PurchaseOrderItem", back_populates="order", lazy="raise")

    @property
    def list_name(self):
        return self.list.name if self.list else None

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(String, ForeignKey("items.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity_ordered = Column(Integer, nullable=False)

    order = relationship("PurchaseOrder", back_populates="items")
    item = relationship("Item")
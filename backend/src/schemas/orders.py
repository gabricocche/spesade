from enum import Enum
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List


class OrderStatus(str, Enum):
    ordered = "ordered"
    received = "received"
    cancelled = "cancelled"


class PurchaseOrderItemCreate(BaseModel):
    item_id: str = Field(..., min_length=1)
    quantity_ordered: int = Field(..., gt=0)

class PurchaseOrderCreate(BaseModel):
    list_id: Optional[str] = None
    expected_by: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=2000)
    items: List[PurchaseOrderItemCreate] = Field(..., min_length=1)

class PurchaseOrderItemResponse(BaseModel):
    id: str
    item_id: str
    product_name: Optional[str] = None
    quantity_ordered: int

    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderResponse(BaseModel):
    id: str
    list_id: Optional[str]
    list_name: Optional[str] = None
    status: str
    expected_by: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Schema di dettaglio che contiene la lista degli articoli associati
class PurchaseOrderDetail(PurchaseOrderResponse):
    items: List[PurchaseOrderItemResponse]

from enum import Enum
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, PositiveInt
from typing import List, Optional

class ListStatus(str, Enum):
    draft = "draft"
    pending = "pending"
    ordered = "ordered"
    completed = "completed"
    cancelled = "cancelled"

class ListCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)

class ListResponse(BaseModel):
    id: str
    name: str
    status: ListStatus
    created_at: Optional[datetime] = None
    item_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class ListItemCreate(BaseModel):
    item_id: str = Field(..., min_length=1)
    quantity: PositiveInt

class QuantityUpdate(BaseModel):
    quantity: int = Field(..., ge=0)

class InventoryCheck(BaseModel):
    item_id: str = Field(..., min_length=1)
    current_quantity: int = Field(..., ge=0)

class AutoGenerateRequest(BaseModel):
    inventory: list[InventoryCheck]

class ItemInList(BaseModel):
    item_id: str
    product_name: str
    quantity: int
    bought: bool
    shortage_notes: str | None = None

    model_config = ConfigDict(from_attributes=True)

class ListDetails(BaseModel):
    list_name: str
    status: ListStatus
    products: List[ItemInList]

    model_config = ConfigDict(from_attributes=True)

# --- Response Schemas per gli endpoint senza response_model ---

class AddItemResponse(BaseModel):
    message: str
    item_id: str

class ToggleBoughtResponse(BaseModel):
    message: str
    bought: bool

class UpdateStatusResponse(BaseModel):
    message: str
    new_status: str

class AutoGenerateResponse(BaseModel):
    message: str
    list_id: str

class ClearListResponse(BaseModel):
    message: str
    items_removed: int

class DeleteListResponse(BaseModel):
    message: str
    items_removed: int

class UpdateQuantityResponse(BaseModel):
    message: str
    quantity: int

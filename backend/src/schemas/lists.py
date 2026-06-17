from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, PositiveInt
from typing import List

class ListStatus(str, Enum):
    draft = "draft"
    pending = "pending"
    completed = "completed"
    cancelled = "cancelled"

class ListCreate(BaseModel):
    name: str = Field(..., min_length=1)

class ListResponse(BaseModel):
    id: str
    name: str
    status: ListStatus

    model_config = ConfigDict(from_attributes=True)

class ListItemCreate(BaseModel):
    item_id: str = Field(..., min_length=1)
    quantity: PositiveInt

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

    model_config = ConfigDict(from_attributes=True)

class ListDetails(BaseModel):
    list_name: str
    status: str
    products: List[ItemInList]

    model_config = ConfigDict(from_attributes=True)

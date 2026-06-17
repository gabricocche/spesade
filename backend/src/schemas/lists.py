from pydantic import BaseModel, ConfigDict
from typing import List

class ListCreate(BaseModel):
    name: str

class ListResponse(BaseModel):
    id: str
    name: str
    status: str

    model_config = ConfigDict(from_attributes=True)

class ListItemCreate(BaseModel):
    item_id: str
    quantity: int

class InventoryCheck(BaseModel):
    item_id: str
    current_quantity: int

class AutoGenerateRequest(BaseModel):
    inventory: list[InventoryCheck]

class ItemInList(BaseModel):
    product_name: str
    quantity: int
    bought: bool

class ListDetails(BaseModel):
    list_name: str
    status: str
    products: List[ItemInList]

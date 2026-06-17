from pydantic import BaseModel, ConfigDict

class ItemCreate(BaseModel):
    name: str
    category_id: str
    target_quantity: int
    unit: str
    active: bool = True

class ItemResponse(BaseModel):
    id: str
    name: str
    category_id: str
    target_quantity: int
    unit: str
    active: bool

    model_config = ConfigDict(from_attributes=True)

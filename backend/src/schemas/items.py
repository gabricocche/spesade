from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, PositiveInt

class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1)
    category_id: str = Field(..., min_length=1)
    target_quantity: PositiveInt
    unit: str = Field(..., min_length=1)
    active: bool = True

class ItemResponse(BaseModel):
    id: str
    name: str
    category_id: str
    target_quantity: int
    unit: str
    active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

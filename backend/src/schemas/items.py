from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, PositiveInt
from typing import Optional

class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category_id: str = Field(..., min_length=1)
    target_quantity: PositiveInt
    unit: str = Field(..., min_length=1, max_length=50)
    active: bool = True

class ItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category_id: Optional[str] = Field(None, min_length=1)
    target_quantity: Optional[PositiveInt] = None
    unit: Optional[str] = Field(None, min_length=1, max_length=50)
    active: Optional[bool] = None

class ItemResponse(BaseModel):
    id: str
    name: str
    category_id: str
    target_quantity: int
    current_quantity: int
    unit: str
    active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class ItemDeleteResponse(BaseModel):
    message: str

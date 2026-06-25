from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional

class ShortageReportCreate(BaseModel):
    item_id: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=1000)

class ShortageReportResponse(BaseModel):
    id: str
    item_id: Optional[str] = None
    product_name: Optional[str] = None # Campo calcolato a runtime per comodità del frontend
    notes: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

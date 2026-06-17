from pydantic import BaseModel, ConfigDict, Field

# schema per la creazione di una categoria (input)
class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1)

# schema per la risposta (output)
class CategoryResponse(BaseModel):
    id: str
    name: str

    model_config = ConfigDict(from_attributes=True)
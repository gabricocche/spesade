from pydantic import BaseModel, ConfigDict

# schema per la creazione di una categoria (input)
class CategoryCreate(BaseModel):
    name: str

# schema per la risposta (output)
class CategoryResponse(BaseModel):
    id: str
    name: str

    model_config = ConfigDict(from_attributes=True)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models

router = APIRouter()

class ListCreate(BaseModel):
    name: str

@router.post("/", status_code=201)
def create_new_list(list_data: ListCreate, db: Session = Depends(get_db)):
    
    new_list = models.List(name=list_data.name)
    
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    
    return new_list

@router.get("/")
def get_all_lists(db: Session = Depends(get_db)):
    
    all_lists = db.query(models.List).all()
    
    return all_lists

class ListItemCreate(BaseModel):
    item_id: str
    quantity: int

@router.post("/{list_id}/items", status_code=201)
def add_item_to_list(list_id: str, item_data: ListItemCreate, db: Session = Depends(get_db)):
    
    # controllo se la lista esiste
    current_list = db.query(models.List).filter(models.List.id == list_id).first()
    if not current_list:
        raise HTTPException(status_code=404, detail="List not found")
        
    # controllo se il prodotto esiste
    item = db.query(models.Item).filter(models.Item.id == item_data.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # se entrambe le condizioni vengono verificate creo lo scontrino
    new_list_item = models.ListItem(
        list_id=list_id,
        item_id=item_data.item_id,
        quantity=item_data.quantity
    )
    
    db.add(new_list_item)
    db.commit()
    db.refresh(new_list_item)
    
    return {"message": "Product added to list", "item_id": new_list_item.item_id}

@router.get("/{list_id}/items")
def get_list_details(list_id: str, db: Session = Depends(get_db)):
    
    # controllo se la lista esiste
    current_list = db.query(models.List).filter(models.List.id == list_id).first()
    if not current_list:
        raise HTTPException(status_code=404, detail="List not found")
        
    # unisco prodotti e quantità
    items_in_list = db.query(
        models.Item.name,
        models.Item.category_id,
        models.ListItem.quantity,
        models.ListItem.bought
    ).join(
        models.ListItem, models.Item.id == models.ListItem.item_id
    ).filter(
        models.ListItem.list_id == list_id
    ).all()
    
    # trasformo il risultato in una lista
    result = []
    for row in items_in_list:
        result.append({
            "product_name": row.name,
            "quantity": row.quantity,
            "bought": row.bought
        })
        
    return {
        "list_name": current_list.name,
        "status": current_list.status,
        "products": result
    }

# segno il prodotto come comprato
@router.patch("/{list_id}/items/{item_id}/toggle-bought")
def toggle_item_bought(list_id: str, item_id: str, db: Session = Depends(get_db)):
    
    # cerco il prodotto specifico dentro quella specifica lista
    list_item = db.query(models.ListItem).filter(
        models.ListItem.list_id == list_id,
        models.ListItem.item_id == item_id
    ).first()
    
    if not list_item:
        raise HTTPException(status_code=404, detail="Product not found in this list")
        
    # inverto la spunta del prodotto
    list_item.bought = not list_item.bought
    
    db.commit()
    db.refresh(list_item)
    
    return {"message": "Product status changed", "bought": list_item.bought}

# cambio di stato
@router.patch("/{list_id}/status")
def update_list_status(list_id: str, new_status: str, db: Session = Depends(get_db)):
    
    # cerco lista
    current_list = db.query(models.List).filter(models.List.id == list_id).first()
    if not current_list:
        raise HTTPException(status_code=404, detail="List not found")
        
    # solo 4 stati validi, contorllo che lo stato sia uno di questi
    valid_statuses = ["draft", "pending", "completed", "cancelled"]
    if new_status.lower() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {valid_statuses}")
        
    # aggiorno lo stato
    current_list.status = new_status.lower()
    db.commit()
    db.refresh(current_list)
    
    return {"message": "List status updated", "new_status": current_list.status}

class InventoryCheck(BaseModel):
    item_id: str
    current_quantity: int

class AutoGenerateRequest(BaseModel):
    inventory: list[InventoryCheck] # Una lista di controlli


@router.post("/{list_id}/auto-generate")
def auto_generate_list_items(list_id: str, request_data: AutoGenerateRequest, db: Session = Depends(get_db)):
    
    # check se la lista esiste ed è in draft
    current_list = db.query(models.List).filter(models.List.id == list_id).first()
    if not current_list:
        raise HTTPException(status_code=404, detail="List not found")
    if current_list.status != "draft":
        raise HTTPException(status_code=400, detail="Cannot auto-generate items for a non-draft list")

    # mettiamo in un dizionario i vari dati di inventario
    inventory_dict = {check.item_id: check.current_quantity for check in request_data.inventory}

    # prendiamo i vari prodotti (SOLO QUELLI ATTIVI) dal nostro catalogo
    all_items = db.query(models.Item).filter(models.Item.active == True).all()
    
    added_count = 0

    # per ogni prodotto calcoliamo la quantità "mancante"
    for item in all_items:
        # se l'utente ha passato un dato di inventario per questo prodotto lo usiamo
        current_qty = inventory_dict.get(item.id, 0)
        
        # facciamo il calcolo della quantità mancante
        needed_quantity = item.target_quantity - current_qty
        
        # se vediamo che mancano dei prodotti, compiliamo la nostra lista della spesa
        if needed_quantity > 0:
            # creiamo un nuovo record nella tabella ListItem per questo prodotto e questa lista
            new_list_item = models.ListItem(
                list_id=list_id,
                item_id=item.id,
                quantity=needed_quantity
            )
            db.add(new_list_item)
            added_count += 1

    # salvo tutto nel db
    db.commit()
    
    return {
        "message": f"Auto-generation complete! Added {added_count} products to the list.",
        "list_id": list_id
    }

# svuota lista
@router.delete("/{list_id}/clear")
def clear_list_items(list_id: str, db: Session = Depends(get_db)):
    
    # check se esiste
    current_list = db.query(models.List).filter(models.List.id == list_id).first()
    if not current_list:
        raise HTTPException(status_code=404, detail="List not found")
        
    # check se in draft
    if current_list.status != "draft":
        raise HTTPException(status_code=400, detail="Cannot clear a list that isn't in the draft status")
        
    # cancelliamo
    deleted_rows = db.query(models.ListItem).filter(models.ListItem.list_id == list_id).delete()
    
    # salviamo
    db.commit()
    
    return {
        "message": "List cleared successfully!",
        "items_removed": deleted_rows
    }
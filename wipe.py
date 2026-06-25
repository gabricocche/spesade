import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "backend", "src"))

from core.database import SessionLocal
from models import models

def wipe_db():
    db = SessionLocal()
    try:
        db.query(models.PurchaseOrderItem).delete()
        db.query(models.PurchaseOrder).delete()
        db.query(models.ShortageReport).delete()
        db.query(models.ListItem).delete()
        db.query(models.List).delete()
        db.commit()
        print("Svuotamento completato: Liste, Ordini e Segnalazioni eliminati con successo.")
    except Exception as e:
        db.rollback()
        print(f"Errore durante lo svuotamento: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    wipe_db()

"""
Script di migrazione del database per applicare le modifiche strutturali.
Eseguire una sola volta: uv run python -m backend.migrate
"""
import sys
from sqlalchemy import text, inspect
from backend.src.core.database import engine

def run_migration():
    with engine.connect() as conn:
        inspector = inspect(engine)
        
        # --- 1. Aggiungere current_quantity a items (se non esiste) ---
        columns = [c["name"] for c in inspector.get_columns("items")]
        if "current_quantity" not in columns:
            conn.execute(text(
                "ALTER TABLE items ADD COLUMN current_quantity INTEGER NOT NULL DEFAULT 0"
            ))
            print("✅ Aggiunta colonna 'current_quantity' alla tabella 'items'")
        else:
            print("⏭️  Colonna 'current_quantity' già presente")

        # --- 2. Aggiungere indici sulle FK (se non esistono) ---
        existing_indexes = {idx["name"] for idx in inspector.get_indexes("list_items")}
        
        if "ix_list_items_list_id" not in existing_indexes:
            conn.execute(text("CREATE INDEX ix_list_items_list_id ON list_items (list_id)"))
            print("✅ Creato indice su list_items.list_id")
        
        if "ix_list_items_item_id" not in existing_indexes:
            conn.execute(text("CREATE INDEX ix_list_items_item_id ON list_items (item_id)"))
            print("✅ Creato indice su list_items.item_id")

        existing_indexes = {idx["name"] for idx in inspector.get_indexes("purchase_order_items")}
        
        if "ix_poi_order_id" not in existing_indexes:
            conn.execute(text("CREATE INDEX ix_poi_order_id ON purchase_order_items (order_id)"))
            print("✅ Creato indice su purchase_order_items.order_id")
        
        if "ix_poi_item_id" not in existing_indexes:
            conn.execute(text("CREATE INDEX ix_poi_item_id ON purchase_order_items (item_id)"))
            print("✅ Creato indice su purchase_order_items.item_id")

        existing_indexes = {idx["name"] for idx in inspector.get_indexes("shortage_reports")}
        
        if "ix_shortage_reports_item_id" not in existing_indexes:
            conn.execute(text("CREATE INDEX ix_shortage_reports_item_id ON shortage_reports (item_id)"))
            print("✅ Creato indice su shortage_reports.item_id")

        # --- 3. Aggiornare le FK con ON DELETE policies ---
        # PostgreSQL richiede di droppare e ricreare le FK per aggiungere ON DELETE
        
        fk_updates = [
            # (tabella, nome_fk_corrente, colonna, ref_tabella, ref_colonna, on_delete)
            ("items", "items_category_id_fkey", "category_id", "categories", "id", "RESTRICT"),
            ("list_items", "list_items_list_id_fkey", "list_id", "lists", "id", "CASCADE"),
            ("list_items", "list_items_item_id_fkey", "item_id", "items", "id", "RESTRICT"),
            ("shortage_reports", "shortage_reports_item_id_fkey", "item_id", "items", "id", "CASCADE"),
            ("purchase_orders", "purchase_orders_list_id_fkey", "list_id", "lists", "id", "SET NULL"),
            ("purchase_order_items", "purchase_order_items_order_id_fkey", "order_id", "purchase_orders", "id", "CASCADE"),
            ("purchase_order_items", "purchase_order_items_item_id_fkey", "item_id", "items", "id", "RESTRICT"),
        ]
        
        for table, fk_name, column, ref_table, ref_col, on_delete in fk_updates:
            # Verifica se la FK esiste
            existing_fks = inspector.get_foreign_keys(table)
            found_fk = None
            for fk in existing_fks:
                if column in fk.get("constrained_columns", []):
                    found_fk = fk.get("name", fk_name)
                    break
            
            if found_fk:
                try:
                    conn.execute(text(f"ALTER TABLE {table} DROP CONSTRAINT {found_fk}"))
                    conn.execute(text(
                        f"ALTER TABLE {table} ADD CONSTRAINT {fk_name} "
                        f"FOREIGN KEY ({column}) REFERENCES {ref_table}({ref_col}) ON DELETE {on_delete}"
                    ))
                    print(f"✅ FK {table}.{column} → ON DELETE {on_delete}")
                except Exception as e:
                    print(f"⚠️  Errore aggiornamento FK {table}.{column}: {e}")
            else:
                try:
                    conn.execute(text(
                        f"ALTER TABLE {table} ADD CONSTRAINT {fk_name} "
                        f"FOREIGN KEY ({column}) REFERENCES {ref_table}({ref_col}) ON DELETE {on_delete}"
                    ))
                    print(f"✅ FK {table}.{column} creata con ON DELETE {on_delete}")
                except Exception as e:
                    print(f"⚠️  Errore creazione FK {table}.{column}: {e}")

        conn.commit()
        print("\n🎉 Migrazione completata con successo!")

if __name__ == "__main__":
    run_migration()

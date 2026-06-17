import os
import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from backend.src.core.database import Base
from backend.src.schemas.categories import CategoryCreate
from backend.src.schemas.items import ItemCreate
from backend.src.schemas.lists import AutoGenerateRequest, InventoryCheck, ListCreate, ListItemCreate
from backend.src.crud import categories, items, lists


class CrudTestCase(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", future=True)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, future=True)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_create_and_list_category(self):
        category = categories.create_category(self.db, CategoryCreate(name="Verdura"))
        self.assertEqual(category.name, "Verdura")
        all_categories = categories.get_all_categories(self.db)
        self.assertEqual(len(all_categories), 1)

    def test_duplicate_category_raises(self):
        categories.create_category(self.db, CategoryCreate(name="Frutta"))
        with self.assertRaises(HTTPException) as ctx:
            categories.create_category(self.db, CategoryCreate(name="Frutta"))
        self.assertEqual(ctx.exception.status_code, 400)

    def test_create_item_and_add_to_list(self):
        category = categories.create_category(self.db, CategoryCreate(name="Cereali"))
        item = items.create_item(self.db, ItemCreate(name="Pane", category_id=category.id, target_quantity=3, unit="pz"))
        self.assertEqual(item.name, "Pane")

        lista = lists.create_list(self.db, ListCreate(name="Spesa settimanale"))
        result = lists.add_item_to_list(self.db, lista.id, ListItemCreate(item_id=item.id, quantity=2))
        self.assertIn("item_id", result)

        details = lists.get_list_details(self.db, lista.id)
        self.assertEqual(details["list_name"], lista.name)
        self.assertEqual(len(details["products"]), 1)
        self.assertEqual(details["products"][0]["quantity"], 2)

    def test_auto_generate_eq(self):
        category = categories.create_category(self.db, CategoryCreate(name="Latticini"))
        item = items.create_item(self.db, ItemCreate(name="Latte", category_id=category.id, target_quantity=5, unit="l"))
        lista = lists.create_list(self.db, ListCreate(name="Spesa automatica"))

        result = lists.auto_generate_list_items(
            self.db,
            lista.id,
            AutoGenerateRequest(inventory=[InventoryCheck(item_id=item.id, current_quantity=2)])
        )
        self.assertIn("message", result)
        details = lists.get_list_details(self.db, lista.id)
        self.assertEqual(len(details["products"]), 1)
        self.assertEqual(details["products"][0]["quantity"], 3)

    def test_toggle_item_bought(self):
        category = categories.create_category(self.db, CategoryCreate(name="Bevande"))
        item = items.create_item(self.db, ItemCreate(name="Acqua", category_id=category.id, target_quantity=2, unit="l"))
        lista = lists.create_list(self.db, ListCreate(name="Spesa toggle"))
        lists.add_item_to_list(self.db, lista.id, ListItemCreate(item_id=item.id, quantity=2))

        result = lists.toggle_item_bought(self.db, lista.id, item.id)
        self.assertTrue(result["bought"])
        result = lists.toggle_item_bought(self.db, lista.id, item.id)
        self.assertFalse(result["bought"])


if __name__ == "__main__":
    unittest.main()

import os
from pydantic_settings import BaseSettings, SettingsConfigDict

# Troviamo la cartella in cui si trova QUESTO file (config.py)
current_dir = os.path.dirname(os.path.abspath(__file__))
# Risaliamo di 3 livelli e cerchiamo lì il .env
env_path = os.path.join(current_dir, "..", "..", ".env")

class Settings(BaseSettings):
    DATABASE_URL: str
    
    APP_NAME: str = "Spesade API"
    API_V1_STR: str = "/api/v1"

    model_config = SettingsConfigDict(
        env_file=env_path, 
        env_file_encoding="utf-8", 
        case_sensitive=True
    )

settings = Settings()
import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class Settings(BaseSettings):
    BOT_TOKEN: str = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://bot_user:bot_password@db:5432/task_bot_db")
    WEBAPP_URL: str = os.getenv("WEBAPP_URL", "https://your-ngrok-url.ngrok-free.app")

settings = Settings()

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from .models import Base
from config import settings

engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=False,
    connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0}
)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

from sqlalchemy import text

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Auto-migrate new columns (ignore errors if they already exist, useful for SQLite/PG compatibility)
        try:
            await conn.execute(text("ALTER TABLE tasks ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE"))
        except Exception:
            pass
            
        try:
            await conn.execute(text("ALTER TABLE tasks ADD COLUMN tags VARCHAR"))
        except Exception:
            pass

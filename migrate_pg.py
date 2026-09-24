import asyncio
import asyncpg
import os
from dotenv import load_dotenv
load_dotenv('.env')
db_url = os.getenv('DATABASE_URL').replace('+asyncpg', '')
async def run():
    print('Connecting to', db_url)
    conn = await asyncpg.connect(db_url)
    try:
        await conn.execute('ALTER TABLE tasks ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;')
        print('Added is_pinned')
    except Exception as e:
        print('is_pinned error:', e)
    try:
        await conn.execute('ALTER TABLE tasks ADD COLUMN tags VARCHAR;')
        print('Added tags')
    except Exception as e:
        print('tags error:', e)
    await conn.close()
asyncio.run(run())

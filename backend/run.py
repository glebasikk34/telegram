import asyncio
import os
import uvicorn
from aiogram import Bot, Dispatcher
from bot.handlers import router
from config import settings
from db.database import init_db
from services.scheduler import start_scheduler
from api.main import app

async def start_bot():
    if settings.BOT_TOKEN == "YOUR_BOT_TOKEN_HERE":
        print("Warning: BOT_TOKEN is not set. Bot will not start.")
        return
    bot = Bot(token=settings.BOT_TOKEN)
    dp = Dispatcher()
    dp.include_router(router)
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

async def main():
    await init_db()
    start_scheduler()
    
    asyncio.create_task(start_bot())

    port = int(os.getenv("PORT", 8000))
    config = uvicorn.Config(app, host="0.0.0.0", port=port)
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.future import select
from db.database import AsyncSessionLocal
from db.models import Task
from aiogram import Bot
from config import settings
import html

scheduler = AsyncIOScheduler()
bot = Bot(token=settings.BOT_TOKEN)

async def check_reminders():
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Task).where(Task.remind_at <= now, Task.is_completed == False, Task.is_notified == False)
        )
        tasks = result.scalars().all()

        for task in tasks:
            try:
                from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
                markup = InlineKeyboardMarkup(inline_keyboard=[
                    [
                        InlineKeyboardButton(text="✅ Сделано", callback_data=f"done_{task.id}"),
                        InlineKeyboardButton(text="💤 +15 мин", callback_data=f"snooze_15_{task.id}")
                    ],
                    [
                        InlineKeyboardButton(text="💤 +1 час", callback_data=f"snooze_60_{task.id}"),
                        InlineKeyboardButton(text="📅 Завтра", callback_data=f"snooze_1440_{task.id}")
                    ]
                ])
                await bot.send_message(
                    chat_id=task.user_id,
                    text=f"🔔 <b>Напоминание!</b>\n\n<b>{html.escape(task.title)}</b>\n{html.escape(task.description or '')}",
                    parse_mode="HTML",
                    reply_markup=markup
                )
                task.is_notified = True
                session.add(task)
            except Exception as e:
                print(f"Failed to send to {task.user_id}: {e}")

        if tasks:
            await session.commit()

def start_scheduler():
    scheduler.add_job(check_reminders, 'interval', seconds=10)
    scheduler.start()

from aiogram import Router, types
from aiogram.filters import CommandStart
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from config import settings
from db.database import AsyncSessionLocal
from db.models import User
from sqlalchemy.future import select

router = Router()

@router.message(CommandStart())
async def cmd_start(message: types.Message):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.telegram_id == message.from_user.id))
        user = result.scalar_one_or_none()
        if not user:
            new_user = User(telegram_id=message.from_user.id, username=message.from_user.username)
            session.add(new_user)
            await session.commit()

    markup = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✨ Открыть приложение", web_app=WebAppInfo(url=settings.WEBAPP_URL))]
    ])
    
    text = (
        "👋 <b>Добро пожаловать!</b>\n\n"
        "Я — ваш личный минималистичный планировщик задач.\n\n"
        "✨ <b>Что я умею:</b>\n"
        "• Хранить ваши дела в эстетичном интерфейсе\n"
        "• Отправлять точные пуш-напоминания прямо сюда\n"
        "• Фокусировать вас на главном, без лишнего шума\n\n"
        "👇 Нажмите кнопку ниже, чтобы создать первую задачу!"
    )
    await message.answer(text, reply_markup=markup, parse_mode="HTML")

import dateparser
from datetime import datetime, timezone, timedelta
from aiogram import F
from db.models import Task
import html
import re

def extract_tags(text: str):
    tags = re.findall(r'#(\w+)', text)
    return ",".join(tags) if tags else None

@router.message(F.text)
async def handle_text(message: types.Message):
    text = message.text
    # Try parsing date from Russian text (e.g., "завтра в 15:00", "через 2 часа")
    parsed_date = dateparser.parse(text, settings={'TIMEZONE': 'UTC', 'RETURN_AS_TIMEZONE_AWARE': False, 'PREFER_DATES_FROM': 'future'}, languages=['ru'])
    
    # Simple logic: if text has date keywords or dateparser finds a future date, it's a Task. Else it's a Note.
    # But dateparser might parse random numbers. So let's check if there are actual time keywords.
    has_time_keywords = any(word in text.lower() for word in ['завтра', 'сегодня', 'через', 'в ', 'утро', 'вечер', 'минут', 'час', 'дн'])
    
    remind_at = None
    if has_time_keywords and parsed_date and parsed_date > datetime.now():
        remind_at = parsed_date

    title = text[:50] + ("..." if len(text) > 50 else "")
    description = text
    tags = extract_tags(text)

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.telegram_id == message.from_user.id))
        user = result.scalar_one_or_none()
        if not user:
             user = User(telegram_id=message.from_user.id, username=message.from_user.username)
             session.add(user)
             await session.commit()
             await session.refresh(user)
        
        new_task = Task(
            user_id=user.telegram_id, # user_id in Task model is BigInteger mapping to telegram_id based on previous endpoints
            title=title,
            description=description,
            remind_at=remind_at,
            tags=tags
        )
        session.add(new_task)
        await session.commit()
        await session.refresh(new_task)

    # Respond with inline keyboard
    if remind_at:
        btn = InlineKeyboardButton(text="✅ Сделано", callback_data=f"done_{new_task.id}")
        markup = InlineKeyboardMarkup(inline_keyboard=[[btn]])
        await message.reply(f"📌 <b>Задача создана!</b>\n⏰ Напоминание: {remind_at.strftime('%Y-%m-%d %H:%M UTC')}", reply_markup=markup, parse_mode="HTML")
    else:
        btn = InlineKeyboardButton(text="✨ Открыть", web_app=WebAppInfo(url=settings.WEBAPP_URL))
        markup = InlineKeyboardMarkup(inline_keyboard=[[btn]])
        await message.reply(f"📝 <b>Заметка сохранена!</b>", reply_markup=markup, parse_mode="HTML")

@router.callback_query(F.data.startswith("done_"))
async def process_done(callback: types.CallbackQuery):
    task_id = int(callback.data.split("_")[1])
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Task).where(Task.id == task_id))
        task = result.scalar_one_or_none()
        if task:
            task.is_completed = True
            await session.commit()
            await callback.message.edit_text(callback.message.text + "\n\n✅ <i>Выполнено!</i>", parse_mode="HTML")
        await callback.answer("Отмечено как выполненное!")

@router.callback_query(F.data.startswith("snooze_"))
async def process_snooze(callback: types.CallbackQuery):
    _, minutes, task_id = callback.data.split("_")
    task_id = int(task_id)
    minutes = int(minutes)
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Task).where(Task.id == task_id))
        task = result.scalar_one_or_none()
        if task:
            task.remind_at = datetime.now() + timedelta(minutes=minutes)
            task.is_notified = False
            task.is_completed = False
            await session.commit()
            await callback.message.edit_text(callback.message.text + f"\n\n💤 <i>Отложено на {minutes} мин.</i>", parse_mode="HTML")
        await callback.answer(f"Отложено на {minutes} минут!")

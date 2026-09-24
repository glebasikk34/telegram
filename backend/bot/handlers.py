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

import aiohttp
from bs4 import BeautifulSoup
import dateparser
from datetime import datetime, timezone, timedelta
from aiogram import F
from db.models import Task
import html
import re

def extract_tags(text: str):
    tags = re.findall(r'#(\w+)', text)
    return ",".join(tags) if tags else None

async def fetch_url_title(url: str):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=5) as response:
                if response.status == 200:
                    text = await response.text()
                    soup = BeautifulSoup(text, 'html.parser')
                    title = soup.title.string if soup.title else None
                    if title:
                        return title.strip()
    except Exception:
        pass
    return None

@router.message(F.text)
async def handle_text(message: types.Message):
    text = message.text
    tags_list = []
    
    # Forwarded messages -> bookmark
    if message.forward_origin or message.forward_from or getattr(message, 'forward_from_chat', None):
        tags_list.append("закладка")
        
    # Check for URLs
    url_match = re.search(r'(https?://[^\s]+)', text)
    title = text[:50] + ("..." if len(text) > 50 else "")
    if url_match:
        fetched_title = await fetch_url_title(url_match.group(1))
        if fetched_title:
            title = fetched_title[:50] + "..." if len(fetched_title) > 50 else fetched_title
        tags_list.append("почитать_позже")

    parsed_date = dateparser.parse(text, settings={'TIMEZONE': 'UTC', 'RETURN_AS_TIMEZONE_AWARE': False, 'PREFER_DATES_FROM': 'future'}, languages=['ru'])
    
    has_time_keywords = any(word in text.lower() for word in ['завтра', 'сегодня', 'через', 'в ', 'утро', 'вечер', 'минут', 'час', 'дн'])
    
    remind_at = None
    if has_time_keywords and parsed_date and parsed_date > datetime.now():
        remind_at = parsed_date

    description = text
    extracted_tags = extract_tags(text)
    if extracted_tags:
        tags_list.extend(extracted_tags.split(","))
    
    # Deduplicate tags
    tags = ",".join(list(set(tags_list))) if tags_list else None

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.telegram_id == message.from_user.id))
        user = result.scalar_one_or_none()
        if not user:
             user = User(telegram_id=message.from_user.id, username=message.from_user.username)
             session.add(user)
             await session.commit()
             await session.refresh(user)
        
        new_task = Task(
            user_id=user.telegram_id,
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
        markup = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="✅ Сделано", callback_data=f"done_{new_task.id}")],
            [
                InlineKeyboardButton(text="⏰ +1 час", callback_data=f"snooze_60_{new_task.id}"),
                InlineKeyboardButton(text="🗑 Удалить", callback_data=f"del_{new_task.id}")
            ]
        ])
        await message.reply(f"📌 <b>Задача создана:</b> {html.escape(title)}\n⏰ Напоминание: {remind_at.strftime('%Y-%m-%d %H:%M UTC')}", reply_markup=markup, parse_mode="HTML")
    else:
        btn = InlineKeyboardButton(text="✨ Открыть", web_app=WebAppInfo(url=settings.WEBAPP_URL))
        markup = InlineKeyboardMarkup(inline_keyboard=[[btn]])
        await message.reply(f"📝 <b>Заметка сохранена!</b>\n<i>{html.escape(title)}</i>", reply_markup=markup, parse_mode="HTML")

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

@router.callback_query(F.data.startswith("del_"))
async def process_delete(callback: types.CallbackQuery):
    task_id = int(callback.data.split("_")[1])
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Task).where(Task.id == task_id))
        task = result.scalar_one_or_none()
        if task:
            await session.delete(task)
            await session.commit()
            await callback.message.edit_text(callback.message.text + "\n\n🗑 <i>Удалено</i>", parse_mode="HTML")
        await callback.answer("Удалено!")

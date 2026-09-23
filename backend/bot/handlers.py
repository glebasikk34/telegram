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

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
        [InlineKeyboardButton(text="Open Tasks", web_app=WebAppInfo(url=settings.WEBAPP_URL))]
    ])
    await message.answer("Welcome to your Task Manager! 📝\nClick below to open the Mini App.", reply_markup=markup)

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, BigInteger
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, index=True)
    username = Column(String, nullable=True)

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    remind_at = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    is_notified = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    tags = Column(String, nullable=True)

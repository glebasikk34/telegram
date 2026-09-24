import hmac
import hashlib
import json
import time
from urllib.parse import parse_qs
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import AsyncSessionLocal
from db.models import Task
from config import settings

app = FastAPI(title="Task Bot API")

ALLOWED_ORIGINS = [
    "https://heroic-boba-c1e326.netlify.app",
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


def validate_init_data(init_data: str) -> dict:
    """Validate Telegram WebApp initData using HMAC-SHA256."""
    if not init_data:
        raise HTTPException(status_code=401, detail="Missing initData")
    
    parsed = dict(parse_qs(init_data, keep_blank_values=True))
    parsed_flat = {k: v[0] if len(v) == 1 else v for k, v in parsed.items()}
    
    received_hash = parsed_flat.pop("hash", None)
    if not received_hash:
        raise HTTPException(status_code=401, detail="Missing hash in initData")
    
    data_check_arr = sorted([f"{k}={v}" for k, v in parsed_flat.items()])
    data_check_string = "\n".join(data_check_arr)
    
    secret_key = hmac.new(b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
    if not hmac.compare_digest(calculated_hash, received_hash):
        raise HTTPException(status_code=401, detail="Invalid initData signature")
    
    auth_date = int(parsed_flat.get("auth_date", 0))
    if time.time() - auth_date > 86400:
        raise HTTPException(status_code=401, detail="initData expired")
    
    user_data = json.loads(parsed_flat.get("user", "{}"))
    if not user_data.get("id"):
        raise HTTPException(status_code=401, detail="No user in initData")
    
    return user_data


async def get_current_user(request: Request) -> int:
    """Extract and validate the current user from Telegram initData."""
    init_data = request.headers.get("X-Telegram-Init-Data", "")
    
    # In development, allow bypassing auth
    if not init_data and settings.BOT_TOKEN == "YOUR_BOT_TOKEN_HERE":
        return 1
    
    user_data = validate_init_data(init_data)
    return user_data["id"]


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)
    remind_at: Optional[datetime] = None
    is_pinned: Optional[bool] = False
    tags: Optional[str] = None


class TaskResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str]
    remind_at: Optional[datetime]
    is_completed: bool
    is_notified: bool
    is_pinned: bool
    tags: Optional[str]
    class Config:
        from_attributes = True


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


@app.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Task).where(Task.user_id == user_id).order_by(Task.remind_at.asc())
    )
    return result.scalars().all()


@app.get("/tasks/{path_user_id}", response_model=List[TaskResponse])
async def get_tasks_by_id(path_user_id: int, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if path_user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    result = await db.execute(
        select(Task).where(Task.user_id == user_id).order_by(Task.remind_at.asc())
    )
    return result.scalars().all()


@app.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    task_data = task.model_dump()
    task_data["user_id"] = user_id
    
    if task_data.get('remind_at') and task_data['remind_at'].tzinfo:
        task_data['remind_at'] = task_data['remind_at'].astimezone(timezone.utc).replace(tzinfo=None)
    
    new_task = Task(**task_data)
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    return new_task


@app.put("/tasks/{task_id}/complete")
async def complete_task(task_id: int, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    task.is_completed = not task.is_completed
    await db.commit()
    return {"status": "success", "is_completed": task.is_completed}


@app.put("/tasks/{task_id}/pin")
async def toggle_pin_task(task_id: int, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    task.is_pinned = not task.is_pinned
    await db.commit()
    return {"status": "success", "is_pinned": task.is_pinned}


@app.delete("/tasks/{task_id}")
async def delete_task(task_id: int, user_id: int = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(task)
    await db.commit()
    return {"status": "deleted"}

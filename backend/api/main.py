from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import AsyncSessionLocal
from db.models import Task

app = FastAPI(title="Task Bot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TaskCreate(BaseModel):
    user_id: int
    title: str
    description: Optional[str] = None
    remind_at: Optional[datetime] = None

class TaskResponse(TaskCreate):
    id: int
    is_completed: bool
    is_notified: bool
    class Config:
        from_attributes = True

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@app.get("/tasks/{user_id}", response_model=List[TaskResponse])
async def get_tasks(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.user_id == user_id).order_by(Task.remind_at.asc()))
    return result.scalars().all()

@app.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, db: AsyncSession = Depends(get_db)):
    new_task = Task(**task.model_dump())
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    return new_task

@app.put("/tasks/{task_id}/complete")
async def complete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.is_completed = True
    await db.commit()
    return {"status": "success"}

# app/reminders/schemas.py
from datetime import datetime, date
from pydantic import BaseModel, Field
from typing import Optional
from app.reminders.models import ReminderStatus


class ReminderCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: Optional[str] = None
    scheduled_at: datetime
    repeat_rule: Optional[str] = None


class ReminderPublic(BaseModel):
    id: int
    senior_id: int
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    repeat_rule: Optional[str] = None
    status: ReminderStatus
    done_at: Optional[datetime] = None
    actor_user_id: Optional[int] = None

    class Config:
        from_attributes = True


class ReminderUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    repeat_rule: Optional[str] = None
    status: Optional[ReminderStatus] = None

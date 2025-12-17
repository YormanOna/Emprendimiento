# app/reminders/service.py
from datetime import datetime, date, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.reminders.models import Reminder, ReminderStatus


async def create_reminder(db: AsyncSession, senior_id: int, data: dict) -> Reminder:
    r = Reminder(senior_id=senior_id, **data)
    db.add(r)
    await db.flush()
    return r


async def list_reminders_by_date(db: AsyncSession, senior_id: int, day: date) -> list[Reminder]:
    start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    q = (
        select(Reminder)
        .where(Reminder.senior_id == senior_id)
        .where(Reminder.scheduled_at >= start, Reminder.scheduled_at < end)
        .order_by(Reminder.scheduled_at.asc())
    )
    res = await db.execute(q)
    return list(res.scalars().all())


async def mark_done(db: AsyncSession, reminder_id: int, actor_user_id: int) -> Reminder:
    res = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    r = res.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Reminder not found")

    r.status = ReminderStatus.DONE
    r.done_at = datetime.now(timezone.utc)
    r.actor_user_id = actor_user_id
    await db.flush()
    return r

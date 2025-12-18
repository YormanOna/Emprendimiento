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
    
    # Si el recordatorio está asociado a un medicamento, crear un IntakeLog
    if r.medication_id:
        from app.meds.models import IntakeLog, IntakeStatus
        
        now = datetime.now(timezone.utc)
        scheduled = r.scheduled_at
        
        # Asegurar que scheduled tenga timezone para la comparación
        if scheduled.tzinfo is None:
            scheduled = scheduled.replace(tzinfo=timezone.utc)
        
        # Determinar el estado según cuándo se tomó
        if now > scheduled + timedelta(hours=1):
            status = IntakeStatus.LATE
        else:
            status = IntakeStatus.TAKEN
        
        intake = IntakeLog(
            senior_id=r.senior_id,
            medication_id=r.medication_id,
            scheduled_at=scheduled,
            taken_at=now,
            status=status,
            actor_user_id=actor_user_id
        )
        db.add(intake)
    
    await db.flush()
    return r

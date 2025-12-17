# app/reminders/router.py
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
# from app.core.deps import get_current_user, require_senior_access, require_senior_edit
from app.reminders.schemas import ReminderCreate, ReminderPublic, ReminderUpdate
from app.reminders.service import create_reminder, list_reminders_by_date, mark_done
from app.reminders.models import Reminder, ReminderStatus

router = APIRouter()


@router.post("/seniors/{senior_id}/reminders", response_model=ReminderPublic)
async def create_reminder_endpoint(
    senior_id: int,
    payload: ReminderCreate,
    db: AsyncSession = Depends(get_db),
):
    r = await create_reminder(db, senior_id, payload.model_dump())
    await db.commit()
    await db.refresh(r)
    return r


@router.get("/seniors/{senior_id}/reminders", response_model=list[ReminderPublic])
async def get_reminders_endpoint(
    senior_id: int,
    date_: Optional[date] = Query(None, alias="date"),
    status: Optional[ReminderStatus] = None,
    db: AsyncSession = Depends(get_db),
):
    """Obtener recordatorios de un senior. Si no se pasa fecha, devuelve todos."""
    from sqlalchemy import select
    
    query = select(Reminder).where(Reminder.senior_id == senior_id)
    
    if date_:
        query = query.where(
            Reminder.scheduled_at >= datetime.combine(date_, datetime.min.time()),
            Reminder.scheduled_at <= datetime.combine(date_, datetime.max.time())
        )
    
    if status:
        query = query.where(Reminder.status == status)
    
    query = query.order_by(Reminder.scheduled_at)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/{reminder_id}/done", response_model=ReminderPublic)
async def done_endpoint(
    reminder_id: int,
    db: AsyncSession = Depends(get_db),
):
    r = await mark_done(db, reminder_id, 1)  # Usuario por defecto
    await db.commit()
    await db.refresh(r)
    return r


@router.patch("/{reminder_id}/status", response_model=ReminderPublic)
async def update_reminder_status_endpoint(
    reminder_id: int,
    status: ReminderStatus,
    db: AsyncSession = Depends(get_db),
):
    """Actualizar el estado de un recordatorio"""
    from sqlalchemy import select
    
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    reminder.status = status
    if status == ReminderStatus.DONE and not reminder.done_at:
        reminder.done_at = datetime.now()
    
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.patch("/{reminder_id}", response_model=ReminderPublic)
async def update_reminder_endpoint(
    reminder_id: int,
    payload: ReminderUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Actualizar un recordatorio"""
    from sqlalchemy import select
    
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(reminder, key, value)
    
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.delete("/{reminder_id}")
async def delete_reminder_endpoint(
    reminder_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Eliminar un recordatorio"""
    from sqlalchemy import select
    
    result = await db.execute(select(Reminder).where(Reminder.id == reminder_id))
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    await db.delete(reminder)
    await db.commit()
    return {"message": "Reminder deleted successfully"}

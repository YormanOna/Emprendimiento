# app/reminders/router.py
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
# from app.core.deps import get_current_user, require_senior_access, require_senior_edit
from app.reminders.schemas import ReminderCreate, ReminderPublic
from app.reminders.service import create_reminder, list_reminders_by_date, mark_done
from app.reminders.models import Reminder

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
    date_: date,
    db: AsyncSession = Depends(get_db),
):
    return await list_reminders_by_date(db, senior_id, date_)


@router.post("/{reminder_id}/done", response_model=ReminderPublic)
async def done_endpoint(
    reminder_id: int,
    db: AsyncSession = Depends(get_db),
):
    r = await mark_done(db, reminder_id, 1)  # Usuario por defecto
    await db.commit()
    await db.refresh(r)
    return r

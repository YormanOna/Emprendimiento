# app/meds/service.py
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.meds.models import Medication, MedicationSchedule, IntakeLog


async def create_medication(db: AsyncSession, senior_id: int, data: dict) -> Medication:
    med = Medication(senior_id=senior_id, **data)
    db.add(med)
    await db.flush()
    return med


async def add_schedule(db: AsyncSession, medication_id: int, data: dict) -> MedicationSchedule:
    res = await db.execute(select(Medication).where(Medication.id == medication_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Medication not found")

    sched = MedicationSchedule(medication_id=medication_id, **data)
    db.add(sched)
    await db.flush()
    return sched


async def log_intake(db: AsyncSession, data: dict) -> IntakeLog:
    log = IntakeLog(**data)
    db.add(log)
    await db.flush()
    return log


async def list_intakes(db: AsyncSession, senior_id: int, dt_from: datetime | None, dt_to: datetime | None) -> list[IntakeLog]:
    q = select(IntakeLog).where(IntakeLog.senior_id == senior_id)
    if dt_from:
        q = q.where(IntakeLog.scheduled_at >= dt_from)
    if dt_to:
        q = q.where(IntakeLog.scheduled_at <= dt_to)
    q = q.order_by(IntakeLog.scheduled_at.asc())

    res = await db.execute(q)
    return list(res.scalars().all())


async def list_medications(db: AsyncSession, senior_id: int) -> list[Medication]:
    q = select(Medication).where(Medication.senior_id == senior_id).order_by(Medication.name.asc())
    res = await db.execute(q)
    return list(res.scalars().all())

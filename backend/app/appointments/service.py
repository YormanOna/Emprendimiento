# app/appointments/service.py
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.appointments.models import Appointment, AppointmentNote


async def create_appointment(db: AsyncSession, senior_id: int, data: dict) -> Appointment:
    appt = Appointment(senior_id=senior_id, **data)  # Aquí pasas correctamente `starts_at` desde el payload
    db.add(appt)
    await db.flush()
    return appt


async def list_appointments(db: AsyncSession, senior_id: int) -> list[Appointment]:
    res = await db.execute(
        select(Appointment).where(Appointment.senior_id == senior_id).order_by(Appointment.starts_at.asc())  # Cambié de `datetime` a `starts_at`
    )
    return list(res.scalars().all())


async def add_note(db: AsyncSession, appointment_id: int, author_user_id: int, note: str) -> AppointmentNote:
    res = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = res.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    n = AppointmentNote(appointment_id=appointment_id, author_user_id=author_user_id, note=note)
    db.add(n)
    await db.flush()
    return n

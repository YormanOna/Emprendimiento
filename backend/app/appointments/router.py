# app/appointments/router.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
# from app.core.deps import get_current_user, require_senior_access, require_senior_edit
from app.appointments.schemas import (
    AppointmentCreate, AppointmentPublic, AppointmentNoteCreate, AppointmentNotePublic
)
from app.appointments.service import create_appointment, list_appointments, add_note

router = APIRouter()


@router.post("/seniors/{senior_id}/appointments", response_model=AppointmentPublic)
async def create_appointment_endpoint(
    senior_id: int,
    payload: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
):
    appt = await create_appointment(db, senior_id, payload.model_dump())  # El model_dump() pasa los datos correctamente
    await db.commit()
    await db.refresh(appt)
    return appt


@router.get("/appointments", response_model=list[AppointmentPublic])
async def get_all_appointments_endpoint(db: AsyncSession = Depends(get_db)):
    """Listar todas las citas del sistema (para admin)"""
    from sqlalchemy import select
    from app.appointments.models import Appointment
    result = await db.execute(select(Appointment).order_by(Appointment.starts_at.desc()))
    return result.scalars().all()


@router.get("/seniors/{senior_id}/appointments", response_model=list[AppointmentPublic])
async def list_appointments_endpoint(
    senior_id: int,
    db: AsyncSession = Depends(get_db),
    # _=Depends(require_senior_access),  # Autenticación deshabilitada temporalmente
):
    return await list_appointments(db, senior_id)


@router.post("/appointments/{appointment_id}/notes", response_model=AppointmentNotePublic)
async def add_note_endpoint(
    appointment_id: int,
    payload: AppointmentNoteCreate,
    db: AsyncSession = Depends(get_db),
    # user=Depends(get_current_user),  # Autenticación deshabilitada temporalmente
):
    user_id = 1  # Usuario hardcodeado temporalmente
    n = await add_note(db, appointment_id, user_id, payload.note)
    await db.commit()
    await db.refresh(n)
    return n

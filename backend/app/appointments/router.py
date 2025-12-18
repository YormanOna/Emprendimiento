# app/appointments/router.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime, date

from app.core.database import get_db
# from app.core.deps import get_current_user, require_senior_access, require_senior_edit
from app.appointments.schemas import (
    AppointmentCreate, AppointmentPublic, AppointmentNoteCreate, AppointmentNotePublic, AppointmentUpdate
)
from app.appointments.service import create_appointment, list_appointments, add_note

router = APIRouter()


@router.post("/seniors/{senior_id}/appointments", response_model=AppointmentPublic)
async def create_appointment_endpoint(
    senior_id: int,
    payload: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
):
    data = payload.model_dump(exclude_none=True)
    
    # Manejar alias scheduled_at -> starts_at
    if 'scheduled_at' in data and 'starts_at' not in data:
        data['starts_at'] = data.pop('scheduled_at')
    elif 'scheduled_at' in data:
        data.pop('scheduled_at')
    
    appt = await create_appointment(db, senior_id, data)
    await db.commit()
    await db.refresh(appt)
    
    # Agregar scheduled_at en la respuesta si es necesario
    if hasattr(appt, 'starts_at'):
        appt.scheduled_at = appt.starts_at
    
    return appt


@router.get("/appointments", response_model=list[AppointmentPublic])
async def get_all_appointments_endpoint(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Listar todas las citas del sistema (para admin) con filtros opcionales"""
    from sqlalchemy import select
    from app.appointments.models import Appointment
    
    query = select(Appointment)
    
    if from_date:
        query = query.where(Appointment.starts_at >= datetime.combine(from_date, datetime.min.time()))
    if to_date:
        query = query.where(Appointment.starts_at <= datetime.combine(to_date, datetime.max.time()))
    if status:
        query = query.where(Appointment.status == status)
    
    query = query.order_by(Appointment.starts_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/seniors/{senior_id}/appointments", response_model=list[AppointmentPublic])
async def list_appointments_endpoint(
    senior_id: int,
    db: AsyncSession = Depends(get_db),
    # _=Depends(require_senior_access),  # Autenticación deshabilitada temporalmente
):
    appointments = await list_appointments(db, senior_id)
    # Asegurar que scheduled_at tenga valor (usar starts_at si es None)
    for appt in appointments:
        if not appt.scheduled_at:
            appt.scheduled_at = appt.starts_at
    return appointments


@router.get("/appointments/{appointment_id}", response_model=AppointmentPublic)
async def get_appointment_endpoint(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Obtener detalle de una cita específica"""
    from sqlalchemy import select
    from app.appointments.models import Appointment
    
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


@router.patch("/appointments/{appointment_id}", response_model=AppointmentPublic)
async def update_appointment_endpoint(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Actualizar una cita"""
    from sqlalchemy import select
    from app.appointments.models import Appointment
    
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(appointment, key, value)
    
    await db.commit()
    await db.refresh(appointment)
    return appointment


@router.delete("/appointments/{appointment_id}")
async def delete_appointment_endpoint(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Cancelar/eliminar una cita"""
    from sqlalchemy import select
    from app.appointments.models import Appointment
    
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    await db.delete(appointment)
    await db.commit()
    return {"message": "Appointment deleted successfully"}


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


@router.get("/appointments/{appointment_id}/notes", response_model=list[AppointmentNotePublic])
async def get_appointment_notes_endpoint(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Obtener todas las notas de una cita"""
    from sqlalchemy import select
    from app.appointments.models import AppointmentNote
    
    result = await db.execute(
        select(AppointmentNote)
        .where(AppointmentNote.appointment_id == appointment_id)
        .order_by(AppointmentNote.created_at.desc())
    )
    return result.scalars().all()

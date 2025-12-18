# app/meds/service.py
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, date, time, timedelta

from app.meds.models import Medication, MedicationSchedule, IntakeLog


async def create_medication(db: AsyncSession, senior_id: int, data: dict) -> Medication:
    med = Medication(senior_id=senior_id, **data)
    db.add(med)
    await db.flush()
    return med


async def add_schedule(db: AsyncSession, medication_id: int, data: dict) -> MedicationSchedule:
    res = await db.execute(select(Medication).where(Medication.id == medication_id))
    medication = res.scalar_one_or_none()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    sched = MedicationSchedule(medication_id=medication_id, **data)
    db.add(sched)
    await db.flush()
    
    # Crear recordatorios automáticos para cada horario
    await create_medication_reminders(db, medication, sched)
    
    return sched


async def create_medication_reminders(db: AsyncSession, medication: Medication, schedule: MedicationSchedule):
    """Crea recordatorios automáticos para los horarios de la medicina"""
    from app.reminders.models import Reminder
    
    # Si no hay horarios, no crear recordatorios
    if not schedule.hours:
        return
    
    # Fecha de inicio (siempre hoy)
    start = date.today()
    # Fecha fin (7 días desde hoy si no se especifica)
    end = schedule.end_date or (start + timedelta(days=7))
    
    # Crear recordatorios para los próximos días
    days_to_create = min(7, (end - start).days + 1)  # Crear para 7 días o hasta el final
    
    for day_offset in range(days_to_create):
        current_date = start + timedelta(days=day_offset)
        
        # Verificar si el día de la semana está en el schedule
        weekday = current_date.weekday()  # 0=lunes, 6=domingo
        if schedule.days_of_week and weekday not in schedule.days_of_week:
            continue
        
        # Crear un recordatorio por cada hora
        for hour in schedule.hours:
            scheduled_datetime = datetime.combine(current_date, time(hour=hour))
            
            # Crear recordatorio incluso si la hora ya pasó (se mostrará como atrasado)
            reminder = Reminder(
                senior_id=medication.senior_id,
                title=f"Tomar {medication.name}",
                description=f"Dosis: {medication.dose} {medication.unit}. {medication.notes or ''}",
                scheduled_at=scheduled_datetime,
                is_completed=False,
                medication_id=medication.id
            )
            db.add(reminder)
    
    await db.flush()


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

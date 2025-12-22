# app/meds/router.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Optional

from app.core.database import get_db
# from app.core.deps import get_current_user, require_senior_access, require_senior_edit
from app.meds.models import IntakeStatus
from app.meds.schemas import (
    MedicationCreate, MedicationPublic,
    MedicationScheduleCreate, MedicationSchedulePublic,
    IntakeLogCreate, IntakeLogPublic
)
from app.meds.service import create_medication, add_schedule, log_intake, list_intakes, list_medications

router = APIRouter()


@router.post("/seniors/{senior_id}/medications", response_model=MedicationPublic)
async def create_medication_endpoint(
    senior_id: int,
    payload: MedicationCreate,
    db: AsyncSession = Depends(get_db),
    # _=Depends(require_senior_edit),  # Autenticación deshabilitada temporalmente
):
    try:
        from sqlalchemy.orm import selectinload
        print(f"📥 Recibiendo datos: {payload.model_dump()}")
        med = await create_medication(db, senior_id, payload.model_dump(exclude={"senior_id"}))
        await db.commit()
        
        # Recargar con la relación schedules
        from sqlalchemy import select
        from app.meds.models import Medication
        result = await db.execute(
            select(Medication)
            .where(Medication.id == med.id)
            .options(selectinload(Medication.schedules))
        )
        med = result.scalar_one()
        
        print(f"✅ Medicamento creado: {med.id}")
        return med
    except Exception as e:
        print(f"❌ Error creando medicamento: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


@router.get("/medications", response_model=list[MedicationPublic])
async def get_all_medications_endpoint(db: AsyncSession = Depends(get_db)):
    """Listar todos los medicamentos del sistema (para admin)"""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.meds.models import Medication
    result = await db.execute(
        select(Medication)
        .options(selectinload(Medication.schedules))
        .order_by(Medication.created_at.desc())
    )
    return result.scalars().all()


@router.get("/seniors/{senior_id}/medications", response_model=list[MedicationPublic])
async def get_medications_endpoint(
    senior_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await list_medications(db, senior_id)


@router.get("/medications/{medication_id}", response_model=MedicationPublic)
async def get_medication_endpoint(
    medication_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Obtener detalles de un medicamento específico"""
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.meds.models import Medication
    from fastapi import HTTPException
    
    result = await db.execute(
        select(Medication)
        .where(Medication.id == medication_id)
        .options(selectinload(Medication.schedules))
    )
    medication = result.scalar_one_or_none()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    return medication


@router.delete("/medications/{medication_id}")
async def delete_medication_endpoint(
    medication_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Eliminar un medicamento y sus datos asociados"""
    from sqlalchemy import select, delete
    from app.meds.models import Medication, MedicationSchedule, IntakeLog
    from app.reminders.models import Reminder
    from fastapi import HTTPException
    
    # Verificar que existe
    result = await db.execute(select(Medication).where(Medication.id == medication_id))
    medication = result.scalar_one_or_none()
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    # Eliminar recordatorios asociados (importante: primero los reminders)
    await db.execute(delete(Reminder).where(Reminder.medication_id == medication_id))
    
    # Eliminar logs de toma asociados
    await db.execute(delete(IntakeLog).where(IntakeLog.medication_id == medication_id))
    
    # Eliminar horarios asociados
    await db.execute(delete(MedicationSchedule).where(MedicationSchedule.medication_id == medication_id))
    
    # Eliminar medicamento
    await db.delete(medication)
    await db.commit()
    
    return {"message": "Medication deleted successfully"}


@router.get("/medications/{medication_id}/schedules", response_model=list[MedicationSchedulePublic])
async def get_medication_schedules_endpoint(
    medication_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Obtener todos los horarios de un medicamento"""
    from sqlalchemy import select
    from app.meds.models import MedicationSchedule
    
    result = await db.execute(
        select(MedicationSchedule)
        .where(MedicationSchedule.medication_id == medication_id)
        .order_by(MedicationSchedule.created_at.desc())
    )
    return result.scalars().all()


@router.post("/medications/{medication_id}/schedule", response_model=MedicationSchedulePublic)
async def create_schedule_endpoint(
    medication_id: int,
    payload: MedicationScheduleCreate,
    db: AsyncSession = Depends(get_db),
):
    sched = await add_schedule(db, medication_id, payload.model_dump())
    await db.commit()
    await db.refresh(sched)
    return sched


@router.post("/intakes", response_model=IntakeLogPublic)
async def create_intake_endpoint(
    payload: IntakeLogCreate,
    db: AsyncSession = Depends(get_db),
):
    data = payload.model_dump()
    data["actor_user_id"] = 1  # Usuario por defecto
    log = await log_intake(db, data)
    await db.commit()
    await db.refresh(log)
    return log


@router.get("/seniors/{senior_id}/intakes", response_model=list[IntakeLogPublic])
async def get_intakes_endpoint(
    senior_id: int,
    from_dt: Optional[datetime] = None,
    to_dt: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    # _=Depends(require_senior_access),  # Autenticación deshabilitada temporalmente
):
    return await list_intakes(db, senior_id, from_dt, to_dt)


@router.post("/medications/{medication_id}/take", response_model=IntakeLogPublic)
async def mark_medication_taken_endpoint(
    medication_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Marcar un medicamento como tomado"""
    from datetime import datetime, timezone
    from sqlalchemy import select
    from app.meds.models import Medication, IntakeLog, IntakeStatus
    
    # Verificar que el medicamento existe
    result = await db.execute(select(Medication).where(Medication.id == medication_id))
    medication = result.scalar_one_or_none()
    if not medication:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Medication not found")
    
    # Crear registro de toma
    now = datetime.now(timezone.utc)
    intake = IntakeLog(
        senior_id=medication.senior_id,
        medication_id=medication_id,
        scheduled_at=now,
        taken_at=now,
        status=IntakeStatus.TAKEN,
        actor_user_id=1  # Usuario por defecto
    )
    db.add(intake)
    await db.commit()
    await db.refresh(intake)
    return intake


@router.patch("/intakes/{intake_id}/status", response_model=IntakeLogPublic)
async def update_intake_status_endpoint(
    intake_id: int,
    status: IntakeStatus,
    db: AsyncSession = Depends(get_db),
):
    """Actualizar el estado de una toma de medicamento"""
    from sqlalchemy import select
    from app.meds.models import IntakeLog
    from datetime import datetime, timezone
    
    result = await db.execute(select(IntakeLog).where(IntakeLog.id == intake_id))
    intake = result.scalar_one_or_none()
    if not intake:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Intake not found")
    
    intake.status = status
    if status == IntakeStatus.TAKEN and not intake.taken_at:
        intake.taken_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(intake)
    return intake

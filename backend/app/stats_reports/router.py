# app/stats_reports/router.py
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import os
from typing import Optional

from app.core.database import get_db
# from app.core.deps import require_senior_access, require_senior_edit
from app.core.config import settings
from app.stats_reports.schemas import StatsResponse, ReportCreate, ReportPublic
from app.stats_reports.service import compute_stats, create_report_job, get_report_job, finalize_report_pdf
from app.stats_reports.models import ReportStatus
from app.meds.models import Medication
from app.appointments.models import Appointment
from app.reminders.models import Reminder, ReminderStatus
from app.audit.models import AuditLog

router = APIRouter()


@router.get("/dashboard")
async def dashboard_stats(
    senior_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint para obtener estadísticas del dashboard.
    Si se proporciona senior_id, devuelve estadísticas de ese senior.
    Si no, devuelve estadísticas globales.
    """
    # Total de medicamentos activos
    med_query = select(func.count(Medication.id))
    if senior_id:
        med_query = med_query.where(Medication.senior_id == senior_id)
    result = await db.execute(med_query)
    total_medications = result.scalar() or 0

    # Citas próximas (futuras)
    appt_query = select(func.count(Appointment.id)).where(
        Appointment.starts_at >= datetime.now(timezone.utc),
        Appointment.status == "SCHEDULED"
    )
    if senior_id:
        appt_query = appt_query.where(Appointment.senior_id == senior_id)
    result = await db.execute(appt_query)
    upcoming_appointments = result.scalar() or 0

    # Recordatorios pendientes
    reminder_query = select(func.count(Reminder.id)).where(
        Reminder.status == ReminderStatus.PENDING
    )
    if senior_id:
        reminder_query = reminder_query.where(Reminder.senior_id == senior_id)
    result = await db.execute(reminder_query)
    pending_reminders = result.scalar() or 0

    # Actividad reciente (últimos 5 registros de auditoría)
    audit_query = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(5)
    result = await db.execute(audit_query)
    audit_logs = result.scalars().all()

    recent_activities = []
    for log in audit_logs:
        activity_type = 'medication'
        color = '#3b82f6'
        
        if 'appointment' in log.action.lower() or 'cita' in log.action.lower():
            activity_type = 'appointment'
            color = '#f59e0b'
        elif 'chat' in log.action.lower() or 'mensaje' in log.action.lower():
            activity_type = 'chat'
            color = '#8b5cf6'
        elif 'reminder' in log.action.lower() or 'recordatorio' in log.action.lower():
            activity_type = 'reminder'
            color = '#10b981'

        recent_activities.append({
            'id': log.id,
            'type': activity_type,
            'description': log.action,
            'timestamp': log.created_at.strftime('%H:%M'),
            'color': color
        })

    return {
        'total_medications': total_medications,
        'upcoming_appointments': upcoming_appointments,
        'pending_reminders': pending_reminders,
        'recent_activities': recent_activities
    }


@router.get("/seniors/{senior_id}/stats", response_model=StatsResponse)
async def stats_endpoint(
    senior_id: int,
    from_dt: datetime,
    to_dt: datetime,
    db: AsyncSession = Depends(get_db),
    # _=Depends(require_senior_access),  # Autenticación deshabilitada temporalmente
):
    stats = await compute_stats(db, senior_id, from_dt, to_dt)
    return {
        "senior_id": senior_id,
        "from_date": from_dt.date(),
        "to_date": to_dt.date(),
        **stats,
    }


@router.post("/seniors/{senior_id}/reports", response_model=ReportPublic)
async def create_report_endpoint(
    senior_id: int,
    payload: ReportCreate,
    db: AsyncSession = Depends(get_db),
    # _=Depends(require_senior_edit),  # Autenticación deshabilitada temporalmente
):
    job = await create_report_job(db, senior_id, payload.range_start, payload.range_end)

    # MVP: finaliza en el acto (luego será un job async real)
    await finalize_report_pdf(db, job)

    await db.commit()
    await db.refresh(job)
    return job


@router.get("/reports/{report_id}", response_model=ReportPublic)
async def get_report_endpoint(
    report_id: int,
    db: AsyncSession = Depends(get_db),
):
    job = await get_report_job(db, report_id)
    if not job:
        raise HTTPException(status_code=404, detail="Report not found")
    return job


@router.get("/reports/{report_id}/download")
async def download_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
):
    job = await get_report_job(db, report_id)
    if not job:
        raise HTTPException(status_code=404, detail="Report not found")
    if job.status != ReportStatus.READY:
        raise HTTPException(status_code=400, detail=f"Report not ready: {job.status}")
    html_path = os.path.join(settings.REPORTS_DIR, f"report_{job.id}.html")
    if not os.path.exists(html_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk")
    return FileResponse(html_path, media_type="text/html", filename=f"report_{job.id}.html")

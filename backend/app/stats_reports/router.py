# app/stats_reports/router.py
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import os
from typing import Optional

from app.core.database import get_db
# from app.core.deps import require_senior_access, require_senior_edit
from app.core.config import settings
from app.stats_reports.schemas import StatsResponse, ReportCreate, ReportPublic, SeniorHealthReport, GlobalStatsResponse
from app.stats_reports.service import compute_stats, create_report_job, get_report_job, finalize_report_pdf
from app.stats_reports.advanced_service import generate_senior_health_report, get_global_stats
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


# ==================== NUEVAS RUTAS MEJORADAS ====================

@router.get("/seniors/{senior_id}/health-report", response_model=SeniorHealthReport)
async def get_senior_health_report(
    senior_id: int,
    period_start: date = Query(..., description="Fecha de inicio del período"),
    period_end: date = Query(..., description="Fecha de fin del período"),
    db: AsyncSession = Depends(get_db),
):
    """
    Genera un reporte completo de salud para un adulto mayor específico.
    Incluye adherencia a medicamentos, citas, recordatorios, actividad del equipo y insights.
    """
    try:
        report = await generate_senior_health_report(db, senior_id, period_start, period_end)
        return report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.get("/global-stats", response_model=GlobalStatsResponse)
async def get_global_statistics(
    db: AsyncSession = Depends(get_db),
):
    """
    Obtiene estadísticas globales del sistema completo.
    Incluye totales por tipo de usuario, adherencia promedio,
    y listas de seniors destacados y que requieren atención.
    """
    try:
        stats = await get_global_stats(db)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching global stats: {str(e)}")


@router.get("/seniors/{senior_id}/quick-stats")
async def get_senior_quick_stats(
    senior_id: int,
    days: int = Query(7, description="Número de días hacia atrás para analizar"),
    db: AsyncSession = Depends(get_db),
):
    """
    Obtiene estadísticas rápidas para un senior (últimos N días).
    Útil para dashboards y vistas rápidas.
    """
    from datetime import timedelta
    from app.meds.models import IntakeLog, IntakeStatus
    from app.appointments.models import Appointment
    from app.reminders.models import Reminder, ReminderStatus
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Medicamentos
    result = await db.execute(
        select(IntakeLog.status, func.count(IntakeLog.id))
        .where(
            IntakeLog.senior_id == senior_id,
            IntakeLog.scheduled_at >= start_date,
            IntakeLog.scheduled_at <= end_date
        )
        .group_by(IntakeLog.status)
    )
    med_counts = {status.value: cnt for status, cnt in result.all()}
    taken = med_counts.get(IntakeStatus.TAKEN.value, 0)
    total_meds = sum(med_counts.values())
    adherence = (taken / total_meds * 100) if total_meds > 0 else 0.0
    
    # Citas próximas
    result = await db.execute(
        select(func.count(Appointment.id))
        .where(
            Appointment.senior_id == senior_id,
            Appointment.starts_at >= end_date,
            Appointment.status == "SCHEDULED"
        )
    )
    upcoming_appointments = result.scalar() or 0
    
    # Recordatorios pendientes de hoy
    today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)
    today_end = datetime.combine(date.today(), datetime.max.time(), tzinfo=timezone.utc)
    
    result = await db.execute(
        select(func.count(Reminder.id))
        .where(
            Reminder.senior_id == senior_id,
            Reminder.scheduled_at >= today_start,
            Reminder.scheduled_at <= today_end,
            Reminder.status == ReminderStatus.PENDING
        )
    )
    pending_reminders_today = result.scalar() or 0
    
    return {
        'period_days': days,
        'medication_adherence': round(adherence, 1),
        'total_doses': total_meds,
        'doses_taken': taken,
        'upcoming_appointments': upcoming_appointments,
        'pending_reminders_today': pending_reminders_today
    }


@router.get("/care-team/{user_id}/performance")
async def get_care_team_member_performance(
    user_id: int,
    days: int = Query(30, description="Número de días hacia atrás para analizar"),
    db: AsyncSession = Depends(get_db),
):
    """
    Analiza el desempeño de un miembro del equipo de cuidado.
    Útil para evaluaciones y reconocimientos.
    """
    from datetime import timedelta
    
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    
    # Obtener información del usuario
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Contar acciones totales
    result = await db.execute(
        select(func.count(AuditLog.id))
        .where(
            AuditLog.user_id == user_id,
            AuditLog.created_at >= start_date,
            AuditLog.created_at <= end_date
        )
    )
    total_actions = result.scalar() or 0
    
    # Acciones por día (promedio)
    avg_actions_per_day = total_actions / days if days > 0 else 0
    
    # Seniors bajo su cuidado
    result = await db.execute(
        select(func.count(CareTeam.senior_id.distinct()))
        .where(CareTeam.user_id == user_id)
    )
    seniors_count = result.scalar() or 0
    
    # Última actividad
    result = await db.execute(
        select(AuditLog.created_at, AuditLog.action)
        .where(AuditLog.user_id == user_id)
        .order_by(AuditLog.created_at.desc())
        .limit(1)
    )
    last_activity = result.first()
    
    return {
        'user_id': user_id,
        'user_name': user.full_name,
        'role': user.role.value,
        'period_days': days,
        'total_actions': total_actions,
        'avg_actions_per_day': round(avg_actions_per_day, 1),
        'seniors_under_care': seniors_count,
        'last_activity': {
            'timestamp': last_activity[0] if last_activity else None,
            'action': last_activity[1] if last_activity else None
        } if last_activity else None
    }

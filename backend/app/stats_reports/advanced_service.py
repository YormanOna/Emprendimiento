# app/stats_reports/advanced_service.py
from datetime import datetime, date, timezone, timedelta
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any

from app.auth.models import User, UserRole
from app.seniors.models import SeniorProfile, CareTeam
from app.meds.models import Medication, IntakeLog, IntakeStatus
from app.appointments.models import Appointment
from app.reminders.models import Reminder, ReminderStatus
from app.audit.models import AuditLog
from app.stats_reports.schemas import (
    MedicationAdherenceDetail,
    AppointmentSummary,
    ActivityByHour,
    CareTeamActivity,
    SeniorHealthReport,
    GlobalStatsResponse
)


async def generate_senior_health_report(
    db: AsyncSession,
    senior_id: int,
    period_start: date,
    period_end: date
) -> SeniorHealthReport:
    """Genera un reporte completo de salud para un adulto mayor específico."""
    
    # Obtener información del senior
    result = await db.execute(
        select(SeniorProfile).where(SeniorProfile.id == senior_id)
    )
    senior = result.scalar_one_or_none()
    if not senior:
        raise ValueError(f"Senior with id {senior_id} not found")
    
    # Convertir fechas a datetime para queries
    dt_start = datetime.combine(period_start, datetime.min.time(), tzinfo=timezone.utc)
    dt_end = datetime.combine(period_end, datetime.max.time(), tzinfo=timezone.utc)
    
    # 1. MEDICACIONES - Adherencia por medicamento
    medications_detail = await _get_medications_adherence(db, senior_id, dt_start, dt_end)
    
    total_medications = len(medications_detail)
    if total_medications > 0:
        medication_adherence = sum(m.adherence_rate for m in medications_detail) / total_medications
    else:
        medication_adherence = 0.0
    
    # 2. CITAS - Resumen
    appointments_summary = await _get_appointments_summary(db, senior_id, dt_start, dt_end)
    
    # 3. RECORDATORIOS
    reminder_stats = await _get_reminders_stats(db, senior_id, dt_start, dt_end)
    
    # 4. ACTIVIDAD POR HORA
    activity_by_hour = await _get_activity_by_hour(db, senior_id, dt_start, dt_end)
    
    # Encontrar las horas más activas
    sorted_hours = sorted(activity_by_hour, key=lambda x: x.medication_intakes + x.appointments + x.reminders, reverse=True)
    most_active_hours = [h.hour for h in sorted_hours[:3]]
    
    # 5. ACTIVIDAD DEL EQUIPO DE CUIDADO
    care_team_activity = await _get_care_team_activity(db, senior_id, dt_start, dt_end)
    
    # 6. INSIGHTS - Generar observaciones automáticas
    insights = _generate_insights(
        medication_adherence,
        medications_detail,
        appointments_summary,
        reminder_stats,
        care_team_activity
    )
    
    return SeniorHealthReport(
        senior_id=senior_id,
        senior_name=senior.full_name,
        period_start=period_start,
        period_end=period_end,
        total_medications=total_medications,
        medication_adherence=medication_adherence,
        medications_detail=medications_detail,
        appointments_summary=appointments_summary,
        total_reminders=reminder_stats['total'],
        completed_reminders=reminder_stats['completed'],
        activity_by_hour=activity_by_hour,
        most_active_hours=most_active_hours,
        care_team_activity=care_team_activity,
        insights=insights
    )


async def _get_medications_adherence(
    db: AsyncSession,
    senior_id: int,
    dt_start: datetime,
    dt_end: datetime
) -> List[MedicationAdherenceDetail]:
    """Calcula adherencia por cada medicamento."""
    
    # Obtener todos los medicamentos del senior
    result = await db.execute(
        select(Medication)
        .where(Medication.senior_id == senior_id)
        .order_by(Medication.name)
    )
    medications = result.scalars().all()
    
    details = []
    for med in medications:
        # Contar intakes por medicamento
        result = await db.execute(
            select(IntakeLog.status, func.count(IntakeLog.id))
            .where(
                IntakeLog.medication_id == med.id,
                IntakeLog.scheduled_at >= dt_start,
                IntakeLog.scheduled_at <= dt_end
            )
            .group_by(IntakeLog.status)
        )
        
        counts = {status.value: cnt for status, cnt in result.all()}
        taken = counts.get(IntakeStatus.TAKEN.value, 0)
        missed = counts.get(IntakeStatus.MISSED.value, 0) + counts.get(IntakeStatus.SKIPPED.value, 0)
        total = taken + missed
        
        adherence = (taken / total * 100) if total > 0 else 0.0
        
        details.append(MedicationAdherenceDetail(
            medication_name=med.name,
            total_doses=total,
            taken=taken,
            missed=missed,
            adherence_rate=adherence
        ))
    
    return details


async def _get_appointments_summary(
    db: AsyncSession,
    senior_id: int,
    dt_start: datetime,
    dt_end: datetime
) -> AppointmentSummary:
    """Resume las citas en el período."""
    
    result = await db.execute(
        select(Appointment.status, func.count(Appointment.id))
        .where(
            Appointment.senior_id == senior_id,
            Appointment.starts_at >= dt_start,
            Appointment.starts_at <= dt_end
        )
        .group_by(Appointment.status)
    )
    
    counts = {status: cnt for status, cnt in result.all()}
    
    total = sum(counts.values())
    completed = counts.get("COMPLETED", 0)
    cancelled = counts.get("CANCELLED", 0)
    pending = counts.get("SCHEDULED", 0)
    missed = counts.get("MISSED", 0)
    
    return AppointmentSummary(
        total=total,
        completed=completed,
        cancelled=cancelled,
        pending=pending,
        missed=missed
    )


async def _get_reminders_stats(
    db: AsyncSession,
    senior_id: int,
    dt_start: datetime,
    dt_end: datetime
) -> Dict[str, int]:
    """Estadísticas de recordatorios."""
    
    result = await db.execute(
        select(func.count(Reminder.id))
        .where(
            Reminder.senior_id == senior_id,
            Reminder.scheduled_at >= dt_start,
            Reminder.scheduled_at <= dt_end
        )
    )
    total = result.scalar() or 0
    
    result = await db.execute(
        select(func.count(Reminder.id))
        .where(
            Reminder.senior_id == senior_id,
            Reminder.scheduled_at >= dt_start,
            Reminder.scheduled_at <= dt_end,
            Reminder.status == ReminderStatus.COMPLETED
        )
    )
    completed = result.scalar() or 0
    
    return {'total': total, 'completed': completed}


async def _get_activity_by_hour(
    db: AsyncSession,
    senior_id: int,
    dt_start: datetime,
    dt_end: datetime
) -> List[ActivityByHour]:
    """Analiza la actividad por hora del día."""
    
    activity_hours = []
    
    for hour in range(24):
        # Medicamentos tomados en esta hora
        result = await db.execute(
            select(func.count(IntakeLog.id))
            .where(
                IntakeLog.senior_id == senior_id,
                IntakeLog.taken_at >= dt_start,
                IntakeLog.taken_at <= dt_end,
                IntakeLog.status == IntakeStatus.TAKEN,
                func.extract('hour', IntakeLog.taken_at) == hour
            )
        )
        med_count = result.scalar() or 0
        
        # Citas en esta hora
        result = await db.execute(
            select(func.count(Appointment.id))
            .where(
                Appointment.senior_id == senior_id,
                Appointment.starts_at >= dt_start,
                Appointment.starts_at <= dt_end,
                func.extract('hour', Appointment.starts_at) == hour
            )
        )
        appt_count = result.scalar() or 0
        
        # Recordatorios en esta hora
        result = await db.execute(
            select(func.count(Reminder.id))
            .where(
                Reminder.senior_id == senior_id,
                Reminder.scheduled_at >= dt_start,
                Reminder.scheduled_at <= dt_end,
                func.extract('hour', Reminder.scheduled_at) == hour
            )
        )
        rem_count = result.scalar() or 0
        
        activity_hours.append(ActivityByHour(
            hour=hour,
            medication_intakes=med_count,
            appointments=appt_count,
            reminders=rem_count
        ))
    
    return activity_hours


async def _get_care_team_activity(
    db: AsyncSession,
    senior_id: int,
    dt_start: datetime,
    dt_end: datetime
) -> List[CareTeamActivity]:
    """Analiza la actividad del equipo de cuidado."""
    
    # Obtener miembros del equipo
    result = await db.execute(
        select(CareTeam)
        .options(selectinload(CareTeam.user))
        .where(CareTeam.senior_id == senior_id)
    )
    team_members = result.scalars().all()
    
    activities = []
    for member in team_members:
        # Contar acciones del usuario en auditoría
        result = await db.execute(
            select(func.count(AuditLog.id))
            .where(
                AuditLog.user_id == member.user_id,
                AuditLog.created_at >= dt_start,
                AuditLog.created_at <= dt_end
            )
        )
        actions_count = result.scalar() or 0
        
        # Última actividad
        result = await db.execute(
            select(AuditLog.created_at)
            .where(
                AuditLog.user_id == member.user_id,
                AuditLog.created_at >= dt_start,
                AuditLog.created_at <= dt_end
            )
            .order_by(AuditLog.created_at.desc())
            .limit(1)
        )
        last_activity = result.scalar()
        
        activities.append(CareTeamActivity(
            user_id=member.user_id,
            user_name=member.user.full_name,
            role=member.membership_role,
            actions_count=actions_count,
            last_activity=last_activity
        ))
    
    return sorted(activities, key=lambda x: x.actions_count, reverse=True)


def _generate_insights(
    medication_adherence: float,
    medications_detail: List[MedicationAdherenceDetail],
    appointments_summary: AppointmentSummary,
    reminder_stats: Dict[str, int],
    care_team_activity: List[CareTeamActivity]
) -> List[str]:
    """Genera observaciones inteligentes basadas en los datos."""
    
    insights = []
    
    # Adherencia a medicamentos
    if medication_adherence >= 90:
        insights.append("✅ Excelente adherencia a medicamentos (>90%). El paciente está cumpliendo muy bien con su tratamiento.")
    elif medication_adherence >= 70:
        insights.append("⚠️ Adherencia moderada a medicamentos (70-90%). Se recomienda reforzar recordatorios.")
    elif medication_adherence > 0:
        insights.append("❌ Adherencia baja a medicamentos (<70%). Se requiere intervención inmediata del equipo de cuidado.")
    
    # Medicamentos problemáticos
    problem_meds = [m for m in medications_detail if m.adherence_rate < 70 and m.total_doses > 0]
    if problem_meds:
        med_names = ", ".join([m.medication_name for m in problem_meds[:3]])
        insights.append(f"🔍 Medicamentos con baja adherencia: {med_names}")
    
    # Citas
    if appointments_summary.missed > 0:
        insights.append(f"📅 {appointments_summary.missed} cita(s) perdida(s). Considerar establecer recordatorios más frecuentes.")
    
    if appointments_summary.completed == appointments_summary.total and appointments_summary.total > 0:
        insights.append("✅ Todas las citas médicas fueron completadas exitosamente.")
    
    # Recordatorios
    if reminder_stats['total'] > 0:
        completion_rate = (reminder_stats['completed'] / reminder_stats['total']) * 100
        if completion_rate >= 80:
            insights.append(f"✅ Alta tasa de cumplimiento de recordatorios ({completion_rate:.0f}%).")
        else:
            insights.append(f"⚠️ Tasa de cumplimiento de recordatorios baja ({completion_rate:.0f}%). Revisar efectividad de los recordatorios.")
    
    # Equipo de cuidado
    active_members = [m for m in care_team_activity if m.actions_count > 0]
    if len(active_members) == 0 and len(care_team_activity) > 0:
        insights.append("⚠️ Ningún miembro del equipo de cuidado ha registrado actividad en este período.")
    elif len(active_members) > 0:
        most_active = active_members[0]
        insights.append(f"👤 Miembro más activo del equipo: {most_active.user_name} ({most_active.role}) con {most_active.actions_count} acciones.")
    
    return insights


async def get_global_stats(db: AsyncSession) -> GlobalStatsResponse:
    """Obtiene estadísticas globales del sistema."""
    
    # Contar usuarios por rol
    result = await db.execute(
        select(User.role, func.count(User.id))
        .group_by(User.role)
    )
    user_counts = {role.value: cnt for role, cnt in result.all()}
    
    total_seniors = user_counts.get(UserRole.SENIOR.value, 0)
    total_caregivers = user_counts.get(UserRole.CAREGIVER.value, 0)
    total_family = user_counts.get(UserRole.FAMILY.value, 0)
    total_doctors = user_counts.get(UserRole.DOCTOR.value, 0)
    
    # Total de medicamentos
    result = await db.execute(select(func.count(Medication.id)))
    total_medications = result.scalar() or 0
    
    # Citas de hoy
    today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)
    today_end = datetime.combine(date.today(), datetime.max.time(), tzinfo=timezone.utc)
    
    result = await db.execute(
        select(func.count(Appointment.id))
        .where(
            Appointment.starts_at >= today_start,
            Appointment.starts_at <= today_end
        )
    )
    total_appointments_today = result.scalar() or 0
    
    # Recordatorios activos
    result = await db.execute(
        select(func.count(Reminder.id))
        .where(Reminder.status == ReminderStatus.PENDING)
    )
    active_reminders = result.scalar() or 0
    
    # Adherencia promedio global
    result = await db.execute(
        select(SeniorProfile.id, SeniorProfile.full_name)
    )
    seniors = result.all()
    
    adherence_list = []
    top_performers = []
    need_attention = []
    
    # Calcular para últimos 7 días
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    now = datetime.now(timezone.utc)
    
    for senior_id, senior_name in seniors:
        result = await db.execute(
            select(IntakeLog.status, func.count(IntakeLog.id))
            .where(
                IntakeLog.senior_id == senior_id,
                IntakeLog.scheduled_at >= week_ago,
                IntakeLog.scheduled_at <= now
            )
            .group_by(IntakeLog.status)
        )
        
        counts = {status.value: cnt for status, cnt in result.all()}
        taken = counts.get(IntakeStatus.TAKEN.value, 0)
        total = sum(counts.values())
        
        if total > 0:
            adherence = (taken / total) * 100
            adherence_list.append(adherence)
            
            senior_data = {
                'id': senior_id,
                'name': senior_name,
                'adherence': round(adherence, 1),
                'total_doses': total
            }
            
            if adherence >= 90:
                top_performers.append(senior_data)
            elif adherence < 70:
                need_attention.append(senior_data)
    
    average_adherence = sum(adherence_list) / len(adherence_list) if adherence_list else 0.0
    
    # Ordenar listas
    top_performers = sorted(top_performers, key=lambda x: x['adherence'], reverse=True)[:5]
    need_attention = sorted(need_attention, key=lambda x: x['adherence'])[:5]
    
    return GlobalStatsResponse(
        total_seniors=total_seniors,
        total_caregivers=total_caregivers,
        total_family_members=total_family,
        total_doctors=total_doctors,
        total_medications=total_medications,
        total_appointments_today=total_appointments_today,
        active_reminders=active_reminders,
        average_adherence=round(average_adherence, 1),
        top_performing_seniors=top_performers,
        seniors_needing_attention=need_attention
    )

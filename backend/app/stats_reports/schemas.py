# app/stats_reports/schemas.py
from datetime import date, datetime
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.stats_reports.models import ReportStatus


class StatsResponse(BaseModel):
    senior_id: int
    from_date: date
    to_date: date
    total_intakes: int
    taken: int
    missed: int
    late: int
    skipped: int
    adherence_rate: float  # taken/total


class ReportCreate(BaseModel):
    range_start: date
    range_end: date


class ReportPublic(BaseModel):
    id: int
    senior_id: int
    range_start: date
    range_end: date
    status: ReportStatus
    file_url: Optional[str] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True


# Nuevos schemas para reportes mejorados
class MedicationAdherenceDetail(BaseModel):
    medication_name: str
    total_doses: int
    taken: int
    missed: int
    adherence_rate: float


class AppointmentSummary(BaseModel):
    total: int
    completed: int
    cancelled: int
    pending: int
    missed: int


class ActivityByHour(BaseModel):
    hour: int
    medication_intakes: int
    appointments: int
    reminders: int


class CareTeamActivity(BaseModel):
    user_id: int
    user_name: str
    role: str
    actions_count: int
    last_activity: Optional[datetime]


class SeniorHealthReport(BaseModel):
    senior_id: int
    senior_name: str
    period_start: date
    period_end: date
    
    # Medicaciones
    total_medications: int
    medication_adherence: float
    medications_detail: List[MedicationAdherenceDetail]
    
    # Citas
    appointments_summary: AppointmentSummary
    
    # Recordatorios
    total_reminders: int
    completed_reminders: int
    
    # Actividad
    activity_by_hour: List[ActivityByHour]
    most_active_hours: List[int]
    
    # Equipo de cuidado
    care_team_activity: List[CareTeamActivity]
    
    # Insights
    insights: List[str]


class GlobalStatsResponse(BaseModel):
    total_seniors: int
    total_caregivers: int
    total_family_members: int
    total_doctors: int
    total_medications: int
    total_appointments_today: int
    active_reminders: int
    average_adherence: float
    top_performing_seniors: List[Dict[str, Any]]
    seniors_needing_attention: List[Dict[str, Any]]

# app/stats_reports/schemas.py
from datetime import date, datetime
from pydantic import BaseModel
from typing import Optional
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

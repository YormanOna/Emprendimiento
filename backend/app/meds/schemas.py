# app/meds/schemas.py
from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

from app.meds.models import IntakeStatus


class MedicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    dose: str = Field(min_length=1, max_length=40)
    unit: str = Field(min_length=1, max_length=20)
    notes: Optional[str] = None
    # Campos opcionales para crear horario directamente
    start_date: Optional[date] = Field(None, description="Fecha de inicio del tratamiento")
    end_date: Optional[date] = Field(None, description="Fecha de fin del tratamiento")
    hours: Optional[List[int]] = Field(None, description="Horas del día para tomar (0-23)")
    days_of_week: Optional[List[int]] = Field(None, description="Días de la semana (0=Lun, 6=Dom)")

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def empty_string_to_none(cls, v):
        """Convertir strings vacíos a None para fechas opcionales"""
        if v == "" or v is None:
            return None
        return v

    @field_validator("hours")
    @classmethod
    def validate_hours(cls, v):
        if v is not None and len(v) > 0 and not all(0 <= h <= 23 for h in v):
            raise ValueError("Las horas deben estar entre 0 y 23")
        return sorted(set(v)) if v else None

    @field_validator("days_of_week")
    @classmethod
    def validate_days(cls, v):
        if v is not None and len(v) > 0 and not all(0 <= d <= 6 for d in v):
            raise ValueError("Los días deben estar entre 0 (Lunes) y 6 (Domingo)")
        return sorted(set(v)) if v else None

    @field_validator("end_date", mode="after")
    @classmethod
    def validate_end_date(cls, v, info):
        """Validar que end_date sea posterior a start_date"""
        if v and info.data.get("start_date") and v < info.data["start_date"]:
            raise ValueError("La fecha de fin no puede ser anterior a la fecha de inicio")
        return v


class MedicationUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    dose: Optional[str] = Field(default=None, min_length=1, max_length=40)
    unit: Optional[str] = Field(default=None, min_length=1, max_length=20)
    notes: Optional[str] = None


class MedicationPublic(BaseModel):
    id: int
    senior_id: int
    name: str
    dose: str
    unit: str
    notes: Optional[str] = None
    # Incluir información de horarios si existen
    schedules: Optional[List['MedicationSchedulePublic']] = []

    class Config:
        from_attributes = True


class MedicationScheduleCreate(BaseModel):
    start_date: Optional[date] = Field(None, description="Fecha de inicio del horario")
    end_date: Optional[date] = Field(None, description="Fecha de fin del horario")
    hours: List[int] = Field(
        min_length=1,
        description="Horas del día para tomar el medicamento (0-23)",
        examples=[[8, 14, 20]]
    )
    days_of_week: Optional[List[int]] = Field(
        None,
        description="Días de la semana (0=Lunes, 6=Domingo)",
        examples=[[0, 1, 2, 3, 4]]
    )

    @field_validator("hours")
    @classmethod
    def validate_hours(cls, v):
        if not all(0 <= h <= 23 for h in v):
            raise ValueError("Las horas deben estar entre 0 y 23")
        return sorted(set(v))  # Elimina duplicados y ordena

    @field_validator("days_of_week")
    @classmethod
    def validate_days(cls, v):
        if v is not None and not all(0 <= d <= 6 for d in v):
            raise ValueError("Los días deben estar entre 0 (Lunes) y 6 (Domingo)")
        return sorted(set(v)) if v else v

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, v, info):
        if v and info.data.get("start_date") and v < info.data["start_date"]:
            raise ValueError("La fecha de fin no puede ser anterior a la fecha de inicio")
        return v


class MedicationSchedulePublic(BaseModel):
    id: int
    medication_id: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    hours: List[int]
    days_of_week: Optional[List[int]] = None

    class Config:
        from_attributes = True


class IntakeLogCreate(BaseModel):
    senior_id: int = Field(gt=0, description="ID del adulto mayor")
    medication_id: int = Field(gt=0, description="ID del medicamento")
    scheduled_at: datetime = Field(description="Hora programada")
    status: IntakeStatus = Field(description="Estado de la toma")
    taken_at: Optional[datetime] = Field(
        None,
        description="Hora real en que se tomó el medicamento"
    )


class IntakeLogPublic(BaseModel):
    id: int
    senior_id: int
    medication_id: int
    scheduled_at: datetime
    taken_at: Optional[datetime] = None
    status: IntakeStatus
    actor_user_id: Optional[int] = None

    class Config:
        from_attributes = True

# app/appointments/schemas.py
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional

class AppointmentCreate(BaseModel):
    doctor_user_id: Optional[int] = Field(None, gt=0, description="ID del doctor (opcional)")
    doctor_name: Optional[str] = Field(None, max_length=120, description="Nombre del doctor")
    specialty: Optional[str] = Field(None, max_length=100, description="Especialidad médica")
    scheduled_at: Optional[datetime] = Field(None, description="Fecha y hora de la cita")
    starts_at: Optional[datetime] = Field(None, description="Fecha y hora de inicio (alias)")
    location: Optional[str] = Field(
        None,
        max_length=200,
        description="Ubicación de la cita",
        examples=["Consultorio 301, Clínica Central"]
    )
    reason: Optional[str] = Field(
        None,
        max_length=500,
        description="Motivo de la consulta",
        examples=["Control de presión arterial"]
    )
    notes: Optional[str] = Field(
        None,
        max_length=1000,
        description="Notas adicionales"
    )

    @field_validator("scheduled_at", "starts_at")
    @classmethod
    def validate_future_date(cls, v):
        if v is None:
            return v
        from datetime import datetime, timezone
        if v < datetime.now(timezone.utc):
            raise ValueError("La cita debe ser en el futuro")
        return v

class AppointmentPublic(BaseModel):
    id: int
    senior_id: int
    doctor_user_id: Optional[int] = None
    doctor_name: Optional[str] = None
    specialty: Optional[str] = None
    scheduled_at: datetime
    starts_at: Optional[datetime] = None
    location: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: str

    class Config:
        from_attributes = True

class AppointmentNoteCreate(BaseModel):
    note: str = Field(
        min_length=1,
        max_length=2000,
        description="Nota o comentario sobre la cita"
    )


class AppointmentNotePublic(BaseModel):
    id: int
    appointment_id: int
    author_user_id: int
    note: str

    class Config:
        from_attributes = True


class AppointmentUpdate(BaseModel):
    doctor_user_id: Optional[int] = Field(default=None, gt=0)
    starts_at: Optional[datetime] = None
    location: Optional[str] = Field(default=None, max_length=200)
    reason: Optional[str] = Field(default=None, max_length=500)
    status: Optional[str] = Field(default=None, max_length=20)
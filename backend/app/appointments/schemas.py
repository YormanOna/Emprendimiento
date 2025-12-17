# app/appointments/schemas.py
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional

class AppointmentCreate(BaseModel):
    doctor_user_id: int = Field(gt=0, description="ID del doctor")
    starts_at: datetime = Field(description="Fecha y hora de la cita")
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

    @field_validator("starts_at")
    @classmethod
    def validate_future_date(cls, v):
        from datetime import datetime, timezone
        if v < datetime.now(timezone.utc):
            raise ValueError("La cita debe ser en el futuro")
        return v

class AppointmentPublic(BaseModel):
    id: int
    senior_id: int
    doctor_user_id: int
    starts_at: datetime
    location: Optional[str] = None
    reason: Optional[str] = None
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
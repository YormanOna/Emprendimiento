# app/meds/models.py
import enum
from datetime import datetime, date
from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.models import Base, TimestampMixin


class IntakeStatus(str, enum.Enum):
    TAKEN = "TAKEN"
    MISSED = "MISSED"
    LATE = "LATE"
    SKIPPED = "SKIPPED"


class Medication(TimestampMixin, Base):
    __tablename__ = "medications"

    id: Mapped[int] = mapped_column(primary_key=True)
    senior_id: Mapped[int] = mapped_column(ForeignKey("seniors.id"), index=True, nullable=False)

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    dose: Mapped[str] = mapped_column(String(40), nullable=False)  # "500"
    unit: Mapped[str] = mapped_column(String(20), nullable=False)  # "mg", "IU"
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    schedules = relationship("MedicationSchedule", back_populates="medication", cascade="all, delete-orphan")


class MedicationSchedule(TimestampMixin, Base):
    __tablename__ = "medication_schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    medication_id: Mapped[int] = mapped_column(ForeignKey("medications.id"), index=True, nullable=False)

    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Ej: [8, 14, 20] o si quieres más preciso luego usas "HH:MM" en string
    # MySQL no soporta ARRAY, usamos JSON para almacenar listas
    hours: Mapped[list[int]] = mapped_column(JSON, nullable=False)

    # 0..6 (lunes..domingo) por ejemplo, o usa 1..7 como prefieras
    days_of_week: Mapped[list[int] | None] = mapped_column(JSON, nullable=True)

    medication = relationship("Medication", back_populates="schedules")


class IntakeLog(TimestampMixin, Base):
    __tablename__ = "intake_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    senior_id: Mapped[int] = mapped_column(ForeignKey("seniors.id"), index=True, nullable=False)
    medication_id: Mapped[int] = mapped_column(ForeignKey("medications.id"), index=True, nullable=False)

    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    taken_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[IntakeStatus] = mapped_column(Enum(IntakeStatus), nullable=False, index=True)

    # quién marcó la toma (cuidador/familiar/senior)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)

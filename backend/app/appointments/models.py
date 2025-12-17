# app/appointments/models.py
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.models import Base, TimestampMixin


class Appointment(TimestampMixin, Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    senior_id: Mapped[int] = mapped_column(ForeignKey("seniors.id"), index=True, nullable=False)
    doctor_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)

    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="SCHEDULED", nullable=False)

    notes = relationship("AppointmentNote", back_populates="appointment", cascade="all, delete-orphan")

class AppointmentNote(TimestampMixin, Base):
    __tablename__ = "appointment_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), index=True, nullable=False)

    author_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)

    appointment = relationship("Appointment", back_populates="notes")
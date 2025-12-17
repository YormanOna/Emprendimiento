# app/reminders/models.py
import enum
from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import Base, TimestampMixin


class ReminderStatus(str, enum.Enum):
    PENDING = "PENDING"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


class Reminder(TimestampMixin, Base):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(primary_key=True)
    senior_id: Mapped[int] = mapped_column(ForeignKey("seniors.id"), index=True, nullable=False)

    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    repeat_rule: Mapped[str | None] = mapped_column(String(120), nullable=True)  # ej "DAILY", "WEEKLY:1,3,5"

    status: Mapped[ReminderStatus] = mapped_column(Enum(ReminderStatus), default=ReminderStatus.PENDING, nullable=False)
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Referencia opcional a medicamento (para recordatorios automáticos)
    medication_id: Mapped[int | None] = mapped_column(ForeignKey("medications.id"), nullable=True, index=True)
    
    # Campo de compatibilidad con el esquema anterior
    is_completed: Mapped[bool] = mapped_column(default=False, nullable=False)

    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)

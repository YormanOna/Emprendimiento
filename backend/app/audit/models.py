# app/audit/models.py
from sqlalchemy import ForeignKey, String, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import Base, TimestampMixin


class AuditLog(TimestampMixin, Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)

    action: Mapped[str] = mapped_column(String(50), nullable=False)   # e.g. CREATE, UPDATE, DELETE
    entity: Mapped[str] = mapped_column(String(80), nullable=False)   # e.g. "Medication"
    entity_id: Mapped[str] = mapped_column(String(80), nullable=False)

    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)

# app/stats_reports/models.py
import enum
from datetime import date
from sqlalchemy import Date, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import Base, TimestampMixin


class ReportStatus(str, enum.Enum):
    PENDING = "PENDING"
    READY = "READY"
    FAILED = "FAILED"


class ReportJob(TimestampMixin, Base):
    __tablename__ = "report_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    senior_id: Mapped[int] = mapped_column(ForeignKey("seniors.id"), index=True, nullable=False)

    range_start: Mapped[date] = mapped_column(Date, nullable=False)
    range_end: Mapped[date] = mapped_column(Date, nullable=False)

    status: Mapped[ReportStatus] = mapped_column(Enum(ReportStatus), default=ReportStatus.PENDING, nullable=False)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)

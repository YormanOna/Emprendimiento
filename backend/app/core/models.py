# app/core/models.py
import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    DOCTOR = "DOCTOR"
    CAREGIVER = "CAREGIVER"
    FAMILY = "FAMILY"
    SENIOR = "SENIOR"


class MembershipRole(str, enum.Enum):
    SELF = "SELF"
    DOCTOR = "DOCTOR"
    NURSE = "NURSE"
    CAREGIVER = "CAREGIVER"
    PRIMARY_CAREGIVER = "PRIMARY_CAREGIVER"
    FAMILY = "FAMILY"
    OTHER = "OTHER"

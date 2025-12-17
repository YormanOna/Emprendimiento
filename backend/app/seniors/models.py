# app/seniors/models.py
from datetime import date
from sqlalchemy import Date, ForeignKey, String, Text, Enum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.models import Base, TimestampMixin, MembershipRole


class SeniorProfile(TimestampMixin, Base):
    __tablename__ = "seniors"

    id: Mapped[int] = mapped_column(primary_key=True)

    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    birthdate: Mapped[date | None] = mapped_column(Date, nullable=True)
    conditions: Mapped[str | None] = mapped_column(Text, nullable=True)

    emergency_contact_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)

    team_members = relationship("CareTeam", back_populates="senior", cascade="all, delete-orphan")


class CareTeam(TimestampMixin, Base):
    __tablename__ = "care_team"
    __table_args__ = (
        UniqueConstraint("senior_id", "user_id", name="uq_care_team_senior_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    senior_id: Mapped[int] = mapped_column(ForeignKey("seniors.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    membership_role: Mapped[MembershipRole] = mapped_column(Enum(MembershipRole), nullable=False)

    # permisos simples (luego puedes hacer algo más granular)
    can_view: Mapped[bool] = mapped_column(default=True, nullable=False)
    can_edit: Mapped[bool] = mapped_column(default=False, nullable=False)

    senior = relationship("SeniorProfile", back_populates="team_members")
    user = relationship("User")  # referencia simple (sin back_populates por ahora)

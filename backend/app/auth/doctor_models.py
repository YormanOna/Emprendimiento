# app/auth/doctor_models.py
from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.models import Base, TimestampMixin


class DoctorProfile(TimestampMixin, Base):
    __tablename__ = "doctor_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    license_id: Mapped[str] = mapped_column(String(80), nullable=True)
    specialty: Mapped[str] = mapped_column(String(120), nullable=True)

    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="doctor_profile")

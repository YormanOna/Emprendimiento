from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, String, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import Base, TimestampMixin

def utcnow():
    return datetime.now(timezone.utc)

class RefreshToken(TimestampMixin, Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = (UniqueConstraint("token", name="uq_refresh_tokens_token"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)

    token: Mapped[str] = mapped_column(String(1024), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

# app/core/deps.py
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.auth.models import User
from app.core.models import UserRole
from app.seniors.models import CareTeam

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    res = await db.execute(select(User).where(User.id == int(user_id)))
    user = res.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive or not found")
    return user


def require_roles(*roles: UserRole):
    async def _guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return _guard


async def require_senior_access(
    senior_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    if user.role == UserRole.ADMIN:
        return

    res = await db.execute(
        select(CareTeam).where(CareTeam.senior_id == senior_id, CareTeam.user_id == user.id)
    )
    member = res.scalar_one_or_none()
    if not member or not member.can_view:
        raise HTTPException(status_code=403, detail="No access to this senior")


async def require_senior_edit(
    senior_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    if user.role == UserRole.ADMIN:
        return

    res = await db.execute(
        select(CareTeam).where(CareTeam.senior_id == senior_id, CareTeam.user_id == user.id)
    )
    member = res.scalar_one_or_none()
    if not member or not member.can_edit:
        raise HTTPException(status_code=403, detail="No edit permission for this senior")

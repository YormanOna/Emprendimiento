# app/seniors/service.py
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.seniors.models import SeniorProfile, CareTeam
from app.auth.models import User


async def create_senior(db: AsyncSession, payload: dict) -> SeniorProfile:
    senior = SeniorProfile(**payload)
    db.add(senior)
    await db.flush()
    return senior


async def add_team_member(db: AsyncSession, senior_id: int, payload: dict) -> CareTeam:
    # valida senior existe
    sres = await db.execute(select(SeniorProfile).where(SeniorProfile.id == senior_id))
    senior = sres.scalar_one_or_none()
    if not senior:
        raise HTTPException(status_code=404, detail="Senior not found")

    ures = await db.execute(select(User).where(User.id == payload["user_id"]))
    user = ures.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # evita duplicados
    cres = await db.execute(select(CareTeam).where(CareTeam.senior_id == senior_id, CareTeam.user_id == payload["user_id"]))
    if cres.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Member already assigned")

    member = CareTeam(senior_id=senior_id, **payload)
    db.add(member)
    await db.flush()
    return member


async def get_senior(db: AsyncSession, senior_id: int) -> SeniorProfile | None:
    res = await db.execute(select(SeniorProfile).where(SeniorProfile.id == senior_id))
    return res.scalar_one_or_none()


async def list_team(db: AsyncSession, senior_id: int) -> list[dict]:
    """Listar miembros del equipo con información del usuario"""
    from sqlalchemy.orm import selectinload
    
    res = await db.execute(
        select(CareTeam)
        .where(CareTeam.senior_id == senior_id)
        .options(selectinload(CareTeam.user))
    )
    members = res.scalars().all()
    
    result = []
    for member in members:
        result.append({
            "id": member.id,
            "senior_id": member.senior_id,
            "user_id": member.user_id,
            "user_name": member.user.full_name if member.user else "Desconocido",
            "user_email": member.user.email if member.user else "",
            "user_role": member.user.role.value if member.user else "",
            "membership_role": member.membership_role.value,
            "can_view": member.can_view,
            "can_edit": member.can_edit,
            "added_at": member.created_at.isoformat(),
        })
    
    return result

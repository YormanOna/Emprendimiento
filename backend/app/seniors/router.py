# app/seniors/router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
# from app.core.deps import get_current_user, require_senior_access, require_senior_edit
from app.core.models import UserRole
from app.seniors.schemas import (
    SeniorCreate, SeniorPublic, CareTeamAdd, CareTeamMemberPublic
)
from app.seniors.service import create_senior, add_team_member, get_senior, list_team

router = APIRouter()


@router.get("/", response_model=list[SeniorPublic])
async def list_seniors_endpoint(db: AsyncSession = Depends(get_db)):
    """Listar todos los adultos mayores"""
    from sqlalchemy import select
    from app.seniors.models import SeniorProfile
    result = await db.execute(select(SeniorProfile).order_by(SeniorProfile.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=SeniorPublic)
async def create_senior_endpoint(
    payload: SeniorCreate,
    db: AsyncSession = Depends(get_db),
):
    # Autenticación deshabilitada temporalmente

    senior = await create_senior(db, payload.model_dump())
    await db.commit()
    await db.refresh(senior)
    return senior


@router.get("/{senior_id}", response_model=SeniorPublic)
async def get_senior_endpoint(
    senior_id: int,
    db: AsyncSession = Depends(get_db),
    # _=Depends(require_senior_access),  # Autenticación deshabilitada temporalmente
):
    senior = await get_senior(db, senior_id)
    if not senior:
        raise HTTPException(status_code=404, detail="Senior not found")
    return senior


@router.get("/{senior_id}/team", response_model=list[CareTeamMemberPublic])
async def get_team_endpoint(
    senior_id: int,
    db: AsyncSession = Depends(get_db),
    # _=Depends(require_senior_access),  # Autenticación deshabilitada temporalmente
):
    return await list_team(db, senior_id)


@router.post("/{senior_id}/team", response_model=CareTeamMemberPublic)
async def add_team_member_endpoint(
    senior_id: int,
    payload: CareTeamAdd,
    db: AsyncSession = Depends(get_db),
    # _=Depends(require_senior_edit),  # Autenticación deshabilitada temporalmente
):
    member = await add_team_member(db, senior_id, payload.model_dump())
    await db.commit()
    await db.refresh(member)
    return member

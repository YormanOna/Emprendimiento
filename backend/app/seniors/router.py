# app/seniors/router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user
# from app.core.deps import require_senior_access, require_senior_edit
from app.core.models import UserRole
from app.auth.models import User
from app.seniors.schemas import (
    SeniorCreate, SeniorPublic, CareTeamAdd, CareTeamMemberPublic
)
from app.seniors.service import create_senior, add_team_member, get_senior, list_team

router = APIRouter()


@router.get("/", response_model=list[SeniorPublic])
async def list_seniors_endpoint(
    db: AsyncSession = Depends(get_db),
    user_id: int | None = None
):
    """
    Listar adultos mayores.
    Si user_id se proporciona, filtra solo los seniors asignados a ese usuario.
    """
    from sqlalchemy import select
    from app.seniors.models import SeniorProfile, CareTeam
    
    if user_id:
        # Obtener solo los seniors asignados al usuario (sin duplicados)
        result = await db.execute(
            select(SeniorProfile)
            .join(CareTeam, CareTeam.senior_id == SeniorProfile.id)
            .where(CareTeam.user_id == user_id)
            .distinct()
            .order_by(SeniorProfile.created_at.desc())
        )
    else:
        # Obtener todos los seniors
        result = await db.execute(
            select(SeniorProfile).order_by(SeniorProfile.created_at.desc())
        )
    
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


@router.get("/my-relations/all")
async def get_my_relations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Obtener todas las relaciones del usuario actual (seniors que cuida/monitorea)"""
    from sqlalchemy import select
    from app.seniors.models import CareTeam, SeniorProfile
    from sqlalchemy.orm import selectinload
    
    # Filtrar solo las relaciones del usuario actual
    result = await db.execute(
        select(CareTeam)
        .where(CareTeam.user_id == user.id)
        .options(selectinload(CareTeam.senior), selectinload(CareTeam.user))
        .order_by(CareTeam.created_at.desc())
    )
    relations = result.scalars().all()
    
    return [{
        "id": rel.id,
        "senior_id": rel.senior_id,
        "senior_name": rel.senior.full_name if rel.senior else "Desconocido",
        "user_id": rel.user_id,
        "user_name": rel.user.full_name if rel.user else "Desconocido",
        "membership_role": rel.membership_role.value,
        "can_view": rel.can_view,
        "can_edit": rel.can_edit,
    } for rel in relations]


@router.post("/{senior_id}/team", response_model=CareTeamMemberPublic)
async def add_team_member_endpoint(
    senior_id: int,
    payload: CareTeamAdd,
    db: AsyncSession = Depends(get_db),
    # _=Depends(require_senior_edit),  # Autenticación deshabilitada temporalmente
):
    from sqlalchemy.orm import selectinload
    from app.seniors.models import CareTeam
    
    member = await add_team_member(db, senior_id, payload.model_dump())
    await db.commit()
    
    # Recargar el miembro con la relación del usuario
    result = await db.execute(
        select(CareTeam)
        .where(CareTeam.id == member.id)
        .options(selectinload(CareTeam.user))
    )
    member = result.scalar_one()
    
    # Construir respuesta con todos los campos requeridos
    return {
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
    }


@router.delete("/{senior_id}/team/{member_id}")
async def remove_team_member_endpoint(
    senior_id: int,
    member_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Eliminar un miembro del equipo de cuidado"""
    from sqlalchemy import select, delete
    from app.seniors.models import CareTeam
    
    result = await db.execute(
        select(CareTeam).where(
            CareTeam.id == member_id,
            CareTeam.senior_id == senior_id
        )
    )
    member = result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(status_code=404, detail="Relación no encontrada")
    
    await db.execute(
        delete(CareTeam).where(CareTeam.id == member_id)
    )
    await db.commit()
    
    return {"message": "Relación eliminada exitosamente"}

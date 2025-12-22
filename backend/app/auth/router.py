# app/auth/router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.auth.models import User
from app.auth.schemas import (
    RegisterRequest, RegisterDoctorRequest, LoginRequest,
    UserPublic, DoctorProfilePublic, TokenPair, RefreshRequest, LogoutRequest
)
from app.auth.service import register_user, register_doctor, authenticate, refresh_tokens, logout_stateless, store_refresh_token, revoke_refresh_token
from app.core.models import UserRole

router = APIRouter()


@router.post("/register", response_model=UserPublic)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Si rol DOCTOR, fuerza usar /register-doctor para dejarlo pending
    if payload.role == UserRole.DOCTOR:
        raise HTTPException(
            status_code=400,
            detail="Los doctores deben registrarse usando /register-doctor"
        )
    user = await register_user(db, payload.full_name, payload.email, payload.password, payload.role)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/register-doctor")
async def register_doctor_endpoint(payload: RegisterDoctorRequest, db: AsyncSession = Depends(get_db)):
    user, prof = await register_doctor(db, payload.full_name, payload.email, payload.password, payload.license_id, payload.specialty)
    await db.commit()
    await db.refresh(user)
    await db.refresh(prof)
    return {"user": UserPublic.model_validate(user), "doctor_profile": DoctorProfilePublic.model_validate(prof)}


@router.post("/auth/login", response_model=TokenPair)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user, access, refresh = await authenticate(db, payload.email, payload.password)
    await store_refresh_token(db, user.id, refresh)
    await db.commit()
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/auth/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    access, refresh = await refresh_tokens(db, payload.refresh_token)
    await db.commit()
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/auth/logout")
async def logout(payload: LogoutRequest, db: AsyncSession = Depends(get_db)):
    if payload.refresh_token:
        await revoke_refresh_token(db, payload.refresh_token)
        await db.commit()
    return {"ok": True}


@router.get("/me", response_model=UserPublic)
async def get_current_user_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener datos del usuario autenticado actual"""
    from sqlalchemy import select
    from app.seniors.models import CareTeam
    from app.core.models import UserRole
    
    # Si es un usuario SENIOR, buscar el senior_id en care_team
    senior_id = None
    if user.role == UserRole.SENIOR:
        # Buscar en care_team si este usuario está asociado a algún senior
        result = await db.execute(
            select(CareTeam.senior_id).where(CareTeam.user_id == user.id).limit(1)
        )
        senior_id = result.scalar_one_or_none()
    
    # Crear respuesta con senior_id si aplica
    return UserPublic(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        senior_id=senior_id
    )


@router.get("/users", response_model=list[UserPublic])
async def get_all_users(db: AsyncSession = Depends(get_db)):
    """Obtener todos los usuarios del sistema"""
    from sqlalchemy import select
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return users


@router.get("/users/search", response_model=list[UserPublic])
async def search_users(
    q: str,
    role: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """Buscar usuarios por nombre o email"""
    from sqlalchemy import select, or_
    from app.core.models import UserRole
    from app.seniors.models import CareTeam, MembershipRole
    from sqlalchemy.orm import selectinload
    
    query = select(User).where(
        or_(
            User.full_name.ilike(f"%{q}%"),
            User.email.ilike(f"%{q}%")
        )
    )
    
    if role:
        try:
            user_role = UserRole(role)
            query = query.where(User.role == user_role)
        except ValueError:
            pass
    
    result = await db.execute(query.order_by(User.created_at.desc()).limit(20))
    users = result.scalars().all()
    
    # Si buscamos SENIOR, agregar el senior_id desde care_team
    if role and role.upper() == 'SENIOR':
        user_list = []
        for user in users:
            # Buscar el senior_id en care_team con membership_role='SELF'
            care_result = await db.execute(
                select(CareTeam)
                .where(CareTeam.user_id == user.id)
                .where(CareTeam.membership_role == MembershipRole.SELF)
            )
            care_team = care_result.scalar_one_or_none()
            
            # Crear un dict con los datos del usuario y el senior_id
            user_dict = {
                'id': user.id,
                'full_name': user.full_name,
                'email': user.email,
                'role': user.role,
                'is_active': user.is_active,
                'senior_id': care_team.senior_id if care_team else None
            }
            user_list.append(UserPublic(**user_dict))
        return user_list
    
    return users


@router.put("/users/{user_id}", response_model=UserPublic)
async def update_user(user_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    """Actualizar un usuario"""
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if "full_name" in payload:
        user.full_name = payload["full_name"]
    if "email" in payload:
        user.email = payload["email"]
    if "role" in payload:
        user.role = payload["role"]
    if "is_active" in payload:
        user.is_active = payload["is_active"]
    
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """Eliminar un usuario"""
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    await db.delete(user)
    await db.commit()
    return {"ok": True, "message": "Usuario eliminado correctamente"}

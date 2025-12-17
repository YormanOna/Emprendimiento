# app/auth/service.py
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.auth.doctor_models import DoctorProfile
from app.core.models import UserRole
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token





from datetime import datetime, timedelta, timezone

from app.auth.token_models import RefreshToken
from app.core.config import settings


async def register_user(db: AsyncSession, full_name: str, email: str, password: str, role: UserRole) -> User:
    res = await db.execute(select(User).where(User.email == email))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )
    db.add(user)
    await db.flush()  # obtiene user.id
    
    # Si es un SENIOR, crear automáticamente su perfil de senior
    if role == UserRole.SENIOR:
        from app.seniors.models import SeniorProfile, CareTeam, MembershipRole
        
        # Crear perfil de senior
        senior_profile = SeniorProfile(
            full_name=full_name,
            birthdate=None,
            conditions=None,
            emergency_contact_name=None,
            emergency_contact_phone=None
        )
        db.add(senior_profile)
        await db.flush()  # obtiene senior_profile.id
        
        # Crear entrada en care_team para vincular usuario con su perfil
        care_team = CareTeam(
            senior_id=senior_profile.id,
            user_id=user.id,
            membership_role=MembershipRole.SELF,  # El senior es él mismo
            can_view=True,
            can_edit=True
        )
        db.add(care_team)
    
    return user


async def register_doctor(db: AsyncSession, full_name: str, email: str, password: str, license_id: str | None, specialty: str | None):
    user = await register_user(db, full_name, email, password, UserRole.DOCTOR)

    prof = DoctorProfile(
        user_id=user.id,
        license_id=license_id,
        specialty=specialty,
        verified=False,  # luego admin puede verificar
    )
    db.add(prof)
    return user, prof


async def authenticate(db: AsyncSession, email: str, password: str):
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access = create_access_token(subject=str(user.id), extra_claims={"role": user.role.value})
    refresh = create_refresh_token(subject=str(user.id))
    return user, access, refresh




def utcnow():
    return datetime.now(timezone.utc)

async def store_refresh_token(db: AsyncSession, user_id: int, token: str) -> RefreshToken:
    # exp viene del claim exp del JWT (pero lo calculamos igual)
    expires_at = utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    rt = RefreshToken(user_id=user_id, token=token, expires_at=expires_at)
    db.add(rt)
    await db.flush()
    return rt

async def revoke_refresh_token(db: AsyncSession, token: str):
    res = await db.execute(select(RefreshToken).where(RefreshToken.token == token))
    rt = res.scalar_one_or_none()
    if not rt:
        return
    rt.revoked = True
    rt.revoked_at = utcnow()
    await db.flush()

async def refresh_tokens(db: AsyncSession, refresh_token: str):
    # 1) valida firma/exp del JWT refresh
    try:
        payload = decode_token(refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = int(payload.get("sub") or 0)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # 2) valida que el refresh exista y no esté revocado
    res = await db.execute(select(RefreshToken).where(RefreshToken.token == refresh_token))
    rt = res.scalar_one_or_none()
    if not rt or rt.revoked:
        raise HTTPException(status_code=401, detail="Refresh token revoked or not found")

    # (opcional) también valida expires_at (además del exp del JWT)
    if rt.expires_at < utcnow():
        raise HTTPException(status_code=401, detail="Refresh token expired")

    # 3) rota: revoca el refresh viejo y crea uno nuevo
    await revoke_refresh_token(db, refresh_token)

    ures = await db.execute(select(User).where(User.id == user_id))
    user = ures.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive or not found")

    access = create_access_token(subject=str(user.id), extra_claims={"role": user.role.value})
    new_refresh = create_refresh_token(subject=str(user.id))
    await store_refresh_token(db, user.id, new_refresh)

    return access, new_refresh

async def logout_stateless():
    # JWT stateless: el backend no puede invalidar tokens sin tabla/redis.
    # Esta función es un placeholder. El logout real revoca el refresh_token
    # usando revoke_refresh_token(db, token).
    return
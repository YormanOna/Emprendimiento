# app/auth/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from app.core.models import UserRole


class UserPublic(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True


class DoctorProfilePublic(BaseModel):
    license_id: Optional[str] = None
    specialty: Optional[str] = None
    verified: bool

    class Config:
        from_attributes = True


class RegisterRequest(BaseModel):
    full_name: str = Field(
        min_length=2,
        max_length=120,
        description="Nombre completo del usuario",
        examples=["Juan Pérez"]
    )
    email: EmailStr = Field(description="Email válido", examples=["usuario@ejemplo.com"])
    password: str = Field(
        min_length=8,
        max_length=128,
        description="Contraseña de al menos 8 caracteres",
        examples=["MiContraseña123"]
    )

    # Para registro general: cuidador/familiar/senior
    role: UserRole = Field(description="Rol del usuario en el sistema")


class RegisterDoctorRequest(BaseModel):
    full_name: str = Field(
        min_length=2,
        max_length=120,
        description="Nombre completo del doctor"
    )
    email: EmailStr = Field(description="Email profesional")
    password: str = Field(
        min_length=8,
        max_length=128,
        description="Contraseña segura"
    )

    license_id: Optional[str] = Field(
        None,
        max_length=50,
        description="Número de licencia médica",
        examples=["MED-12345"]
    )
    specialty: Optional[str] = Field(
        None,
        max_length=100,
        description="Especialidad médica",
        examples=["Geriatría", "Medicina General"]
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

from pydantic import BaseModel


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str | None = None

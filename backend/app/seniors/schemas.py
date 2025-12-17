# app/seniors/schemas.py
from datetime import date
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import re

from app.core.models import MembershipRole


class SeniorCreate(BaseModel):
    full_name: str = Field(
        min_length=2,
        max_length=120,
        description="Nombre completo del adulto mayor"
    )
    birthdate: Optional[date] = Field(
        None,
        description="Fecha de nacimiento"
    )
    conditions: Optional[str] = Field(
        None,
        max_length=1000,
        description="Condiciones médicas o alergias"
    )
    emergency_contact_name: Optional[str] = Field(
        None,
        max_length=120,
        description="Nombre del contacto de emergencia"
    )
    emergency_contact_phone: Optional[str] = Field(
        None,
        max_length=20,
        description="Teléfono de emergencia"
    )

    @field_validator("birthdate")
    @classmethod
    def validate_birthdate(cls, v):
        if v and v > date.today():
            raise ValueError("La fecha de nacimiento no puede ser en el futuro")
        if v and (date.today().year - v.year) > 150:
            raise ValueError("La fecha de nacimiento no es válida")
        return v

    @field_validator("emergency_contact_phone")
    @classmethod
    def validate_phone(cls, v):
        if v and not re.match(r'^[\d\s\-\+\(\)]+$', v):
            raise ValueError("El teléfono solo puede contener números, espacios, +, -, ( y )")
        return v


class SeniorUpdate(BaseModel):
    full_name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=120,
        description="Nombre completo"
    )
    birthdate: Optional[date] = Field(None, description="Fecha de nacimiento")
    conditions: Optional[str] = Field(None, max_length=1000)
    emergency_contact_name: Optional[str] = Field(None, max_length=120)
    emergency_contact_phone: Optional[str] = Field(None, max_length=20)

    @field_validator("birthdate")
    @classmethod
    def validate_birthdate(cls, v):
        if v and v > date.today():
            raise ValueError("La fecha de nacimiento no puede ser en el futuro")
        return v

    @field_validator("emergency_contact_phone")
    @classmethod
    def validate_phone(cls, v):
        if v and not re.match(r'^[\d\s\-\+\(\)]+$', v):
            raise ValueError("El teléfono solo puede contener números, espacios, +, -, ( y )")
        return v


class SeniorPublic(BaseModel):
    id: int
    full_name: str
    birthdate: Optional[date] = None
    conditions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

    class Config:
        from_attributes = True


class CareTeamAdd(BaseModel):
    user_id: int = Field(gt=0, description="ID del usuario a agregar al equipo")
    membership_role: MembershipRole = Field(description="Rol en el equipo de cuidado")
    can_view: bool = Field(True, description="Puede ver información del adulto mayor")
    can_edit: bool = Field(False, description="Puede editar información del adulto mayor")

    @field_validator("can_edit")
    @classmethod
    def validate_permissions(cls, v, info):
        # Si puede editar, debe poder ver
        if v and not info.data.get("can_view", True):
            raise ValueError("Para tener permisos de edición, debe tener permisos de visualización")
        return v


class CareTeamMemberPublic(BaseModel):
    id: int
    senior_id: int
    user_id: int
    membership_role: MembershipRole
    can_view: bool
    can_edit: bool

    class Config:
        from_attributes = True


class SeniorWithTeam(BaseModel):
    senior: SeniorPublic
    team: List[CareTeamMemberPublic]

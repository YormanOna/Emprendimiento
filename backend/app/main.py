# app/main.py
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.core.database import engine, AsyncSessionLocal
from app.core.models import Base, UserRole
from app.core.security import hash_password

from app.auth.router import router as auth_router
from app.seniors.router import router as seniors_router
from app.meds.router import router as meds_router
from app.reminders.router import router as reminders_router
from app.appointments.router import router as appointments_router
from app.chat.router import router as chat_router
from app.stats_reports.router import router as stats_router
from app.chat.websocket import conversations_ws

# Importar todos los modelos para que SQLAlchemy los registre
from app.auth.models import User
from app.auth.doctor_models import DoctorProfile
from app.auth.token_models import RefreshToken
from app.seniors.models import SeniorProfile, CareTeam
from app.meds.models import Medication, MedicationSchedule, IntakeLog
from app.reminders.models import Reminder
from app.appointments.models import Appointment, AppointmentNote
from app.chat.models import Conversation, Message
from app.stats_reports.models import ReportJob
from app.audit.models import AuditLog

app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG)


async def create_default_users():
    """Crear usuarios por defecto si no existen"""
    async with AsyncSessionLocal() as db:
        # Verificar si ya existen usuarios
        result = await db.execute(select(User).limit(1))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print("⏭️  Usuarios ya existen, omitiendo creación de usuarios por defecto")
            return
        
        # Usuarios por defecto
        default_users = [
            {
                "full_name": "Admin Sistema",
                "email": "admin@cuidado.com",
                "password": "admin123456",
                "role": UserRole.ADMIN,
                "is_active": True,
            },
            {
                "full_name": "María García",
                "email": "familia@cuidado.com",
                "password": "familia123",
                "role": UserRole.FAMILY,
                "is_active": True,
            },
            {
                "full_name": "Carlos Ramírez",
                "email": "cuidador@cuidado.com",
                "password": "cuidador123",
                "role": UserRole.CAREGIVER,
                "is_active": True,
            },
            {
                "full_name": "Rosa Martínez",
                "email": "senior@cuidado.com",
                "password": "senior123",
                "role": UserRole.SENIOR,
                "is_active": True,
            },
        ]
        
        for user_data in default_users:
            user = User(
                full_name=user_data["full_name"],
                email=user_data["email"],
                password_hash=hash_password(user_data["password"]),
                role=user_data["role"],
                is_active=user_data["is_active"],
            )
            db.add(user)
        
        await db.commit()
        print(f"✅ Se crearon {len(default_users)} usuarios por defecto:")
        for user_data in default_users:
            print(f"   - {user_data['email']} ({user_data['role'].value})")
        
        # Crear seniors de ejemplo
        from app.seniors.models import SeniorProfile
        from datetime import date
        
        default_seniors = [
            {
                "full_name": "Rosa Martínez",
                "birthdate": date(1950, 5, 15),
                "conditions": "Diabetes tipo 2, Hipertensión",
                "emergency_contact_name": "María García",
                "emergency_contact_phone": "555-0102",
            },
            {
                "full_name": "Juan López",
                "birthdate": date(1948, 8, 20),
                "conditions": "Artritis, Problemas cardiacos",
                "emergency_contact_name": "Carlos Ramírez",
                "emergency_contact_phone": "555-0202",
            },
        ]
        
        for senior_data in default_seniors:
            senior = SeniorProfile(**senior_data)
            db.add(senior)
        
        await db.commit()
        print(f"✅ Se crearon {len(default_seniors)} seniors de ejemplo")


@app.on_event("startup")
async def startup_event():
    """Crear tablas automáticamente al iniciar el servidor"""
    async with engine.begin() as conn:
        # Crear tablas si no existen (no borra datos existentes)
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tablas de base de datos verificadas/creadas")
    
    # Crear usuarios por defecto
    await create_default_users()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routers
app.include_router(auth_router, prefix=f"{settings.API_V1_PREFIX}", tags=["auth"])
app.include_router(seniors_router, prefix=f"{settings.API_V1_PREFIX}/seniors", tags=["seniors"])
app.include_router(meds_router, prefix=f"{settings.API_V1_PREFIX}/meds", tags=["meds"])
app.include_router(reminders_router, prefix=f"{settings.API_V1_PREFIX}/reminders", tags=["reminders"])
app.include_router(appointments_router, prefix=f"{settings.API_V1_PREFIX}/appointments", tags=["appointments"])
app.include_router(chat_router, prefix=f"{settings.API_V1_PREFIX}/chat", tags=["chat"])
app.include_router(stats_router, prefix=f"{settings.API_V1_PREFIX}/stats", tags=["stats-reports"])

# WS (ruta exacta pedida)
@app.websocket("/ws/conversations/{conversation_id}")
async def ws_conversation(conversation_id: int, websocket: WebSocket):
    await conversations_ws(websocket, conversation_id)

#!/usr/bin/env python3
"""
Script para crear todas las tablas en la base de datos.
Ejecuta: python init_db.py
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

# Fix para Windows
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Importar TODOS los modelos para que SQLAlchemy los registre
from app.core.models import Base
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


async def init_db():
    print("=" * 70)
    print("INICIALIZANDO BASE DE DATOS")
    print("=" * 70)
    print(f"\nConectando a: {settings.DATABASE_URL}")
    print()
    
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        print("\n🗑️  Eliminando tablas existentes...")
        await conn.run_sync(Base.metadata.drop_all)
        
        print("\n✨ Creando todas las tablas...")
        await conn.run_sync(Base.metadata.create_all)
    
    await engine.dispose()
    
    print("\n" + "=" * 70)
    print("✅ BASE DE DATOS INICIALIZADA EXITOSAMENTE")
    print("=" * 70)
    print("\nTablas creadas:")
    print("  ✓ users")
    print("  ✓ doctor_profiles")
    print("  ✓ refresh_tokens")
    print("  ✓ seniors")
    print("  ✓ care_team")
    print("  ✓ medications")
    print("  ✓ medication_schedules")
    print("  ✓ intake_logs")
    print("  ✓ reminders")
    print("  ✓ appointments")
    print("  ✓ appointment_notes")
    print("  ✓ conversations")
    print("  ✓ messages")
    print("  ✓ report_jobs")
    print("  ✓ audit_logs")
    print()


if __name__ == "__main__":
    asyncio.run(init_db())

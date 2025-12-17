#!/usr/bin/env python3
"""
Script de validación rápida: importa todos los módulos para detectar errores
sin necesidad de levantar el servidor.
"""
import sys
import traceback

def test_import(module_path: str) -> bool:
    try:
        __import__(module_path)
        print(f"✅ {module_path}")
        return True
    except Exception as e:
        print(f"❌ {module_path}: {str(e)}")
        traceback.print_exc()
        return False

modules_to_test = [
    # Core
    "app.core.config",
    "app.core.models",
    "app.core.security",
    "app.core.database",
    "app.core.deps",
    
    # Auth
    "app.auth.models",
    "app.auth.doctor_models",
    "app.auth.token_models",
    "app.auth.schemas",
    "app.auth.service",
    "app.auth.router",
    
    # Seniors
    "app.seniors.models",
    "app.seniors.schemas",
    "app.seniors.service",
    "app.seniors.router",
    
    # Meds
    "app.meds.models",
    "app.meds.schemas",
    "app.meds.service",
    "app.meds.router",
    
    # Reminders
    "app.reminders.models",
    "app.reminders.schemas",
    "app.reminders.service",
    "app.reminders.router",
    
    # Appointments
    "app.appointments.models",
    "app.appointments.schemas",
    "app.appointments.service",
    "app.appointments.router",
    
    # Chat
    "app.chat.models",
    "app.chat.schemas",
    "app.chat.service",
    "app.chat.router",
    "app.chat.websocket",
    
    # Stats
    "app.stats_reports.models",
    "app.stats_reports.schemas",
    "app.stats_reports.service",
    "app.stats_reports.router",
    
    # Audit
    "app.audit.models",
    "app.audit.service",
    
    # Main
    "app.main",
]

print("=" * 60)
print("VALIDACIÓN DE IMPORTS")
print("=" * 60)

passed = 0
failed = 0

for module in modules_to_test:
    if test_import(module):
        passed += 1
    else:
        failed += 1

print("=" * 60)
print(f"Resultado: {passed} ✅ | {failed} ❌")
print("=" * 60)

sys.exit(0 if failed == 0 else 1)

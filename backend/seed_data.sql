-- Script SQL para insertar datos de prueba
-- Ejecutar después de crear las tablas
-- Los usuarios ya fueron creados al iniciar el servidor

USE cuidado_adulto_mayor;

-- =============================================
-- SENIORS (Adultos Mayores)
-- =============================================
INSERT INTO seniors (full_name, birthdate, conditions, emergency_contact_name, emergency_contact_phone, created_at, updated_at) VALUES
('Carmen López Martínez', '1945-03-15', 'Diabetes tipo 2, Hipertensión arterial', 'María López García', '+52-555-1234', NOW(), NOW()),
('Roberto García Sánchez', '1950-07-22', 'Artritis reumatoide, Colesterol alto', 'Ana García Ruiz', '+52-555-5678', NOW(), NOW()),
('Elena Rodríguez Torres', '1948-11-08', 'Alzheimer temprano, Hipertensión', 'Carlos Rodríguez Luna', '+52-555-9012', NOW(), NOW()),
('José Hernández Pérez', '1942-01-30', 'Osteoporosis, Diabetes tipo 2', 'Laura Hernández Silva', '+52-555-3456', NOW(), NOW()),
('Patricia Ramírez Cruz', '1955-09-17', 'Cardiopatía leve, Tiroides', 'Miguel Ramírez Ortiz', '+52-555-7890', NOW(), NOW());

-- =============================================
-- CARE TEAM (Equipos de cuidado)
-- =============================================
-- Asumiendo: user_id 2 = Familiar, user_id 3 = Cuidador
INSERT INTO care_team (senior_id, user_id, membership_role, can_view, can_edit, created_at, updated_at) VALUES
(1, 2, 'PRIMARY_FAMILY', 1, 1, NOW(), NOW()),
(1, 3, 'ASSIGNED_CAREGIVER', 1, 0, NOW(), NOW()),
(2, 2, 'PRIMARY_FAMILY', 1, 1, NOW(), NOW()),
(3, 3, 'ASSIGNED_CAREGIVER', 1, 1, NOW(), NOW()),
(4, 2, 'EXTENDED_FAMILY', 1, 0, NOW(), NOW());

-- =============================================
-- MEDICATIONS (Medicamentos)
-- =============================================
INSERT INTO medications (senior_id, name, dose, unit, notes, created_at, updated_at) VALUES
(1, 'Metformina', '850', 'mg', 'Tomar con alimentos para evitar molestias estomacales', NOW(), NOW()),
(1, 'Losartán', '50', 'mg', 'Para controlar la presión arterial', NOW(), NOW()),
(2, 'Metotrexato', '15', 'mg', 'Administrar una vez por semana', NOW(), NOW()),
(2, 'Atorvastatina', '20', 'mg', 'Tomar por la noche', NOW(), NOW()),
(3, 'Donepezilo', '10', 'mg', 'Para tratamiento de Alzheimer', NOW(), NOW()),
(3, 'Amlodipino', '5', 'mg', 'Para hipertensión arterial', NOW(), NOW()),
(4, 'Alendronato', '70', 'mg', 'Tomar en ayunas, esperar 30 min antes de comer', NOW(), NOW()),
(5, 'Levotiroxina', '75', 'mcg', 'Tomar 30 minutos antes del desayuno', NOW(), NOW());

-- =============================================
-- MEDICATION SCHEDULES (Horarios de medicamentos)
-- =============================================
-- JSON arrays: [8, 14, 20] = 8am, 2pm, 8pm
-- days_of_week: [1,2,3,4,5,6,7] = Lunes a Domingo
INSERT INTO medication_schedules (medication_id, start_date, end_date, hours, days_of_week, created_at, updated_at) VALUES
(1, '2025-01-01', '2025-12-31', '[8, 20]', '[1,2,3,4,5,6,7]', NOW(), NOW()),
(2, '2025-01-01', '2025-12-31', '[8]', '[1,2,3,4,5,6,7]', NOW(), NOW()),
(3, '2025-01-01', '2025-06-30', '[8]', '[1]', NOW(), NOW()),
(4, '2025-01-01', '2025-12-31', '[21]', '[1,2,3,4,5,6,7]', NOW(), NOW()),
(5, '2025-01-01', '2025-12-31', '[9]', '[1,2,3,4,5,6,7]', NOW(), NOW());

-- =============================================
-- INTAKE LOGS (Registros de tomas)
-- =============================================
INSERT INTO intake_logs (senior_id, medication_id, scheduled_at, taken_at, status, actor_user_id, created_at, updated_at) VALUES
(1, 1, '2025-12-15 08:00:00', '2025-12-15 08:15:00', 'TAKEN', 1, NOW(), NOW()),
(1, 1, '2025-12-15 20:00:00', '2025-12-15 20:05:00', 'TAKEN', 1, NOW(), NOW()),
(1, 2, '2025-12-15 08:00:00', '2025-12-15 08:15:00', 'TAKEN', 1, NOW(), NOW()),
(2, 5, '2025-12-15 09:00:00', '2025-12-15 09:30:00', 'LATE', 1, NOW(), NOW()),
(2, 4, '2025-12-14 21:00:00', NULL, 'MISSED', NULL, NOW(), NOW());

-- =============================================
-- APPOINTMENTS (Citas médicas)
-- =============================================
INSERT INTO appointments (senior_id, doctor_user_id, starts_at, location, reason, status, created_at, updated_at) VALUES
(1, 1, '2025-12-20 10:00:00', 'Hospital General - Consultorio 305', 'Revisión de control de diabetes', 'SCHEDULED', NOW(), NOW()),
(1, 1, '2025-12-18 15:30:00', 'Clínica San José - Piso 2', 'Chequeo de presión arterial', 'SCHEDULED', NOW(), NOW()),
(2, 1, '2025-12-22 09:00:00', 'Centro Médico ABC - Torre B', 'Control de artritis reumatoide', 'SCHEDULED', NOW(), NOW()),
(3, 1, '2025-12-25 11:00:00', 'Hospital Angeles - Consultorio 102', 'Evaluación neurológica', 'SCHEDULED', NOW(), NOW()),
(4, 1, '2025-12-17 14:00:00', 'Clínica del Norte - Sala 5', 'Densitometría ósea', 'COMPLETED', NOW(), NOW());

-- =============================================
-- APPOINTMENT NOTES (Notas de citas)
-- =============================================
INSERT INTO appointment_notes (appointment_id, author_user_id, note, created_at, updated_at) VALUES
(5, 1, 'Densitometría ósea muestra mejoría. Continuar con tratamiento actual de Alendronato.', NOW(), NOW()),
(5, 2, 'Paciente reporta menos dolor en articulaciones. Muy positivo.', NOW(), NOW());

-- =============================================
-- REMINDERS (Recordatorios)
-- =============================================
INSERT INTO reminders (senior_id, title, description, scheduled_at, repeat_rule, status, actor_user_id, created_at, updated_at) VALUES
(1, 'Tomar medicamento - Metformina', 'Recuerda tomar tu Metformina de 850mg', '2025-12-15 20:00:00', 'DAILY', 'PENDING', NULL, NOW(), NOW()),
(1, 'Cita médica mañana', 'Tienes cita en Clínica San José a las 15:30', '2025-12-17 09:00:00', NULL, 'PENDING', NULL, NOW(), NOW()),
(2, 'Ejercicio matutino', 'Recordatorio para hacer ejercicios de movilidad', '2025-12-16 07:00:00', 'DAILY', 'PENDING', NULL, NOW(), NOW()),
(3, 'Revisión de medicamentos', 'Verificar existencias de medicamentos', '2025-12-16 18:00:00', 'WEEKLY', 'PENDING', NULL, NOW(), NOW()),
(4, 'Llamada familiar', 'Llamar a Laura para actualizar estado', '2025-12-16 16:00:00', NULL, 'DONE', 1, NOW(), NOW());

-- =============================================
-- CONVERSATIONS (Conversaciones de chat)
-- =============================================
INSERT INTO conversations (senior_id, doctor_user_id, status, created_at, updated_at) VALUES
(1, 1, 'OPEN', NOW(), NOW()),
(2, 1, 'OPEN', NOW(), NOW()),
(3, 1, 'OPEN', NOW(), NOW()),
(4, 1, 'OPEN', NOW(), NOW()),
(5, 1, 'OPEN', NOW(), NOW());

-- =============================================
-- MESSAGES (Mensajes de chat)
-- =============================================
INSERT INTO messages (conversation_id, sender_user_id, content, sent_at, read_at, created_at, updated_at) VALUES
(1, 2, 'Buenos días, ¿cómo amaneció mamá hoy?', '2025-12-15 08:30:00', '2025-12-15 08:35:00', NOW(), NOW()),
(1, 3, 'Buenos días. Amaneció muy bien, ya tomó su medicamento de la mañana.', '2025-12-15 08:35:00', '2025-12-15 08:40:00', NOW(), NOW()),
(1, 2, 'Excelente, gracias por el reporte.', '2025-12-15 08:40:00', '2025-12-15 08:45:00', NOW(), NOW()),
(2, 2, 'Recordar que mañana tiene cita médica a las 9am', '2025-12-15 18:00:00', '2025-12-15 18:30:00', NOW(), NOW()),
(3, 3, 'La señora Elena estuvo un poco confundida esta mañana, pero ya está mejor.', '2025-12-15 10:00:00', NULL, NOW(), NOW());

-- Verificar datos insertados
SELECT 'Seniors insertados:', COUNT(*) FROM seniors;
SELECT 'Medicamentos insertados:', COUNT(*) FROM medications;
SELECT 'Citas insertadas:', COUNT(*) FROM appointments;
SELECT 'Recordatorios insertados:', COUNT(*) FROM reminders;
SELECT 'Conversaciones insertadas:', COUNT(*) FROM conversations;

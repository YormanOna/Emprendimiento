import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import authService, { User } from '@/services/authService';
import appointmentsService, { Appointment } from '@/services/appointmentsService';

export default function SeniorAppointmentsManageScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [newAppt, setNewAppt] = useState({
    doctor_name: '',
    specialty: '',
    location: '',
    reason: '',
    date: '',
    time: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
    
    if (userData?.senior_id) {
      const apptsData = await appointmentsService.getAppointments(userData.senior_id);
      setAppointments(apptsData);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddAppointment = async () => {
    if (!newAppt.doctor_name || !newAppt.date || !newAppt.time) {
      Alert.alert('Error', 'Por favor completa los campos requeridos');
      return;
    }

    if (!user?.senior_id) {
      Alert.alert('Error', 'No se encontró el perfil de senior');
      return;
    }

    try {
      const scheduledAt = `${newAppt.date}T${newAppt.time}:00`;
      
      await appointmentsService.createAppointment(user.senior_id, {
        doctor_name: newAppt.doctor_name,
        specialty: newAppt.specialty,
        location: newAppt.location,
        reason: newAppt.reason,
        scheduled_at: scheduledAt,
        notes: newAppt.notes,
      });

      Alert.alert('Éxito', 'Cita médica agregada correctamente');
      setModalVisible(false);
      setNewAppt({ doctor_name: '', specialty: '', location: '', reason: '', date: '', time: '', notes: '' });
      setSelectedDay(null);
      setSelectedMonth(new Date().getMonth());
      setSelectedYear(new Date().getFullYear());
      setCurrentStep(1);
      await loadData();
    } catch (error) {
      console.error('Error al agregar cita:', error);
      Alert.alert('Error', 'No se pudo agregar la cita');
    }
  };

  const handleNextStep = () => {
    // Validaciones por paso
    if (currentStep === 1) {
      if (!newAppt.doctor_name.trim()) {
        Alert.alert('Campo requerido', 'Ingresa el nombre del doctor');
        return;
      }
    } else if (currentStep === 2) {
      if (!newAppt.date || !newAppt.time) {
        Alert.alert('Campos requeridos', 'Selecciona fecha y hora');
        return;
      }
    }
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleAddAppointment();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDaySelect = (day: number) => {
    setSelectedDay(day);
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setNewAppt({ ...newAppt, date: dateStr });
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    } else {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    }
    setSelectedDay(null);
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const handleDeleteAppointment = async (apptId: number) => {
    Alert.alert(
      'Confirmar',
      '¿Estás seguro de eliminar esta cita?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await appointmentsService.deleteAppointment(apptId);
              Alert.alert('Éxito', 'Cita eliminada');
              await loadData();
            } catch (error) {
              console.error('Error al eliminar:', error);
              Alert.alert('Error', 'No se pudo eliminar la cita');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mis Citas Médicas</Text>
          <Text style={styles.headerSubtitle}>Gestiona tus consultas</Text>
        </View>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add-circle" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Lista de Citas */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {appointments.length > 0 ? (
          appointments.map((appt) => (
            <View key={appt.id} style={styles.apptCard}>
              <View style={styles.apptIcon}>
                <Ionicons name="calendar" size={28} color="#10b981" />
              </View>
              <View style={styles.apptInfo}>
                <Text style={styles.apptDoctor}>{appt.doctor_name}</Text>
                {appt.specialty && <Text style={styles.apptSpecialty}>{appt.specialty}</Text>}
                <View style={styles.apptDateTime}>
                  <Ionicons name="calendar-outline" size={14} color="#64748b" />
                  <Text style={styles.apptDate}>{formatDate(appt.starts_at || appt.scheduled_at!)}</Text>
                  <Ionicons name="time-outline" size={14} color="#64748b" style={{ marginLeft: 12 }} />
                  <Text style={styles.apptTime}>{formatTime(appt.starts_at || appt.scheduled_at!)}</Text>
                </View>
                {appt.location && (
                  <View style={styles.apptLocation}>
                    <Ionicons name="location-outline" size={14} color="#64748b" />
                    <Text style={styles.apptLocationText}>{appt.location}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteAppointment(appt.id)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No tienes citas programadas</Text>
            <Text style={styles.emptySubtext}>Presiona el botón + para agregar una</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal para Agregar Cita - Wizard */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setCurrentStep(1);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Cita Médica</Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                setCurrentStep(1);
              }}>
                <Ionicons name="close-circle" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Indicador de Progreso */}
            <View style={styles.progressContainer}>
              {[1, 2, 3, 4].map((step) => (
                <View key={step} style={styles.progressStep}>
                  <View style={[
                    styles.progressCircle,
                    currentStep >= step && styles.progressCircleActive,
                    currentStep > step && styles.progressCircleCompleted
                  ]}>
                    {currentStep > step ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : (
                      <Text style={[
                        styles.progressNumber,
                        currentStep >= step && styles.progressNumberActive
                      ]}>{step}</Text>
                    )}
                  </View>
                  {step < 4 && (
                    <View style={[
                      styles.progressLine,
                      currentStep > step && styles.progressLineActive
                    ]} />
                  )}
                </View>
              ))}
            </View>

            <ScrollView style={styles.modalForm}>
              {/* Paso 1: Doctor */}
              {currentStep === 1 && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepIconCircle}>
                    <Ionicons name="person" size={32} color="#10b981" />
                  </View>
                  <Text style={styles.stepTitle}>Información del Doctor</Text>
                  <Text style={styles.stepSubtitle}>Ingresa los datos del profesional</Text>

                  <Text style={styles.label}>Nombre del Doctor *</Text>
                  <TextInput
                    style={styles.input}
                    value={newAppt.doctor_name}
                    onChangeText={(text) => setNewAppt({ ...newAppt, doctor_name: text })}
                    placeholder="Dr. Juan Pérez"
                    autoFocus
                  />

                  <Text style={styles.label}>Especialidad</Text>
                  <TextInput
                    style={styles.input}
                    value={newAppt.specialty}
                    onChangeText={(text) => setNewAppt({ ...newAppt, specialty: text })}
                    placeholder="Cardiología, Neurología, etc."
                  />

                  {/* Especialidades comunes */}
                  <Text style={styles.label}>Especialidades Comunes:</Text>
                  <View style={styles.quickOptions}>
                    {['Medicina General', 'Cardiología', 'Neurología', 'Geriatría', 'Traumatología'].map((spec) => (
                      <TouchableOpacity
                        key={spec}
                        style={[styles.quickOption, newAppt.specialty === spec && styles.quickOptionSelected]}
                        onPress={() => setNewAppt({ ...newAppt, specialty: spec })}
                      >
                        <Text style={[styles.quickOptionText, newAppt.specialty === spec && styles.quickOptionTextSelected]}>
                          {spec}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Paso 2: Fecha y Hora */}
              {currentStep === 2 && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepIconCircle}>
                    <Ionicons name="calendar" size={32} color="#10b981" />
                  </View>
                  <Text style={styles.stepTitle}>Fecha y Hora de la Cita</Text>
                  <Text style={styles.stepSubtitle}>Selecciona cuándo será la consulta</Text>

                  {/* Selector de Mes */}
                  <View style={styles.monthSelector}>
                    <TouchableOpacity onPress={() => handleMonthChange('prev')} style={styles.monthArrow}>
                      <Ionicons name="chevron-back" size={24} color="#10b981" />
                    </TouchableOpacity>
                    <View style={styles.monthDisplay}>
                      <Text style={styles.monthText}>{monthNames[selectedMonth]} {selectedYear}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleMonthChange('next')} style={styles.monthArrow}>
                      <Ionicons name="chevron-forward" size={24} color="#10b981" />
                    </TouchableOpacity>
                  </View>

                  {/* Calendario de Días */}
                  <View style={styles.calendar}>
                    {/* Días de la semana */}
                    <View style={styles.weekDays}>
                      {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
                        <Text key={i} style={styles.weekDayText}>{day}</Text>
                      ))}
                    </View>

                    {/* Días del mes */}
                    <View style={styles.daysGrid}>
                      {/* Espacios vacíos antes del primer día */}
                      {Array.from({ length: getFirstDayOfMonth(selectedMonth, selectedYear) }).map((_, i) => (
                        <View key={`empty-${i}`} style={styles.dayCell} />
                      ))}
                      
                      {/* Días del mes */}
                      {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }).map((_, i) => {
                        const day = i + 1;
                        const today = new Date();
                        const isToday = day === today.getDate() && 
                                       selectedMonth === today.getMonth() && 
                                       selectedYear === today.getFullYear();
                        const isPast = new Date(selectedYear, selectedMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.dayCell,
                              selectedDay === day && styles.dayCellSelected,
                              isToday && styles.dayCellToday,
                              isPast && styles.dayCellPast
                            ]}
                            onPress={() => !isPast && handleDaySelect(day)}
                            disabled={isPast}
                          >
                            <Text style={[
                              styles.dayText,
                              selectedDay === day && styles.dayTextSelected,
                              isToday && styles.dayTextToday,
                              isPast && styles.dayTextPast
                            ]}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Selector de Hora */}
                  <Text style={styles.label}>Hora de la Cita *</Text>
                  <View style={styles.timeSelector}>
                    {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[styles.timeButton, newAppt.time === time && styles.timeButtonSelected]}
                        onPress={() => setNewAppt({ ...newAppt, time })}
                      >
                        <Ionicons 
                          name="time" 
                          size={20} 
                          color={newAppt.time === time ? '#fff' : '#10b981'} 
                        />
                        <Text style={[styles.timeButtonText, newAppt.time === time && styles.timeButtonTextSelected]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Hora personalizada */}
                  <Text style={styles.labelSmall}>¿Otra hora?</Text>
                  <TextInput
                    style={styles.input}
                    value={newAppt.time}
                    onChangeText={(text) => setNewAppt({ ...newAppt, time: text })}
                    placeholder="HH:MM (Ej: 14:30)"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              )}

              {/* Paso 3: Lugar y Motivo */}
              {currentStep === 3 && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepIconCircle}>
                    <Ionicons name="location" size={32} color="#10b981" />
                  </View>
                  <Text style={styles.stepTitle}>Lugar y Motivo</Text>
                  <Text style={styles.stepSubtitle}>Detalles de la consulta</Text>

                  <Text style={styles.label}>Lugar</Text>
                  <TextInput
                    style={styles.input}
                    value={newAppt.location}
                    onChangeText={(text) => setNewAppt({ ...newAppt, location: text })}
                    placeholder="Hospital o Clínica"
                  />

                  <Text style={styles.label}>Motivo de la Consulta</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={newAppt.reason}
                    onChangeText={(text) => setNewAppt({ ...newAppt, reason: text })}
                    placeholder="Ej: Control de presión, chequeo general, etc."
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              {/* Paso 4: Notas y Resumen */}
              {currentStep === 4 && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepIconCircle}>
                    <Ionicons name="document-text" size={32} color="#10b981" />
                  </View>
                  <Text style={styles.stepTitle}>Notas y Resumen</Text>
                  <Text style={styles.stepSubtitle}>Confirma la información</Text>

                  <Text style={styles.label}>Notas Adicionales</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={newAppt.notes}
                    onChangeText={(text) => setNewAppt({ ...newAppt, notes: text })}
                    placeholder="Información adicional o recordatorios"
                    multiline
                    numberOfLines={3}
                  />

                  {/* Resumen */}
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>📋 Resumen de la Cita</Text>
                    
                    <View style={styles.summaryRow}>
                      <Ionicons name="person" size={18} color="#10b981" />
                      <View style={styles.summaryInfo}>
                        <Text style={styles.summaryLabel}>Doctor</Text>
                        <Text style={styles.summaryValue}>{newAppt.doctor_name || '-'}</Text>
                      </View>
                    </View>

                    {newAppt.specialty && (
                      <View style={styles.summaryRow}>
                        <Ionicons name="medical" size={18} color="#10b981" />
                        <View style={styles.summaryInfo}>
                          <Text style={styles.summaryLabel}>Especialidad</Text>
                          <Text style={styles.summaryValue}>{newAppt.specialty}</Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.summaryRow}>
                      <Ionicons name="calendar" size={18} color="#10b981" />
                      <View style={styles.summaryInfo}>
                        <Text style={styles.summaryLabel}>Fecha y Hora</Text>
                        <Text style={styles.summaryValue}>{newAppt.date} a las {newAppt.time}</Text>
                      </View>
                    </View>

                    {newAppt.location && (
                      <View style={styles.summaryRow}>
                        <Ionicons name="location" size={18} color="#10b981" />
                        <View style={styles.summaryInfo}>
                          <Text style={styles.summaryLabel}>Lugar</Text>
                          <Text style={styles.summaryValue}>{newAppt.location}</Text>
                        </View>
                      </View>
                    )}

                    {newAppt.reason && (
                      <View style={styles.summaryRow}>
                        <Ionicons name="clipboard" size={18} color="#10b981" />
                        <View style={styles.summaryInfo}>
                          <Text style={styles.summaryLabel}>Motivo</Text>
                          <Text style={styles.summaryValue}>{newAppt.reason}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Botones de Navegación */}
            <View style={styles.wizardButtons}>
              {currentStep > 1 && (
                <TouchableOpacity style={styles.backBtn} onPress={handlePrevStep}>
                  <Ionicons name="arrow-back" size={20} color="#64748b" />
                  <Text style={styles.backBtnText}>Atrás</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.nextBtn, currentStep === 1 && styles.nextBtnFull]} 
                onPress={handleNextStep}
              >
                <Text style={styles.nextBtnText}>
                  {currentStep === 4 ? 'Guardar Cita' : 'Siguiente'}
                </Text>
                {currentStep < 4 && <Ionicons name="arrow-forward" size={20} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#10b981',
    padding: 16,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { padding: 8, marginRight: 8 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#d1fae5', marginTop: 2 },
  addButton: { padding: 4 },
  content: { flex: 1, padding: 16 },
  apptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  apptIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  apptInfo: { flex: 1 },
  apptDoctor: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  apptSpecialty: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  apptDateTime: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  apptDate: { fontSize: 13, color: '#64748b', marginLeft: 4 },
  apptTime: { fontSize: 13, color: '#64748b', marginLeft: 4 },
  apptLocation: { flexDirection: 'row', alignItems: 'center' },
  apptLocationText: { fontSize: 12, color: '#94a3b8', marginLeft: 4 },
  deleteButton: { padding: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  modalForm: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 12,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  // Wizard styles
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleActive: {
    backgroundColor: '#10b981',
  },
  progressCircleCompleted: {
    backgroundColor: '#059669',
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  progressNumberActive: {
    color: '#fff',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#059669',
  },
  stepContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  stepIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  quickOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickOptionSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#10b981',
  },
  quickOptionText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  quickOptionTextSelected: {
    color: '#059669',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryInfo: {
    marginLeft: 12,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  wizardButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    gap: 8,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  nextBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#10b981',
    gap: 8,
  },
  nextBtnFull: {
    flex: 1,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Calendar styles
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  monthArrow: {
    padding: 8,
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  calendar: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    width: 40,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  dayCellSelected: {
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 8,
  },
  dayCellPast: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#10b981',
    fontWeight: '700',
  },
  dayTextPast: {
    color: '#94a3b8',
  },
  timeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    borderWidth: 2,
    borderColor: '#10b981',
    minWidth: 90,
    justifyContent: 'center',
  },
  timeButtonSelected: {
    backgroundColor: '#10b981',
  },
  timeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#059669',
  },
  timeButtonTextSelected: {
    color: '#fff',
  },
  labelSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 8,
    marginBottom: 8,
  },
});

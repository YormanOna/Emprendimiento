// app/pages/senior/medications.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import medicationsService, { Medication, MedicationSchedule, Intake } from '@/services/medicationsService';
import remindersService, { Reminder } from '@/services/remindersService';
import authService from '@/services/authService';

type TabType = 'reminders' | 'medications' | 'intakes';

interface MedicationWithSchedule extends Medication {
  schedules: MedicationSchedule[];
  shouldTakeToday: boolean;
  todayHours: number[];
}

export default function SeniorMedicationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('reminders'); // Cambiar a reminders por defecto
  const [medications, setMedications] = useState<MedicationWithSchedule[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDayOfWeek, setCurrentDayOfWeek] = useState(0);

  useEffect(() => {
    // Calcular día de la semana actual (0=Lunes, 6=Domingo)
    const today = new Date();
    const jsDay = today.getDay(); // 0=Domingo, 1=Lunes...
    const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1; // Convertir a 0=Lunes
    setCurrentDayOfWeek(dayOfWeek);
    
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      const user = await authService.getCurrentUser();
      console.log('👤 Usuario actual:', user);
      
      if (user?.senior_id) {
        const data = await medicationsService.getMedications(user.senior_id);
        console.log('💊 Medicamentos cargados:', data);
        
        // Cargar schedules para cada medicamento
        const medsWithSchedules: MedicationWithSchedule[] = await Promise.all(
          data.map(async (med) => {
            try {
              const schedules = await medicationsService.getMedicationSchedules(med.id);
              console.log(`📅 Horarios de ${med.name}:`, schedules);
              
              // Verificar si debe tomarlo hoy
              const today = new Date();
              const jsDay = today.getDay();
              const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;
              
              console.log(`🗓️ Hoy: jsDay=${jsDay}, dayOfWeek=${dayOfWeek}`);
              
              let shouldTakeToday = false;
              let todayHours: number[] = [];
              
              schedules.forEach((schedule) => {
                console.log(`  🔍 Checking schedule days: ${schedule.days_of_week}, includes ${dayOfWeek}? ${schedule.days_of_week?.includes(dayOfWeek)}`);
                if (schedule.days_of_week && schedule.days_of_week.includes(dayOfWeek)) {
                  shouldTakeToday = true;
                  todayHours = [...todayHours, ...schedule.hours];
                }
              });
              
              console.log(`  ✅ ${med.name} shouldTakeToday: ${shouldTakeToday}, hours: ${todayHours}`);
              
              // Ordenar y eliminar duplicados
              todayHours = [...new Set(todayHours)].sort((a, b) => a - b);
              
              return {
                ...med,
                schedules,
                shouldTakeToday,
                todayHours,
              };
            } catch (error) {
              console.error(`Error cargando horarios de ${med.name}:`, error);
              return {
                ...med,
                schedules: [],
                shouldTakeToday: false,
                todayHours: [],
              };
            }
          })
        );
        
        setMedications(medsWithSchedules);
        
        // Cargar recordatorios
        const remindersData = await remindersService.getReminders(user.senior_id);
        console.log('🔔 Recordatorios cargados:', remindersData);
        setReminders(remindersData);
        
        // Cargar intakes
        const intakesData = await medicationsService.getIntakes(user.senior_id);
        console.log('📝 Intakes cargados:', intakesData);
        setIntakes(intakesData);
      }
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedications();
    setRefreshing(false);
  };

  const getDayName = () => {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return days[currentDayOfWeek];
  };

  const formatHour = (hour: number) => {
    const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${hour12}:00 ${period}`;
  };

  const isTodayReminder = (reminder: Reminder) => {
    const scheduledDate = new Date(reminder.scheduled_at);
    const today = new Date();
    return (
      scheduledDate.getDate() === today.getDate() &&
      scheduledDate.getMonth() === today.getMonth() &&
      scheduledDate.getFullYear() === today.getFullYear()
    );
  };

  const isOverdue = (reminder: Reminder) => {
    if (reminder.done_at) return false; // Ya está hecho
    const scheduledDate = new Date(reminder.scheduled_at);
    const now = new Date();
    return scheduledDate < now;
  };

  const getTodayReminders = () => {
    return reminders.filter(r => isTodayReminder(r));
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Medicamentos</Text>
          <Text style={styles.headerSubtitle}>
            {medications.length} {medications.length === 1 ? 'medicamento' : 'medicamentos'} registrados
          </Text>
          <View style={styles.todayBadge}>
            <Ionicons name="calendar" size={14} color="#8b5cf6" />
            <Text style={styles.todayText}>Hoy es {getDayName()}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.manageButton}
          onPress={() => router.push('/pages/senior/medications-manage')}
        >
          <Ionicons name="settings-outline" size={24} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reminders' && styles.activeTab]}
          onPress={() => setActiveTab('reminders')}
        >
          <Ionicons 
            name="notifications" 
            size={20} 
            color={activeTab === 'reminders' ? '#8b5cf6' : '#94a3b8'} 
          />
          <Text style={[styles.tabText, activeTab === 'reminders' && styles.activeTabText]}>
            Hoy ({getTodayReminders().length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'medications' && styles.activeTab]}
          onPress={() => setActiveTab('medications')}
        >
          <Ionicons 
            name="medical" 
            size={20} 
            color={activeTab === 'medications' ? '#8b5cf6' : '#94a3b8'} 
          />
          <Text style={[styles.tabText, activeTab === 'medications' && styles.activeTabText]}>
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'intakes' && styles.activeTab]}
          onPress={() => setActiveTab('intakes')}
        >
          <Ionicons 
            name="checkmark-circle" 
            size={20} 
            color={activeTab === 'intakes' ? '#8b5cf6' : '#94a3b8'} 
          />
          <Text style={[styles.tabText, activeTab === 'intakes' && styles.activeTabText]}>
            Registro
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido según tab activo */}
      <View style={styles.content}>
        {activeTab === 'reminders' ? (
          // Recordatorios de HOY
          getTodayReminders().length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <Ionicons name="today" size={20} color="#8b5cf6" />
                <Text style={styles.sectionTitle}>Medicamentos para hoy - {getDayName()}</Text>
              </View>
              {getTodayReminders().map((reminder) => {
                const isDone = !!reminder.done_at;
                const overdue = isOverdue(reminder);
                const scheduledDate = new Date(reminder.scheduled_at);
                
                return (
                  <View 
                    key={reminder.id} 
                    style={[
                      styles.reminderCard, 
                      isDone && styles.reminderCardDone,
                      overdue && styles.reminderCardOverdue
                    ]}
                  >
                    <View style={styles.reminderHeader}>
                      <View style={[
                        styles.reminderIcon, 
                        isDone && styles.reminderIconDone,
                        overdue && styles.reminderIconOverdue
                      ]}>
                        <Ionicons 
                          name={reminder.title.toLowerCase().includes('medicin') ? 'medical' : 'notifications'}
                          size={24} 
                          color={isDone ? '#94a3b8' : overdue ? '#ef4444' : '#8b5cf6'} 
                        />
                      </View>
                      <View style={styles.reminderContent}>
                        <Text style={[
                          styles.reminderTitle, 
                          isDone && styles.textDone,
                          overdue && styles.textOverdue
                        ]}>
                          {reminder.title}
                        </Text>
                        {reminder.description && (
                          <Text style={[
                            styles.reminderDesc, 
                            isDone && styles.textDone,
                            overdue && styles.textOverdue
                          ]}>
                            {reminder.description}
                          </Text>
                        )}
                        <View style={styles.timeRow}>
                          <Ionicons 
                            name="time" 
                            size={14} 
                            color={overdue ? '#ef4444' : '#94a3b8'} 
                          />
                          <Text style={[
                            styles.reminderTime,
                            overdue && styles.textOverdue
                          ]}>
                            {scheduledDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                          {overdue && !isDone && (
                            <View style={styles.overdueLabel}>
                              <Ionicons name="alert-circle" size={14} color="#ef4444" />
                              <Text style={styles.overdueLabelText}>Atrasado</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    {!isDone && (
                      <View style={styles.reminderActions}>
                        <TouchableOpacity
                          style={[styles.doneBtn, overdue && styles.doneBtnOverdue]}
                          onPress={async () => {
                            await remindersService.markDone(reminder.id);
                            Alert.alert('¡Completado!', `"${reminder.title}" marcado como hecho`);
                            loadMedications();
                          }}
                        >
                          <Ionicons name="checkmark" size={18} color="#fff" />
                          <Text style={styles.doneBtnText}>Marcar como tomado</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {isDone && (
                      <View style={styles.doneLabel}>
                        <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                        <Text style={styles.doneLabelText}>
                          Tomado a las {new Date(reminder.done_at!).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle" size={64} color="#10b981" />
              <Text style={styles.emptyText}>¡Todo al día!</Text>
              <Text style={styles.emptySubtext}>No tienes medicamentos programados para hoy</Text>
            </View>
          )
        ) : activeTab === 'medications' ? (
          // Lista de Medicamentos
          medications.length > 0 ? (
            <>
              {/* Medicamentos de hoy */}
              {medications.filter(m => m.shouldTakeToday).length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="notifications-circle" size={20} color="#10b981" />
                    <Text style={styles.sectionTitle}>Para tomar hoy</Text>
                  </View>
                  {medications
                    .filter(m => m.shouldTakeToday)
                    .map((med) => (
                      <TouchableOpacity 
                        key={med.id} 
                        style={[styles.medCard, styles.medCardToday]}
                        onPress={() => router.push(`/pages/senior/medication-detail?id=${med.id}`)}
                      >
                        <View style={[styles.medIcon, styles.medIconToday]}>
                          <Ionicons name="medical" size={28} color="#10b981" />
                        </View>
                        <View style={styles.medContent}>
                          <Text style={styles.medName}>{med.name}</Text>
                          <View style={styles.doseRow}>
                            <Ionicons name="flask-outline" size={16} color="#64748b" />
                            <Text style={styles.medDose}>{med.dose} {med.unit}</Text>
                          </View>
                          {med.todayHours.length > 0 && (
                            <View style={styles.hoursRow}>
                              <Ionicons name="time-outline" size={16} color="#10b981" />
                              <Text style={styles.hoursText}>
                                {med.todayHours.map(h => formatHour(h)).join(', ')}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.moreBtn}>
                          <Ionicons name="chevron-forward" size={24} color="#10b981" />
                        </View>
                      </TouchableOpacity>
                    ))}
                </>
              )}

              {/* Otros medicamentos */}
              {medications.filter(m => !m.shouldTakeToday).length > 0 && (
                <>
                  <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <Ionicons name="medical-outline" size={20} color="#94a3b8" />
                    <Text style={[styles.sectionTitle, { color: '#94a3b8' }]}>
                      No programados para hoy
                    </Text>
                  </View>
                  {medications
                    .filter(m => !m.shouldTakeToday)
                    .map((med) => (
                      <View
                        key={med.id}
                        style={[styles.medCard, styles.medCardDisabled]}
                      >
                        <View style={[styles.medIcon, styles.medIconDisabled]}>
                          <Ionicons name="medical" size={28} color="#cbd5e1" />
                        </View>
                        <View style={styles.medContent}>
                          <Text style={[styles.medName, styles.textDisabled]}>{med.name}</Text>
                          <View style={styles.doseRow}>
                            <Ionicons name="flask-outline" size={16} color="#cbd5e1" />
                            <Text style={[styles.medDose, styles.textDisabled]}>
                              {med.dose} {med.unit}
                            </Text>
                          </View>
                          <View style={styles.notTodayRow}>
                            <Ionicons name="calendar-outline" size={14} color="#cbd5e1" />
                            <Text style={styles.notTodayText}>No tomar hoy</Text>
                          </View>
                        </View>
                        <TouchableOpacity 
                          style={styles.infoBtn}
                          onPress={() => router.push(`/pages/senior/medication-detail?id=${med.id}`)}
                        >
                          <Ionicons name="information-circle-outline" size={24} color="#94a3b8" />
                        </TouchableOpacity>
                      </View>
                    ))}
                </>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No tienes medicamentos registrados</Text>
              <Text style={styles.emptySubtext}>Consulta con tu médico para agregar medicamentos</Text>
            </View>
          )
        ) : activeTab === 'intakes' ? (
          // Registro de Tomas
          intakes.length > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <Ionicons name="list" size={20} color="#8b5cf6" />
                <Text style={styles.sectionTitle}>Historial de Tomas</Text>
              </View>
              {intakes.map((intake) => {
                const scheduledDate = new Date(intake.scheduled_at);
                const takenDate = intake.taken_at ? new Date(intake.taken_at) : null;
                const medication = medications.find(m => m.id === intake.medication_id);
                
                return (
                  <View key={intake.id} style={styles.intakeCard}>
                    <View style={[
                      styles.intakeStatus,
                      intake.status === 'TAKEN' && styles.intakeStatusTaken,
                      intake.status === 'MISSED' && styles.intakeStatusMissed,
                      intake.status === 'LATE' && styles.intakeStatusLate,
                      intake.status === 'SKIPPED' && styles.intakeStatusSkipped,
                    ]}>
                      <Ionicons 
                        name={
                          intake.status === 'TAKEN' ? 'checkmark-circle' : 
                          intake.status === 'MISSED' ? 'close-circle' :
                          intake.status === 'LATE' ? 'time' :
                          'remove-circle'
                        }
                        size={20} 
                        color="#fff" 
                      />
                    </View>
                    <View style={styles.intakeContent}>
                      <Text style={styles.intakeMedName}>
                        {medication?.name || 'Medicamento'}
                      </Text>
                      <Text style={styles.intakeDose}>
                        {medication?.dose} {medication?.unit}
                      </Text>
                      <View style={styles.intakeTimeRow}>
                        <Ionicons name="calendar-outline" size={14} color="#64748b" />
                        <Text style={styles.intakeTimeText}>
                          {scheduledDate.toLocaleDateString('es-MX')} - {scheduledDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      {takenDate && (
                        <View style={styles.intakeTimeRow}>
                          <Ionicons name="checkmark-done" size={14} color="#10b981" />
                          <Text style={styles.intakeTakenText}>
                            Tomado: {takenDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.intakeBadge}>
                      <Text style={[
                        styles.intakeBadgeText,
                        intake.status === 'TAKEN' && styles.intakeBadgeTextTaken,
                        intake.status === 'MISSED' && styles.intakeBadgeTextMissed,
                        intake.status === 'LATE' && styles.intakeBadgeTextLate,
                      ]}>
                        {intake.status === 'TAKEN' ? 'Tomado' :
                         intake.status === 'MISSED' ? 'Perdido' :
                         intake.status === 'LATE' ? 'Tarde' : 
                         'Omitido'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>Sin registros aún</Text>
              <Text style={styles.emptySubtext}>
                Aquí aparecerá el historial de tus medicamentos tomados
              </Text>
            </View>
          )
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 6 },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  todayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  manageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#f3e8ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  activeTabText: {
    color: '#8b5cf6',
  },
  content: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  medCardToday: {
    borderWidth: 2,
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  medCardDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.6,
  },
  medIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medIconToday: {
    backgroundColor: '#d1fae5',
  },
  medIconDisabled: {
    backgroundColor: '#f1f5f9',
  },
  medContent: { flex: 1, marginLeft: 16 },
  medName: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 6 },
  doseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  medDose: { fontSize: 14, color: '#64748b', marginLeft: 6 },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  medNotes: { fontSize: 13, color: '#94a3b8', marginLeft: 6, flex: 1 },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  hoursText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 6,
  },
  notTodayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  notTodayText: {
    fontSize: 13,
    color: '#cbd5e1',
    marginLeft: 6,
  },
  textDisabled: {
    color: '#cbd5e1',
  },
  moreBtn: { padding: 8 },
  infoBtn: { padding: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 8, textAlign: 'center' },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  reminderCardDone: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    opacity: 0.7,
  },
  reminderCardOverdue: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reminderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderIconDone: {
    backgroundColor: '#f1f5f9',
  },
  reminderIconOverdue: {
    backgroundColor: '#fee2e2',
  },
  reminderContent: { flex: 1, marginLeft: 12 },
  reminderTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  reminderDesc: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderTime: { fontSize: 12, color: '#94a3b8', marginLeft: 4 },
  textDone: { color: '#94a3b8' },
  textOverdue: { color: '#ef4444', fontWeight: '600' },
  overdueLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  overdueLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
  reminderActions: {
    marginTop: 12,
  },
  doneBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneBtnOverdue: {
    backgroundColor: '#ef4444',
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  doneLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  doneLabelText: { color: '#10b981', fontSize: 13, fontWeight: '600' },
  // Intakes
  intakeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  intakeStatus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#94a3b8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  intakeStatusTaken: {
    backgroundColor: '#10b981',
  },
  intakeStatusMissed: {
    backgroundColor: '#ef4444',
  },
  intakeStatusLate: {
    backgroundColor: '#f59e0b',
  },
  intakeStatusSkipped: {
    backgroundColor: '#6b7280',
  },
  intakeContent: {
    flex: 1,
    marginLeft: 12,
  },
  intakeMedName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  intakeDose: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
  },
  intakeTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  intakeTimeText: {
    fontSize: 12,
    color: '#64748b',
  },
  intakeTakenText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  intakeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  intakeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  intakeBadgeTextTaken: {
    color: '#10b981',
  },
  intakeBadgeTextMissed: {
    color: '#ef4444',
  },
  intakeBadgeTextLate: {
    color: '#f59e0b',
  },
});

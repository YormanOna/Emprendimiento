// app/pages/senior/index.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import authService, { User } from '@/services/authService';
import statsService, { DashboardStats } from '@/services/statsService';
import remindersService, { Reminder } from '@/services/remindersService';

export default function SeniorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh al volver a la página
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
    
    if (userData?.senior_id) {
      const statsData = await statsService.getDashboardStats(userData.senior_id);
      setStats(statsData);

      // Cargar recordatorios y filtrar solo los de hoy
      const remindersData = await remindersService.getReminders(userData.senior_id);
      console.log('🔔 Todos los recordatorios:', remindersData);
      
      const todayReminders = remindersData.filter(r => {
        const scheduledDate = new Date(r.scheduled_at);
        const today = new Date();
        return (
          scheduledDate.getDate() === today.getDate() &&
          scheduledDate.getMonth() === today.getMonth() &&
          scheduledDate.getFullYear() === today.getFullYear()
        );
      });
      
      console.log('📅 Recordatorios de hoy:', todayReminders);
      setReminders(todayReminders.slice(0, 4)); // Máximo 4
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/login');
  };

  const getDaysInWeek = () => {
    const today = new Date();
    const week = [];
    for (let i = -3; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const formatDay = (date: Date) => {
    const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    return days[date.getDay()];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isOverdue = (reminder: Reminder) => {
    if (reminder.done_at) return false;
    const scheduledDate = new Date(reminder.scheduled_at);
    const now = new Date();
    return scheduledDate < now;
  };

  const handleMarkDone = async (reminder: Reminder) => {
    try {
      await remindersService.markDone(reminder.id);
      Alert.alert('✅ Completado', `"${reminder.title}" marcado como hecho`);
      await loadData(); // Recargar
    } catch (error) {
      console.error('Error marking reminder done:', error);
      Alert.alert('Error', 'No se pudo marcar el recordatorio');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header con saludo y logout */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>¡Hola!</Text>
          <Text style={styles.userName}>{user?.full_name || 'Usuario'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Estadísticas rápidas */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="medical" size={32} color="#8b5cf6" />
          <Text style={styles.statNumber}>{stats?.total_medications || 0}</Text>
          <Text style={styles.statLabel}>Medicinas</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="calendar" size={32} color="#10b981" />
          <Text style={styles.statNumber}>{stats?.upcoming_appointments || 0}</Text>
          <Text style={styles.statLabel}>Citas</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="notifications" size={32} color="#f59e0b" />
          <Text style={styles.statNumber}>{stats?.pending_reminders || 0}</Text>
          <Text style={styles.statLabel}>Tareas</Text>
        </View>
      </View>

      {/* Semana actual */}
      <View style={styles.weekSection}>
        <Text style={styles.weekSectionTitle}>Esta Semana</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.weekDays}>
            {getDaysInWeek().map((date, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.dayCard, isToday(date) && styles.todayCard]}
              >
                <Text style={[styles.dayName, isToday(date) && styles.todayText]}>
                  {formatDay(date)}
                </Text>
                <Text style={[styles.dayNumber, isToday(date) && styles.todayText]}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Recordatorios de hoy */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recordatorios de Hoy</Text>
          <TouchableOpacity 
            style={styles.viewAllBtn}
            onPress={() => router.push('/pages/senior/medications')}
          >
            <Text style={styles.viewAllText}>Ver todos</Text>
            <Ionicons name="chevron-forward" size={18} color="#8b5cf6" />
          </TouchableOpacity>
        </View>
        {reminders.length > 0 ? (
          reminders.map((reminder) => {
            const isDone = !!reminder.done_at;
            const overdue = isOverdue(reminder);
            const scheduledDate = new Date(reminder.scheduled_at);
            
            return (
              <TouchableOpacity 
                key={reminder.id} 
                style={[
                  styles.reminderCard,
                  isDone && styles.reminderCardDone,
                  overdue && styles.reminderCardOverdue
                ]}
                onPress={() => !isDone && handleMarkDone(reminder)}
                disabled={isDone}
              >
                <View style={styles.reminderLeft}>
                  <View style={[
                    styles.iconCircle,
                    isDone && styles.iconCircleDone,
                    overdue && styles.iconCircleOverdue
                  ]}>
                    <Ionicons 
                      name={
                        isDone ? 'checkmark-circle' :
                        reminder.title.toLowerCase().includes('medicin') ? 'medical' :
                        reminder.title.toLowerCase().includes('cita') ? 'calendar' :
                        'notifications'
                      } 
                      size={24} 
                      color={isDone ? '#10b981' : overdue ? '#ef4444' : '#8b5cf6'} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.reminderTitle,
                      isDone && styles.reminderTitleDone,
                      overdue && styles.reminderTitleOverdue
                    ]}>
                      {reminder.title}
                    </Text>
                    <View style={styles.reminderTimeRow}>
                      <Ionicons 
                        name="time" 
                        size={14} 
                        color={overdue ? '#ef4444' : '#94a3b8'} 
                      />
                      <Text style={[
                        styles.reminderTime,
                        overdue && styles.reminderTimeOverdue
                      ]}>
                        {scheduledDate.toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                      {overdue && !isDone && (
                        <View style={styles.overdueChip}>
                          <Text style={styles.overdueChipText}>Atrasado</Text>
                        </View>
                      )}
                      {isDone && (
                        <View style={styles.doneChip}>
                          <Text style={styles.doneChipText}>Tomado</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                {!isDone && (
                  <View style={styles.tapHint}>
                    <Ionicons name="hand-left-outline" size={16} color="#8b5cf6" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No hay recordatorios para hoy</Text>
          </View>
        )}
      </View>

      {/* Accesos rápidos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
        <View style={styles.quickAccessGrid}>
          <TouchableOpacity 
            style={styles.accessCard}
            onPress={() => router.push('/pages/senior/medications-manage' as any)}
          >
            <View style={[styles.accessIconContainer, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="medical" size={28} color="#8b5cf6" />
            </View>
            <Text style={styles.accessText}>Medicinas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.accessCard}
            onPress={() => router.push('/pages/senior/appointments-manage' as any)}
          >
            <View style={[styles.accessIconContainer, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="calendar" size={28} color="#10b981" />
            </View>
            <Text style={styles.accessText}>Citas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.accessCard}
            onPress={() => router.push('/pages/senior/chat' as any)}
          >
            <View style={[styles.accessIconContainer, { backgroundColor: '#fce7f3' }]}>
              <Ionicons name="chatbubbles" size={28} color="#ec4899" />
            </View>
            <Text style={styles.accessText}>Mensajes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.accessCard}
            onPress={() => router.push('/pages/senior/relations' as any)}
          >
            <View style={[styles.accessIconContainer, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="people" size={28} color="#f59e0b" />
            </View>
            <Text style={styles.accessText}>Mi Equipo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Botón de hospitales */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.hospitalButton}
          onPress={() => router.push('/pages/hospitals-map' as any)}
        >
          <View style={styles.hospitalButtonContent}>
            <View style={styles.hospitalIconContainer}>
              <Ionicons name="medical" size={28} color="#fff" />
            </View>
            <View style={styles.hospitalTextContainer}>
              <Text style={styles.hospitalButtonTitle}>Hospitales Cercanos</Text>
              <Text style={styles.hospitalButtonSubtitle}>Ver mapa de hospitales en Ecuador</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#8b5cf6',
    padding: 24,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: { fontSize: 16, color: '#e9d5ff', fontWeight: '500' },
  userName: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  logoutBtn: { padding: 8 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  weekSection: { padding: 16, paddingTop: 8 },
  weekSectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  weekDays: { flexDirection: 'row', gap: 12 },
  dayCard: { width: 70, padding: 12, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  todayCard: { backgroundColor: '#8b5cf6' },
  dayName: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 8 },
  dayNumber: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  todayText: { color: '#fff' },
  section: { padding: 16, paddingTop: 0 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: { fontSize: 14, fontWeight: '600', color: '#8b5cf6' },
  reminderCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12, 
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 2, 
    elevation: 1 
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
  reminderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f3e8ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconCircleDone: {
    backgroundColor: '#d1fae5',
  },
  iconCircleOverdue: {
    backgroundColor: '#fee2e2',
  },
  reminderTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  reminderTitleDone: {
    color: '#94a3b8',
  },
  reminderTitleOverdue: {
    color: '#ef4444',
    fontWeight: '700',
  },
  reminderTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  reminderTime: { fontSize: 13, color: '#64748b' },
  reminderTimeOverdue: {
    color: '#ef4444',
    fontWeight: '600',
  },
  overdueChip: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  overdueChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
  },
  doneChip: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  doneChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  tapHint: {
    padding: 8,
  },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#94a3b8', marginTop: 12 },
  quickAccessGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: 12,
  },
  accessCard: { 
    width: '48%',
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 16, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 4, 
    elevation: 2 
  },
  accessIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  accessText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#1e293b', 
    textAlign: 'center',
  },
  hospitalButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 32,
  },
  hospitalButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hospitalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  hospitalTextContainer: {
    flex: 1,
  },
  hospitalButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  hospitalButtonSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
});

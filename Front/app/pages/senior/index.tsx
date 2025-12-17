// app/pages/senior/index.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import authService, { User } from '@/services/authService';
import statsService, { DashboardStats } from '@/services/statsService';
import remindersService, { Reminder } from '@/services/remindersService';

export default function SeniorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
    
    if (userData) {
      const statsData = await statsService.getDashboardStats(userData.id);
      setStats(statsData);

      const remindersData = await remindersService.getReminders(userData.id);
      setReminders(remindersData.slice(0, 4));
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
            onPress={() => router.push('/pages/senior/reminders')}
          >
            <Text style={styles.viewAllText}>Ver todos</Text>
            <Ionicons name="chevron-forward" size={18} color="#8b5cf6" />
          </TouchableOpacity>
        </View>
        {reminders.length > 0 ? (
          reminders.map((reminder) => (
            <View key={reminder.id} style={styles.reminderCard}>
              <View style={styles.reminderLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons 
                    name={
                      reminder.title.toLowerCase().includes('medicin') ? 'medical' :
                      reminder.title.toLowerCase().includes('cita') ? 'calendar' :
                      'checkmark-circle'
                    } 
                    size={24} 
                    color="#8b5cf6" 
                  />
                </View>
                <View>
                  <Text style={styles.reminderTitle}>{reminder.title}</Text>
                  <Text style={styles.reminderTime}>
                    {new Date(reminder.scheduled_at).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No hay recordatorios para hoy</Text>
          </View>
        )}
      </View>

      {/* Accesos rápidos */}
      <View style={styles.quickAccess}>
        <TouchableOpacity 
          style={styles.accessCard}
          onPress={() => router.push('/pages/senior/medications-manage' as any)}
        >
          <Ionicons name="medical" size={32} color="#8b5cf6" />
          <Text style={styles.accessText}>Gestionar Medicinas</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.accessCard}
          onPress={() => router.push('/pages/senior/appointments-manage' as any)}
        >
          <Ionicons name="calendar" size={32} color="#10b981" />
          <Text style={styles.accessText}>Gestionar Citas</Text>
        </TouchableOpacity>
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
  reminderCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  reminderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f3e8ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reminderTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  reminderTime: { fontSize: 13, color: '#64748b' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#94a3b8', marginTop: 12 },
  quickAccess: { flexDirection: 'row', padding: 16, gap: 12, paddingBottom: 16 },
  accessCard: { flex: 1, backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  accessText: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginTop: 12 },
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

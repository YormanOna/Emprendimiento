// app/pages/senior/appointments.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import appointmentsService, { Appointment } from '@/services/appointmentsService';
import authService from '@/services/authService';

export default function SeniorAppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [seniorId, setSeniorId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      setSeniorId(user.senior_id || user.id);
      const data = await appointmentsService.getAppointments(user.senior_id || user.id);
      setAppointments(data);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Separar citas próximas y pasadas
  const now = new Date();
  const upcomingAppts = appointments.filter(apt => new Date(apt.starts_at) >= now);
  const pastAppts = appointments.filter(apt => new Date(apt.starts_at) < now);

  const renderAppointment = (apt: Appointment) => {
    const date = new Date(apt.starts_at);
    const isPast = date < now;
    const isToday = date.toDateString() === now.toDateString();
    
    return (
      <TouchableOpacity 
        key={apt.id} 
        style={[styles.aptCard, isPast && styles.aptCardPast]}
        onPress={() => router.push(`/pages/senior/appointment-detail?id=${apt.id}`)}
      >
        <View style={[styles.dateBox, isPast && styles.dateBoxPast]}>
          <Text style={[styles.dateDay, isPast && styles.dateDayPast]}>{date.getDate()}</Text>
          <Text style={[styles.dateMonth, isPast && styles.dateMonthPast]}>
            {date.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase()}
          </Text>
        </View>
        <View style={styles.aptInfo}>
          <View style={styles.aptHeader}>
            <Text style={[styles.aptDoctor, isPast && styles.textPast]}>
              {apt.doctor_name || 'Cita Médica'}
            </Text>
            {isToday && <View style={styles.todayBadge}><Text style={styles.todayText}>HOY</Text></View>}
          </View>
          {apt.specialty && (
            <View style={styles.specialtyRow}>
              <Ionicons name="medical" size={16} color={isPast ? '#94a3b8' : '#10b981'} />
              <Text style={[styles.aptSpecialty, isPast && styles.textPast]}>{apt.specialty}</Text>
            </View>
          )}
          {apt.reason && <Text style={[styles.aptReason, isPast && styles.textPast]}>{apt.reason}</Text>}
          <View style={styles.detailsRow}>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={16} color={isPast ? '#94a3b8' : '#64748b'} />
              <Text style={[styles.aptTime, isPast && styles.textPast]}>
                {date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {apt.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color={isPast ? '#94a3b8' : '#64748b'} />
                <Text style={[styles.aptLocation, isPast && styles.textPast]} numberOfLines={1}>
                  {apt.location}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mis Citas Médicas</Text>
          <Text style={styles.headerSubtitle}>
            {upcomingAppts.length} próxima{upcomingAppts.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.calendarBtn}
            onPress={() => router.push('/pages/senior/calendar')}
          >
            <Ionicons name="calendar-outline" size={22} color="#8b5cf6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/pages/senior/appointments-manage')}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {appointments.length > 0 ? (
        <View style={styles.content}>
          {/* Citas Próximas */}
          {upcomingAppts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                📅 Próximas Citas ({upcomingAppts.length})
              </Text>
              {upcomingAppts.map(renderAppointment)}
            </View>
          )}

          {/* Citas Pasadas */}
          {pastAppts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                📋 Historial ({pastAppts.length})
              </Text>
              {pastAppts.slice(0, 5).map(renderAppointment)}
              {pastAppts.length > 5 && (
                <Text style={styles.moreText}>
                  y {pastAppts.length - 5} más...
                </Text>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={80} color="#cbd5e1" />
          <Text style={styles.emptyText}>No tienes citas programadas</Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => router.push('/pages/senior/appointments-manage')}
          >
            <Text style={styles.emptyButtonText}>Crear primera cita</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  headerButtons: { flexDirection: 'row', gap: 10 },
  calendarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { paddingBottom: 20 },
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  aptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aptCardPast: {
    opacity: 0.7,
    backgroundColor: '#f8fafc',
  },
  dateBox: {
    width: 64,
    height: 64,
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBoxPast: {
    backgroundColor: '#f1f5f9',
  },
  dateDay: { fontSize: 24, fontWeight: 'bold', color: '#8b5cf6' },
  dateDayPast: { color: '#94a3b8' },
  dateMonth: { fontSize: 12, color: '#8b5cf6', fontWeight: '600', marginTop: 2 },
  dateMonthPast: { color: '#94a3b8' },
  aptInfo: { flex: 1, marginLeft: 16 },
  aptHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  aptDoctor: { fontSize: 16, fontWeight: '700', color: '#1e293b', flex: 1 },
  todayBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  specialtyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  aptSpecialty: { fontSize: 13, color: '#10b981', marginLeft: 6, fontWeight: '600' },
  aptReason: { fontSize: 14, color: '#64748b', marginBottom: 6 },
  detailsRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  aptTime: { fontSize: 13, color: '#64748b', marginLeft: 4, fontWeight: '500' },
  locationRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  aptLocation: { fontSize: 13, color: '#64748b', marginLeft: 4, fontWeight: '500', flex: 1 },
  textPast: { color: '#94a3b8' },
  moreText: { 
    textAlign: 'center', 
    color: '#94a3b8', 
    fontSize: 14, 
    marginVertical: 12,
    fontStyle: 'italic' 
  },
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyText: { fontSize: 17, color: '#94a3b8', marginTop: 20, textAlign: 'center' },
  emptyButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

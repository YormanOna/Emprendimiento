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
      setSeniorId(user.id);
      const data = await appointmentsService.getAppointments(user.id);
      setAppointments(data);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mis Citas Médicas</Text>
          <Text style={styles.headerSubtitle}>{appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}</Text>
        </View>
        <TouchableOpacity
          style={styles.calendarBtn}
          onPress={() => router.push('/pages/senior/calendar')}
        >
          <Ionicons name="calendar-outline" size={24} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      {appointments.length > 0 ? (
        appointments.map((apt) => {
          const date = new Date(apt.starts_at);
          return (
            <TouchableOpacity 
              key={apt.id} 
              style={styles.aptCard}
              onPress={() => router.push(`/pages/senior/appointment-detail?id=${apt.id}`)}
            >
              <View style={styles.dateBox}>
                <Text style={styles.dateDay}>{date.getDate()}</Text>
                <Text style={styles.dateMonth}>
                  {date.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase()}
                </Text>
              </View>
              <View style={styles.aptInfo}>
                <Text style={styles.aptDoctor}>Cita Médica</Text>
                <Text style={styles.aptReason}>{apt.reason || 'Consulta general'}</Text>
                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={18} color="#64748b" />
                  <Text style={styles.aptTime}>
                    {date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={80} color="#cbd5e1" />
          <Text style={styles.emptyText}>No tienes citas programadas</Text>
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
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#1e293b' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  calendarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateBox: {
    width: 72,
    height: 72,
    backgroundColor: '#ede9fe',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: { fontSize: 28, fontWeight: 'bold', color: '#8b5cf6' },
  dateMonth: { fontSize: 14, color: '#8b5cf6', fontWeight: '600' },
  aptInfo: { flex: 1, marginLeft: 20 },
  aptDoctor: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 6 },
  aptReason: { fontSize: 15, color: '#64748b', marginBottom: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  aptTime: { fontSize: 15, color: '#64748b', marginLeft: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 17, color: '#94a3b8', marginTop: 20, textAlign: 'center' },
});

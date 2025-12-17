// app/pages/family/appointments.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import appointmentsService, { Appointment } from '@/services/appointmentsService';

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    const data = await appointmentsService.getAppointments(1);
    setAppointments(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  // Generar días del mes
  const getDaysInMonth = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay(); // 0 = Domingo

    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  // Verificar si un día tiene citas
  const hasAppointment = (day: number | null) => {
    if (!day) return false;
    return appointments.some(apt => {
      const aptDate = new Date(apt.starts_at);
      return aptDate.getDate() === day &&
             aptDate.getMonth() === selectedDate.getMonth() &&
             aptDate.getFullYear() === selectedDate.getFullYear();
    });
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return day === today.getDate() && 
           selectedDate.getMonth() === today.getMonth() &&
           selectedDate.getFullYear() === today.getFullYear();
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Título Principal */}
      <View style={styles.headerBar}>
        <Text style={styles.pageTitle}>CALENDARIO</Text>
      </View>

      {/* Calendario */}
      <View style={styles.calendarContainer}>
        <View style={styles.calendarCard}>
          <Text style={styles.calendarTitle}>Calendar with</Text>
          
          {/* Días de la semana */}
          <View style={styles.weekDays}>
            {['Su', 'M', 'Tu', 'W', 'Th', 'Fri', 'Sa'].map((day, idx) => (
              <Text key={idx} style={styles.weekDayText}>{day}</Text>
            ))}
          </View>

          {/* Grid de días */}
          <View style={styles.daysGrid}>
            {getDaysInMonth().map((day, idx) => (
              <View key={idx} style={styles.dayCell}>
                {day && (
                  <View style={styles.dayContainer}>
                    <Text style={[
                      styles.dayText,
                      isToday(day) && styles.todayText
                    ]}>
                      {day}
                    </Text>
                    {hasAppointment(day) && (
                      <View style={styles.flagContainer}>
                        <View style={styles.flagPole} />
                        <View style={styles.flag} />
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Lista de citas del día seleccionado */}
      {appointments.length > 0 && (
        <View style={styles.appointmentsList}>
          <Text style={styles.appointmentsTitle}>Próximas Citas</Text>
          {appointments.slice(0, 5).map((apt) => {
            const date = new Date(apt.starts_at);
            return (
              <TouchableOpacity key={apt.id} style={styles.aptCard}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateDay}>{date.getDate()}</Text>
                  <Text style={styles.dateMonth}>
                    {date.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.aptInfo}>
                  <Text style={styles.aptReason}>{apt.reason || 'Consulta general'}</Text>
                  <Text style={styles.aptDoctor}>Dr. {apt.doctor_user_id}</Text>
                  <Text style={styles.aptTime}>
                    {date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© {new Date().getFullYear()} Application</Text>
      </View>

      {/* Botón Agregar */}
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Nueva Cita</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerBar: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pageTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#000',
    letterSpacing: 1,
  },
  calendarContainer: {
    padding: 20,
    alignItems: 'center',
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
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
    padding: 2,
  },
  dayContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  todayText: {
    backgroundColor: '#ec4899',
    color: '#fff',
    fontWeight: 'bold',
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: 'center',
    lineHeight: 32,
  },
  flagContainer: {
    position: 'absolute',
    top: -2,
    right: 2,
  },
  flagPole: {
    width: 2,
    height: 16,
    backgroundColor: '#666',
  },
  flag: {
    width: 12,
    height: 8,
    backgroundColor: '#ef4444',
    position: 'absolute',
    top: 0,
    left: 2,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  appointmentsList: {
    padding: 20,
  },
  appointmentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  aptCard: {
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
  dateBox: {
    width: 60,
    height: 60,
    backgroundColor: '#fce7f3',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: { fontSize: 24, fontWeight: 'bold', color: '#ec4899' },
  dateMonth: { fontSize: 12, color: '#ec4899', fontWeight: '600' },
  aptInfo: { flex: 1, marginLeft: 16 },
  aptReason: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  aptDoctor: { fontSize: 14, color: '#64748b', marginBottom: 2 },
  aptTime: { fontSize: 13, color: '#94a3b8' },
  footer: {
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ec4899',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600', 
    marginLeft: 8,
  },
});

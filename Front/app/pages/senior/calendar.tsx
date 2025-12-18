// app/pages/senior/calendar.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import appointmentsService, { Appointment } from '@/services/appointmentsService';
import authService from '@/services/authService';

export default function SeniorCalendarScreen() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      const data = await appointmentsService.getAppointments(user.senior_id || user.id);
      setAppointments(data);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const changeMonth = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + increment);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const hasAppointment = (date: Date | null) => {
    if (!date) return false;
    return appointments.some(apt => {
      const aptDate = new Date(apt.starts_at);
      return aptDate.toDateString() === date.toDateString();
    });
  };

  const getAppointmentsForDate = (date: Date | null) => {
    if (!date) return [];
    return appointments.filter(apt => {
      const aptDate = new Date(apt.starts_at);
      return aptDate.toDateString() === date.toDateString();
    });
  };

  const monthName = currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentDate);
  const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];

  return (
    <View style={styles.container}>
      {/* Header con navegación de mes */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={28} color="#8b5cf6" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.monthTitle}>
            {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
          </Text>
          <Text style={styles.appointmentsCount}>
            {appointments.length} cita{appointments.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={28} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      {/* Calendario */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.calendarContainer}>
          {/* Nombres de los días */}
          <View style={styles.weekDaysHeader}>
            {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map((day, idx) => (
              <Text key={idx} style={styles.weekDayName}>{day}</Text>
            ))}
          </View>

          {/* Grid de días */}
          <View style={styles.daysGrid}>
            {days.map((day, idx) => {
              const hasAppt = hasAppointment(day);
              const isSelected = selectedDate && day && selectedDate.toDateString() === day.toDateString();
              
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    !day && styles.emptycell,
                    day && isToday(day) && styles.todayCell,
                    isSelected && styles.selectedCell
                  ]}
                  disabled={!day}
                  onPress={() => day && setSelectedDate(day)}
                >
                  {day && (
                    <>
                      <Text style={[
                        styles.dayNumber, 
                        isToday(day) && styles.todayNumber,
                        isSelected && styles.selectedNumber
                      ]}>
                        {day.getDate()}
                      </Text>
                      {hasAppt && (
                        <View style={[
                          styles.appointmentDot,
                          isToday(day) && styles.appointmentDotToday,
                          isSelected && styles.appointmentDotSelected
                        ]} />
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Detalles del día seleccionado */}
        {selectedDate && (
          <View style={styles.dayDetailsCard}>
            <Text style={styles.dayDetailsTitle}>
              {selectedDate.toLocaleDateString('es-MX', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </Text>
            
            {selectedDateAppointments.length > 0 ? (
              selectedDateAppointments.map((apt) => {
                const aptDate = new Date(apt.starts_at);
                return (
                  <TouchableOpacity
                    key={apt.id}
                    style={styles.appointmentItem}
                    onPress={() => router.push(`/pages/senior/appointment-detail?id=${apt.id}`)}
                  >
                    <View style={styles.appointmentIcon}>
                      <Ionicons name="calendar" size={20} color="#10b981" />
                    </View>
                    <View style={styles.appointmentInfo}>
                      <Text style={styles.appointmentDoctor}>
                        {apt.doctor_name || 'Cita Médica'}
                      </Text>
                      {apt.specialty && (
                        <Text style={styles.appointmentSpecialty}>{apt.specialty}</Text>
                      )}
                      <View style={styles.appointmentTime}>
                        <Ionicons name="time-outline" size={14} color="#64748b" />
                        <Text style={styles.appointmentTimeText}>
                          {aptDate.toLocaleTimeString('es-MX', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.noAppointments}>
                <Ionicons name="calendar-outline" size={32} color="#cbd5e1" />
                <Text style={styles.noAppointmentsText}>Sin citas este día</Text>
              </View>
            )}
          </View>
        )}

        {/* Leyenda */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Leyenda</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
            <Text style={styles.legendText}>Día actual</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>Día con cita médica</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  navBtn: { padding: 8 },
  headerCenter: { alignItems: 'center', flex: 1 },
  monthTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  appointmentsCount: { fontSize: 12, color: '#64748b', marginTop: 4 },
  scrollView: { flex: 1 },
  calendarContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  weekDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  weekDayName: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
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
    position: 'relative',
  },
  emptycell: {
    backgroundColor: 'transparent',
  },
  todayCell: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
  },
  selectedCell: {
    backgroundColor: '#10b981',
    borderRadius: 12,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  todayNumber: {
    color: '#fff',
  },
  selectedNumber: {
    color: '#fff',
  },
  appointmentDot: {
    position: 'absolute',
    bottom: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10b981',
  },
  appointmentDotToday: {
    backgroundColor: '#fff',
  },
  appointmentDotSelected: {
    backgroundColor: '#fff',
  },
  dayDetailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  dayDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 8,
  },
  appointmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  appointmentDoctor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  appointmentSpecialty: {
    fontSize: 13,
    color: '#10b981',
    marginBottom: 4,
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentTimeText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 4,
  },
  noAppointments: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noAppointmentsText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  legend: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  legendText: {
    fontSize: 14,
    color: '#64748b',
  },
});

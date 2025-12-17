// app/pages/senior/appointment-detail.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import appointmentsService, { Appointment } from '@/services/appointmentsService';
import authService from '@/services/authService';

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [appointment, setAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    loadAppointment();
  }, [id]);

  const loadAppointment = async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      const apts = await appointmentsService.getAppointments(user.id);
      const found = apts.find(a => a.id === Number(id));
      setAppointment(found || null);
    }
  };

  if (!appointment) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cargando...</Text>
        </View>
      </View>
    );
  }

  const startDate = new Date(appointment.starts_at);
  const endDate = appointment.ends_at ? new Date(appointment.ends_at) : new Date(new Date(appointment.starts_at).getTime() + 60 * 60 * 1000);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles de Cita</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Card de fecha principal */}
      <View style={styles.dateCard}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{startDate.getDate()}</Text>
          <Text style={styles.dateMonth}>
            {startDate.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase()}
          </Text>
          <Text style={styles.dateYear}>{startDate.getFullYear()}</Text>
        </View>
        <View style={styles.dateInfo}>
          <Text style={styles.appointmentTitle}>Cita Médica</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time" size={18} color="#64748b" />
            <Text style={styles.timeText}>
              {startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} - 
              {endDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </View>

      {/* Información de la cita */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>

        {appointment.reason && (
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="document-text" size={20} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Motivo</Text>
              <Text style={styles.infoValue}>{appointment.reason}</Text>
            </View>
          </View>
        )}

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="medkit" size={20} color="#64748b" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Estado</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {appointment.status === 'SCHEDULED' ? 'Programada' :
                 appointment.status === 'COMPLETED' ? 'Completada' :
                 appointment.status === 'CANCELLED' ? 'Cancelada' : appointment.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="location" size={20} color="#64748b" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Ubicación</Text>
            <Text style={styles.infoValue}>Consultorio médico</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="person" size={20} color="#64748b" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Doctor</Text>
            <Text style={styles.infoValue}>Dr. Asignado</Text>
          </View>
        </View>
      </View>

      {/* Botones de acción */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => Alert.alert('Próximamente', 'Función de reprogramación en desarrollo')}
        >
          <Ionicons name="calendar-outline" size={24} color="#fff" />
          <Text style={styles.actionBtnText}>Reprogramar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionBtn, styles.cancelBtn]}
          onPress={() => Alert.alert('Confirmar', '¿Cancelar esta cita?', [
            { text: 'No', style: 'cancel' },
            { text: 'Sí, cancelar', style: 'destructive', onPress: () => {} }
          ])}
        >
          <Ionicons name="close-circle-outline" size={24} color="#fff" />
          <Text style={styles.actionBtnText}>Cancelar Cita</Text>
        </TouchableOpacity>
      </View>
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
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  dateCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dateBadge: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  dateDay: { fontSize: 32, fontWeight: 'bold', color: '#8b5cf6' },
  dateMonth: { fontSize: 12, fontWeight: '700', color: '#8b5cf6', marginTop: -4 },
  dateYear: { fontSize: 11, color: '#a78bfa', marginTop: 2 },
  dateInfo: { flex: 1 },
  appointmentTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 13, color: '#94a3b8', marginBottom: 4 },
  infoValue: { fontSize: 16, color: '#1e293b', fontWeight: '600' },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: { fontSize: 14, color: '#1e40af', fontWeight: '600' },
  noteCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteDate: { fontSize: 12, color: '#64748b', marginLeft: 8, fontWeight: '600' },
  noteText: { fontSize: 15, color: '#1e293b', lineHeight: 22 },
  comingSoon: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelBtn: { backgroundColor: '#dc2626' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

// app/pages/doctor/appointments.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import appointmentsService, { Appointment } from '@/services/appointmentsService';

export default function DoctorAppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.headerBar}>
        <Text style={styles.pageTitle}>CITAS MEDICAS</Text>
      </View>

      {/* Sección de Próximas Citas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PRÓXIMAS CITAS</Text>

        {appointments.length > 0 ? (
          appointments.map((apt) => {
            const date = new Date(apt.starts_at);
            const dateStr = date.toISOString().split('T')[0];
            const timeStr = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
            
            return (
              <TouchableOpacity key={apt.id} style={styles.aptRow}>
                <Text style={styles.doctorName}>Dr. Paciente #{apt.senior_id}</Text>
                <Text style={styles.aptDetails}>
                  Fecha: {dateStr}, Hora: {timeStr}
                </Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay citas programadas</Text>
          </View>
        )}
      </View>

      {/* Botón Flotante */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#fff" />
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
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    marginBottom: 20,
  },
  pageTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#000',
    textAlign: 'center',
    letterSpacing: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 80,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  aptRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  aptDetails: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: { 
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: { 
    fontSize: 15, 
    color: '#999',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});


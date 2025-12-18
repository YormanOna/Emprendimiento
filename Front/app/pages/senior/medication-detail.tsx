// app/pages/senior/medication-detail.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import medicationsService, { Medication, Schedule } from '@/services/medicationsService';

export default function MedicationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const medicationId = parseInt(params.id as string);

  const [medication, setMedication] = useState<Medication | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [medicationId]);

  const loadData = async () => {
    try {
      console.log('🔍 Cargando medicamento:', medicationId);
      setLoading(true);
      const medData = await medicationsService.getMedication(medicationId);
      console.log('💊 Medicamento cargado:', medData);
      const schedulesData = await medicationsService.getMedicationSchedules(medicationId);
      console.log('📅 Horarios cargados:', schedulesData);
      setMedication(medData);
      setSchedules(schedulesData);
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      Alert.alert('Error', 'No se pudo cargar el medicamento');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeMedication = async () => {
    Alert.alert(
      'Confirmar',
      '¿Ya tomaste este medicamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, tomado',
          onPress: async () => {
            const result = await medicationsService.markMedicationTaken(medicationId);
            if (result) {
              Alert.alert('✓ Registrado', 'Se ha registrado la toma del medicamento');
            } else {
              Alert.alert('Error', 'No se pudo registrar la toma');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de eliminar este medicamento? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const success = await medicationsService.deleteMedication(medicationId);
            if (success) {
              Alert.alert('Eliminado', 'Medicamento eliminado correctamente', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } else {
              Alert.alert('Error', 'No se pudo eliminar el medicamento');
            }
          },
        },
      ]
    );
  };

  const formatHour = (hour: number): string => {
    const isPM = hour >= 12;
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${isPM ? 'PM' : 'AM'}`;
  };

  const getDayName = (day: number): string => {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return days[day];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Cargando detalles...</Text>
      </View>
    );
  }

  if (!medication) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Medicamento no encontrado</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Detalles del Medicamento</Text>
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Información Principal */}
        <View style={styles.mainCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="medical" size={48} color="#8b5cf6" />
          </View>
          <Text style={styles.medName}>{medication.name}</Text>
          <View style={styles.doseContainer}>
            <Text style={styles.doseText}>
              {medication.dose} {medication.unit}
            </Text>
          </View>
          {medication.notes && (
            <View style={styles.notesContainer}>
              <Ionicons name="information-circle-outline" size={20} color="#64748b" />
              <Text style={styles.notesText}>{medication.notes}</Text>
            </View>
          )}
        </View>

        {/* Horarios */}
        {schedules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Horarios de Toma</Text>
            {schedules.map((schedule) => (
              <View key={schedule.id} style={styles.scheduleCard}>
                <View style={styles.scheduleHeader}>
                  <Ionicons name="time-outline" size={24} color="#8b5cf6" />
                  <Text style={styles.scheduleTitle}>Horario #{schedule.id}</Text>
                </View>

                {/* Horas del día */}
                <View style={styles.hoursContainer}>
                  <Text style={styles.label}>Horas:</Text>
                  <View style={styles.hoursList}>
                    {schedule.hours.map((hour, index) => (
                      <View key={index} style={styles.hourChip}>
                        <Ionicons name="alarm-outline" size={16} color="#8b5cf6" />
                        <Text style={styles.hourChipText}>{formatHour(hour)}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Días de la semana */}
                {schedule.days_of_week && schedule.days_of_week.length > 0 && (
                  <View style={styles.daysContainer}>
                    <Text style={styles.label}>Días:</Text>
                    <View style={styles.daysList}>
                      {schedule.days_of_week.map((day, index) => (
                        <View key={index} style={styles.dayChip}>
                          <Text style={styles.dayChipText}>{getDayName(day)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Fechas */}
                {(schedule.start_date || schedule.end_date) && (
                  <View style={styles.datesContainer}>
                    {schedule.start_date && (
                      <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>Desde:</Text>
                        <Text style={styles.dateText}>
                          {new Date(schedule.start_date).toLocaleDateString('es-ES')}
                        </Text>
                      </View>
                    )}
                    {schedule.end_date && (
                      <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>Hasta:</Text>
                        <Text style={styles.dateText}>
                          {new Date(schedule.end_date).toLocaleDateString('es-ES')}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {schedules.length === 0 && (
          <View style={styles.emptySchedules}>
            <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptySchedulesText}>
              No hay horarios configurados para este medicamento
            </Text>
          </View>
        )}

        {/* Acción Rápida */}
        <TouchableOpacity style={styles.actionButton} onPress={handleTakeMedication}>
          <Ionicons name="checkmark-circle" size={28} color="#fff" />
          <Text style={styles.actionButtonText}>Marcar como Tomado</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { fontSize: 18, fontWeight: '600', color: '#64748b', marginTop: 16, marginBottom: 24 },
  backButton: { backgroundColor: '#8b5cf6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  header: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  deleteBtn: { padding: 8 },
  content: { flex: 1, padding: 16 },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  medName: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  doseContainer: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  doseText: { fontSize: 18, fontWeight: '600', color: '#7c3aed' },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  notesText: { fontSize: 14, color: '#64748b', marginLeft: 8, flex: 1 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  scheduleTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginLeft: 8 },
  hoursContainer: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  hoursList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hourChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  hourChipText: { fontSize: 14, fontWeight: '600', color: '#7c3aed' },
  daysContainer: { marginBottom: 12 },
  daysList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dayChipText: { fontSize: 13, fontWeight: '600', color: '#3b82f6' },
  datesContainer: { flexDirection: 'row', gap: 16, marginTop: 8 },
  dateItem: { flex: 1 },
  dateLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginBottom: 4 },
  dateText: { fontSize: 14, color: '#475569' },
  emptySchedules: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptySchedulesText: { fontSize: 14, color: '#94a3b8', marginTop: 12, textAlign: 'center' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 32,
  },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});

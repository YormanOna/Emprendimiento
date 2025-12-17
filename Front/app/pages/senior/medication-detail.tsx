// app/pages/senior/medication-detail.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import medicationsService, { Medication } from '@/services/medicationsService';

export default function MedicationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [medication, setMedication] = useState<Medication | null>(null);

  useEffect(() => {
    loadMedication();
  }, [id]);

  const loadMedication = async () => {
    // Por ahora buscamos en la lista completa
    // En el futuro se puede hacer un endpoint específico para obtener un medicamento por ID
    const user = await require('@/services/authService').default.getCurrentUser();
    if (user) {
      const meds = await medicationsService.getMedications(user.id);
      const found = meds.find(m => m.id === Number(id));
      setMedication(found || null);
    }
  };

  if (!medication) {
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

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles del Medicamento</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Card principal */}
      <View style={styles.mainCard}>
        <View style={styles.iconLarge}>
          <Ionicons name="medical" size={48} color="#8b5cf6" />
        </View>
        <Text style={styles.medName}>{medication.name}</Text>
        <Text style={styles.medDose}>{medication.dose} {medication.unit}</Text>
      </View>

      {/* Información detallada */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="flask" size={20} color="#64748b" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Dosis</Text>
            <Text style={styles.infoValue}>{medication.dose} {medication.unit}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="calendar" size={20} color="#64748b" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Registrado el</Text>
            <Text style={styles.infoValue}>
              {new Date(medication.created_at).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </Text>
          </View>
        </View>

        {medication.notes && (
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="document-text" size={20} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Notas</Text>
              <Text style={styles.infoValue}>{medication.notes}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Horarios (simulado por ahora) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Horarios de Toma</Text>
        <Text style={styles.comingSoon}>Los horarios programados aparecerán aquí</Text>
        
        {/* Ejemplo de cómo se verían los horarios */}
        <View style={styles.scheduleCard}>
          <View style={styles.scheduleTime}>
            <Ionicons name="time" size={24} color="#8b5cf6" />
            <Text style={styles.scheduleText}>08:00 AM</Text>
          </View>
          <Text style={styles.scheduleLabel}>Ejemplo de horario</Text>
        </View>
      </View>

      {/* Historial reciente */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historial Reciente</Text>
        <Text style={styles.comingSoon}>El historial de tomas aparecerá aquí</Text>
      </View>

      {/* Botones de acción */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => Alert.alert('Próximamente', 'Función de edición en desarrollo')}
        >
          <Ionicons name="create-outline" size={24} color="#fff" />
          <Text style={styles.actionBtnText}>Editar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => Alert.alert('Próximamente', 'Función de eliminación en desarrollo')}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
          <Text style={styles.actionBtnText}>Eliminar</Text>
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
  mainCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  medName: { fontSize: 26, fontWeight: 'bold', color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  medDose: { fontSize: 18, color: '#64748b', fontWeight: '600' },
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
  scheduleCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  scheduleTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleText: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginLeft: 12 },
  scheduleLabel: { fontSize: 14, color: '#64748b', marginLeft: 36 },
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
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteBtn: { backgroundColor: '#dc2626' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

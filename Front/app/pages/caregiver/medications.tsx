// app/(app)/caregiver/medications.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import medicationsService, { Medication } from '@/services/medicationsService';
import seniorsService from '@/services/seniorsService';
import { Alert } from 'react-native';

export default function MedicationsScreen() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      setLoading(true);
      // Obtener el primer senior disponible
      const seniors = await seniorsService.getSeniors();
      if (seniors.length > 0) {
        const data = await medicationsService.getMedications(seniors[0].id);
        setMedications(data);
      }
    } catch (error) {
      console.error('Error cargando medicamentos:', error);
      Alert.alert('Error', 'No se pudieron cargar los medicamentos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.list}>
        {medications.length > 0 ? (
          medications.map((med) => (
            <View key={med.id} style={styles.medCard}>
              <View style={styles.medIcon}>
                <Ionicons name="medical" size={24} color="#3b82f6" />
              </View>
              <View style={styles.medInfo}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medDose}>{med.dose} {med.unit}</Text>
                {med.notes && <Text style={styles.medNotes}>{med.notes}</Text>}
              </View>
              <TouchableOpacity style={styles.checkButton}>
                <Ionicons name="checkmark-circle-outline" size={28} color="#10b981" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No hay medicamentos registrados</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medInfo: {
    flex: 1,
    marginLeft: 12,
  },
  medName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  medDose: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  medNotes: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  checkButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});

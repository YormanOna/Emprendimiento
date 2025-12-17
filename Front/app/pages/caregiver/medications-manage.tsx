// app/pages/caregiver/medications-manage.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import seniorsService, { Senior } from '@/services/seniorsService';
import medicationsService, { Medication } from '@/services/medicationsService';

export default function MedicationsManageScreen() {
  const router = useRouter();
  const [seniors, setSeniors] = useState<Senior[]>([]);
  const [selectedSenior, setSelectedSenior] = useState<Senior | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    dose: '',
    unit: 'mg',
    notes: ''
  });

  useEffect(() => {
    loadSeniors();
  }, []);

  useEffect(() => {
    if (selectedSenior) {
      loadMedications();
    }
  }, [selectedSenior]);

  const loadSeniors = async () => {
    const data = await seniorsService.getSeniors();
    setSeniors(data);
    if (data.length > 0) {
      setSelectedSenior(data[0]);
    }
  };

  const loadMedications = async () => {
    if (!selectedSenior) return;
    const data = await medicationsService.getMedications(selectedSenior.id);
    setMedications(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedications();
    setRefreshing(false);
  };

  const handleSelectSenior = () => {
    Alert.alert(
      'Seleccionar Paciente',
      'Elige el paciente para ver sus medicamentos',
      [
        ...seniors.map((senior) => ({
          text: senior.full_name,
          onPress: () => setSelectedSenior(senior),
        })),
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleMarkTaken = async (medicationId: number, medName: string) => {
    Alert.alert(
      'Marcar Medicamento',
      `¿Marcar "${medName}" como tomado?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            const result = await medicationsService.markMedicationTaken(medicationId);
            if (result) {
              Alert.alert('Éxito', 'Medicamento registrado como tomado');
            } else {
              Alert.alert('Error', 'No se pudo registrar la toma');
            }
          },
        },
      ]
    );
  };

  const handleAddMedication = async () => {
    if (!selectedSenior || !newMed.name || !newMed.dose) {
      Alert.alert('Error', 'Complete los campos obligatorios');
      return;
    }

    const result = await medicationsService.createMedication(selectedSenior.id, newMed);
    if (result) {
      Alert.alert('Éxito', 'Medicamento agregado');
      setModalVisible(false);
      setNewMed({ name: '', dose: '', unit: 'mg', notes: '' });
      loadMedications();
    } else {
      Alert.alert('Error', 'No se pudo agregar el medicamento');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerLabel}>Medicamentos</Text>
          {selectedSenior && (
            <Text style={styles.headerTitle}>{selectedSenior.full_name}</Text>
          )}
        </View>
        {selectedSenior && (
          <TouchableOpacity style={styles.changeBtn} onPress={handleSelectSenior}>
            <Ionicons name="swap-horizontal" size={20} color="#f59e0b" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Add Button */}
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Agregar Medicamento</Text>
        </TouchableOpacity>

        {/* Medications List */}
        {medications.length > 0 ? (
          medications.map((med) => (
            <View key={med.id} style={styles.medicationCard}>
              <View style={styles.medHeader}>
                <View style={styles.medIcon}>
                  <Ionicons name="medical" size={24} color="#f59e0b" />
                </View>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medDose}>
                    {med.dose} {med.unit}
                  </Text>
                  {med.notes && <Text style={styles.medNotes}>{med.notes}</Text>}
                </View>
              </View>
              <TouchableOpacity
                style={styles.takeButton}
                onPress={() => handleMarkTaken(med.id, med.name)}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.takeButtonText}>Marcar Tomado</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No hay medicamentos</Text>
            <Text style={styles.emptySubtext}>Agrega el primer medicamento</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Medicamento</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nombre del medicamento *"
              value={newMed.name}
              onChangeText={(text) => setNewMed({ ...newMed, name: text })}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Dosis *"
                value={newMed.dose}
                onChangeText={(text) => setNewMed({ ...newMed, dose: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Unidad"
                value={newMed.unit}
                onChangeText={(text) => setNewMed({ ...newMed, unit: text })}
              />
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notas"
              value={newMed.notes}
              onChangeText={(text) => setNewMed({ ...newMed, notes: text })}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddMedication}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    padding: 16,
    paddingTop: 50,
  },
  backButton: { padding: 8, marginRight: 8 },
  headerContent: { flex: 1 },
  headerLabel: { fontSize: 12, color: '#fef3c7', fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  changeBtn: { backgroundColor: '#fef3c7', padding: 8, borderRadius: 8 },
  content: { flex: 1, padding: 16 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  medicationCard: {
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
  medHeader: { flexDirection: 'row', marginBottom: 12 },
  medIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medInfo: { flex: 1 },
  medName: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  medDose: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  medNotes: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  takeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
  },
  takeButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#64748b', marginTop: 16, fontWeight: '500' },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', gap: 12 },
  inputHalf: { flex: 1 },
  textArea: { height: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalButton: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f1f5f9' },
  cancelButtonText: { color: '#64748b', fontSize: 16, fontWeight: '600' },
  saveButton: { backgroundColor: '#f59e0b' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

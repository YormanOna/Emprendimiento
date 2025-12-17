import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import authService, { User } from '@/services/authService';
import medicationsService, { Medication } from '@/services/medicationsService';

export default function SeniorMedicationsManageScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    dose: '',
    unit: 'mg',
    notes: '',
    hours: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
    
    if (userData?.senior_id) {
      const medsData = await medicationsService.getMedications(userData.senior_id);
      setMedications(medsData);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddMedication = async () => {
    if (!newMed.name || !newMed.dose || !newMed.unit) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos');
      return;
    }

    if (!user?.senior_id) {
      Alert.alert('Error', 'No se encontró el perfil de senior');
      return;
    }

    try {
      // Crear medicamento
      const medication = await medicationsService.createMedication(user.senior_id, {
        name: newMed.name,
        dose: newMed.dose,
        unit: newMed.unit,
        notes: newMed.notes,
      });

      if (!medication) {
        Alert.alert('Error', 'No se pudo crear el medicamento');
        return;
      }

      // Crear horarios si se especificaron
      if (newMed.hours) {
        const hours = newMed.hours.split(',').map(h => parseInt(h.trim())).filter(h => !isNaN(h));
        if (hours.length > 0) {
          await medicationsService.createSchedule(medication.id, {
            hours: hours,
            days_of_week: [0, 1, 2, 3, 4, 5, 6], // Todos los días
          });
        }
      }

      Alert.alert('Éxito', 'Medicamento agregado correctamente');
      setModalVisible(false);
      setNewMed({ name: '', dose: '', unit: 'mg', notes: '', hours: '' });
      await loadData();
    } catch (error) {
      console.error('Error al agregar medicamento:', error);
      Alert.alert('Error', 'No se pudo agregar el medicamento');
    }
  };

  const handleDeleteMedication = async (medId: number) => {
    Alert.alert(
      'Confirmar',
      '¿Estás seguro de eliminar este medicamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await medicationsService.deleteMedication(medId);
              Alert.alert('Éxito', 'Medicamento eliminado');
              await loadData();
            } catch (error) {
              console.error('Error al eliminar:', error);
              Alert.alert('Error', 'No se pudo eliminar el medicamento');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mis Medicamentos</Text>
          <Text style={styles.headerSubtitle}>Gestiona tus medicinas</Text>
        </View>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add-circle" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Lista de Medicamentos */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {medications.length > 0 ? (
          medications.map((med) => (
            <View key={med.id} style={styles.medCard}>
              <View style={styles.medIcon}>
                <Ionicons name="medical" size={28} color="#8b5cf6" />
              </View>
              <View style={styles.medInfo}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medDose}>
                  {med.dose} {med.unit}
                </Text>
                {med.notes && <Text style={styles.medNotes}>{med.notes}</Text>}
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteMedication(med.id)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No tienes medicamentos registrados</Text>
            <Text style={styles.emptySubtext}>Presiona el botón + para agregar uno</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal para Agregar Medicamento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Medicamento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={newMed.name}
                onChangeText={(text) => setNewMed({ ...newMed, name: text })}
                placeholder="Ej: Losartán"
              />

              <Text style={styles.label}>Dosis *</Text>
              <TextInput
                style={styles.input}
                value={newMed.dose}
                onChangeText={(text) => setNewMed({ ...newMed, dose: text })}
                placeholder="Ej: 50"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Unidad *</Text>
              <TextInput
                style={styles.input}
                value={newMed.unit}
                onChangeText={(text) => setNewMed({ ...newMed, unit: text })}
                placeholder="Ej: mg, ml, tabletas"
              />

              <Text style={styles.label}>Horarios (opcional)</Text>
              <TextInput
                style={styles.input}
                value={newMed.hours}
                onChangeText={(text) => setNewMed({ ...newMed, hours: text })}
                placeholder="Ej: 8,14,20 (separados por comas)"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Notas (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newMed.notes}
                onChangeText={(text) => setNewMed({ ...newMed, notes: text })}
                placeholder="Ej: Tomar con alimentos"
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleAddMedication}>
              <Text style={styles.saveButtonText}>Guardar Medicamento</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { padding: 8, marginRight: 8 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#e9d5ff', marginTop: 2 },
  addButton: { padding: 4 },
  content: { flex: 1, padding: 16 },
  medCard: {
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
  medIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medInfo: { flex: 1 },
  medName: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  medDose: { fontSize: 14, color: '#64748b' },
  medNotes: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 },
  deleteButton: { padding: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  modalForm: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 16,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

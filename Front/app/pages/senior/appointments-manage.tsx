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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import authService, { User } from '@/services/authService';
import appointmentsService, { Appointment } from '@/services/appointmentsService';

export default function SeniorAppointmentsManageScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newAppt, setNewAppt] = useState({
    doctor_name: '',
    specialty: '',
    location: '',
    date: '',
    time: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
    
    if (userData?.senior_id) {
      const apptsData = await appointmentsService.getAppointments(userData.senior_id);
      setAppointments(apptsData);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddAppointment = async () => {
    if (!newAppt.doctor_name || !newAppt.date || !newAppt.time) {
      Alert.alert('Error', 'Por favor completa los campos requeridos');
      return;
    }

    if (!user?.senior_id) {
      Alert.alert('Error', 'No se encontró el perfil de senior');
      return;
    }

    try {
      const scheduledAt = `${newAppt.date}T${newAppt.time}:00`;
      
      await appointmentsService.createAppointment(user.senior_id, {
        doctor_name: newAppt.doctor_name,
        specialty: newAppt.specialty,
        location: newAppt.location,
        scheduled_at: scheduledAt,
        notes: newAppt.notes,
      });

      Alert.alert('Éxito', 'Cita médica agregada correctamente');
      setModalVisible(false);
      setNewAppt({ doctor_name: '', specialty: '', location: '', date: '', time: '', notes: '' });
      await loadData();
    } catch (error) {
      console.error('Error al agregar cita:', error);
      Alert.alert('Error', 'No se pudo agregar la cita');
    }
  };

  const handleDeleteAppointment = async (apptId: number) => {
    Alert.alert(
      'Confirmar',
      '¿Estás seguro de eliminar esta cita?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await appointmentsService.deleteAppointment(apptId);
              Alert.alert('Éxito', 'Cita eliminada');
              await loadData();
            } catch (error) {
              console.error('Error al eliminar:', error);
              Alert.alert('Error', 'No se pudo eliminar la cita');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mis Citas Médicas</Text>
          <Text style={styles.headerSubtitle}>Gestiona tus consultas</Text>
        </View>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add-circle" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Lista de Citas */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {appointments.length > 0 ? (
          appointments.map((appt) => (
            <View key={appt.id} style={styles.apptCard}>
              <View style={styles.apptIcon}>
                <Ionicons name="calendar" size={28} color="#10b981" />
              </View>
              <View style={styles.apptInfo}>
                <Text style={styles.apptDoctor}>{appt.doctor_name}</Text>
                {appt.specialty && <Text style={styles.apptSpecialty}>{appt.specialty}</Text>}
                <View style={styles.apptDateTime}>
                  <Ionicons name="calendar-outline" size={14} color="#64748b" />
                  <Text style={styles.apptDate}>{formatDate(appt.scheduled_at)}</Text>
                  <Ionicons name="time-outline" size={14} color="#64748b" style={{ marginLeft: 12 }} />
                  <Text style={styles.apptTime}>{formatTime(appt.scheduled_at)}</Text>
                </View>
                {appt.location && (
                  <View style={styles.apptLocation}>
                    <Ionicons name="location-outline" size={14} color="#64748b" />
                    <Text style={styles.apptLocationText}>{appt.location}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteAppointment(appt.id)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No tienes citas programadas</Text>
            <Text style={styles.emptySubtext}>Presiona el botón + para agregar una</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal para Agregar Cita */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Cita Médica</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Nombre del Doctor *</Text>
              <TextInput
                style={styles.input}
                value={newAppt.doctor_name}
                onChangeText={(text) => setNewAppt({ ...newAppt, doctor_name: text })}
                placeholder="Dr. Juan Pérez"
              />

              <Text style={styles.label}>Especialidad</Text>
              <TextInput
                style={styles.input}
                value={newAppt.specialty}
                onChangeText={(text) => setNewAppt({ ...newAppt, specialty: text })}
                placeholder="Cardiología, Neurología, etc."
              />

              <Text style={styles.label}>Lugar</Text>
              <TextInput
                style={styles.input}
                value={newAppt.location}
                onChangeText={(text) => setNewAppt({ ...newAppt, location: text })}
                placeholder="Hospital o Clínica"
              />

              <Text style={styles.label}>Fecha *</Text>
              <TextInput
                style={styles.input}
                value={newAppt.date}
                onChangeText={(text) => setNewAppt({ ...newAppt, date: text })}
                placeholder="YYYY-MM-DD (Ej: 2025-12-25)"
              />

              <Text style={styles.label}>Hora *</Text>
              <TextInput
                style={styles.input}
                value={newAppt.time}
                onChangeText={(text) => setNewAppt({ ...newAppt, time: text })}
                placeholder="HH:MM (Ej: 14:30)"
              />

              <Text style={styles.label}>Notas</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newAppt.notes}
                onChangeText={(text) => setNewAppt({ ...newAppt, notes: text })}
                placeholder="Información adicional"
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleAddAppointment}>
              <Text style={styles.saveButtonText}>Guardar Cita</Text>
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
    backgroundColor: '#10b981',
    padding: 16,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { padding: 8, marginRight: 8 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#d1fae5', marginTop: 2 },
  addButton: { padding: 4 },
  content: { flex: 1, padding: 16 },
  apptCard: {
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
  apptIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  apptInfo: { flex: 1 },
  apptDoctor: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  apptSpecialty: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  apptDateTime: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  apptDate: { fontSize: 13, color: '#64748b', marginLeft: 4 },
  apptTime: { fontSize: 13, color: '#64748b', marginLeft: 4 },
  apptLocation: { flexDirection: 'row', alignItems: 'center' },
  apptLocationText: { fontSize: 12, color: '#94a3b8', marginLeft: 4 },
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
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

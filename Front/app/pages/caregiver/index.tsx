// app/(app)/caregiver/index.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import authService, { User } from '@/services/authService';
import seniorsService, { Senior } from '@/services/seniorsService';
import medicationsService, { Medication } from '@/services/medicationsService';
import remindersService, { Reminder } from '@/services/remindersService';

export default function CaregiverDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [seniors, setSeniors] = useState<Senior[]>([]);
  const [selectedSenior, setSelectedSenior] = useState<Senior | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayReminders, setTodayReminders] = useState<Reminder[]>([]);

  // Auto-refresh al volver a la página
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
    
    // Para cuidadores, solo cargar sus seniors asignados
    const seniorsData = userData?.id 
      ? await seniorsService.getSeniors(userData.id)
      : await seniorsService.getSeniors();
    
    console.log('Seniors data:', JSON.stringify(seniorsData, null, 2));
    setSeniors(seniorsData);
    
    // Seleccionar primer senior por defecto
    if (seniorsData.length > 0) {
      setSelectedSenior(seniorsData[0]);
      await loadSeniorData(seniorsData[0].id);
    }
  };

  const loadSeniorData = async (seniorId: number) => {
    try {
      // Cargar medicaciones del senior
      const medsData = await medicationsService.getMedications(seniorId);
      setMedications(medsData);
      console.log('💊 Medicaciones cargadas:', medsData.length);

      // Cargar recordatorios de hoy
      const remindersData = await remindersService.getReminders(seniorId);
      const today = new Date().toISOString().split('T')[0];
      const todayRems = remindersData.filter((r: Reminder) => 
        r.reminder_date && r.reminder_date.startsWith(today)
      );
      setTodayReminders(todayRems);
      console.log('🔔 Recordatorios de hoy:', todayRems.length);
    } catch (error) {
      console.error('❌ Error cargando datos del senior:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    if (isNaN(birthDate.getTime())) return 0;
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSelectSenior = async (senior: Senior) => {
    setSelectedSenior(senior);
    await loadSeniorData(senior.id);
  };

  const handleMarkAsTaken = async (medId: number) => {
    if (!selectedSenior) return;
    
    try {
      await medicationsService.markAsTaken(selectedSenior.id, medId);
      // Recargar medicaciones
      await loadSeniorData(selectedSenior.id);
      Alert.alert('✅ Éxito', 'Medicamento marcado como tomado');
    } catch (error) {
      console.error('❌ Error marcando medicamento:', error);
      Alert.alert('❌ Error', 'No se pudo marcar el medicamento');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      Alert.alert('Error', 'No se pudo cerrar sesión');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, 👋</Text>
          <Text style={styles.userName}>{user?.full_name || 'Cuidador'}</Text>
          <Text style={styles.roleText}>Cuidador Profesional</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Patient Selector o Estado Vacío */}
      {seniors.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>No tienes pacientes asignados</Text>
          <Text style={styles.emptyDescription}>
            Para comenzar a cuidar adultos mayores, agrega pacientes desde la sección de relaciones.
          </Text>
          <TouchableOpacity 
            style={styles.emptyActionButton}
            onPress={() => router.push('/pages/caregiver/relations')}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.emptyActionText}>Agregar Pacientes</Text>
          </TouchableOpacity>
        </View>
      ) : selectedSenior && (
        <View style={styles.selectedPatientCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Paciente Activo</Text>
          </View>
          <View style={styles.patientInfoRow}>
            <View style={styles.seniorAvatar}>
              <Text style={styles.seniorInitials}>
                {selectedSenior.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.seniorInfo}>
              <Text style={styles.seniorName}>{selectedSenior.full_name}</Text>
              <Text style={styles.seniorDetail}>
                {selectedSenior.birthdate ? `${calculateAge(selectedSenior.birthdate)} años` : 'Edad desconocida'}
                {selectedSenior.conditions && ` • ${selectedSenior.conditions.substring(0, 30)}...`}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Today's Medications */}
      {selectedSenior && medications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medicamentos de Hoy 💊</Text>
          {medications.slice(0, 3).map((med) => (
            <View key={med.id} style={styles.medicationCard}>
              <View style={styles.medicationInfo}>
                <Text style={styles.medicationName}>{med.name}</Text>
                <Text style={styles.medicationDetails}>
                  {med.dose} {med.unit}
                </Text>
                {med.notes && (
                  <Text style={styles.medicationSchedule}>📝 {med.notes}</Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.medicationActionBtn}
                onPress={() => handleMarkAsTaken(med.id)}
                disabled={med.taken_today}
              >
                <Ionicons 
                  name={med.taken_today ? "checkmark-circle" : "checkmark-circle-outline"} 
                  size={32} 
                  color={med.taken_today ? "#10b981" : "#f59e0b"} 
                />
              </TouchableOpacity>
            </View>
          ))}
          {medications.length > 3 && (
            <Text style={styles.moreText}>+{medications.length - 3} más medicamentos</Text>
          )}
        </View>
      )}

      {/* Today's Reminders */}
      {selectedSenior && todayReminders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recordatorios de Hoy 🔔</Text>
          {todayReminders.map((reminder) => (
            <View key={reminder.id} style={styles.reminderCard}>
              <Ionicons 
                name={reminder.completed ? "checkmark-circle" : "alarm-outline"} 
                size={24} 
                color={reminder.completed ? "#10b981" : "#f59e0b"} 
              />
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderTitle}>{reminder.title}</Text>
                <Text style={styles.reminderTime}>
                  {new Date(reminder.reminder_date).toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* All Patients List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Todos mis Pacientes ({seniors.length})</Text>
        {seniors.length > 0 ? (
          seniors.map((senior) => {
            const fullName = senior.full_name || 'Sin nombre';
            const nameParts = fullName.split(' ');
            const initials = nameParts.length >= 2 
              ? (nameParts[0][0] || '').toUpperCase() + (nameParts[nameParts.length - 1][0] || '').toUpperCase()
              : (nameParts[0]?.[0] || '?').toUpperCase() + (nameParts[0]?.[1] || '?').toUpperCase();
            const age = senior.birthdate ? calculateAge(senior.birthdate) : 0;
            
            const isSelected = selectedSenior?.id === senior.id;
            
            return (
              <TouchableOpacity
                key={senior.id}
                style={[styles.seniorCard, isSelected && styles.seniorCardSelected]}
                onPress={() => handleSelectSenior(senior)}
              >
                <View style={[styles.seniorAvatar, isSelected && styles.seniorAvatarSelected]}>
                  <Text style={[styles.seniorInitials, isSelected && styles.seniorInitialsSelected]}>
                    {initials}
                  </Text>
                </View>
                <View style={styles.seniorInfo}>
                  <Text style={styles.seniorName}>
                    {fullName}
                  </Text>
                  <Text style={styles.seniorDetail}>
                    {age > 0 ? `${age} años` : 'Edad desconocida'}
                    {senior.conditions ? ` • ${senior.conditions.substring(0, 30)}...` : ''}
                  </Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={24} color="#f59e0b" />}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No hay pacientes asignados</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      {selectedSenior && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/pages/caregiver/medications-manage' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="medkit" size={26} color="#3b82f6" />
              </View>
              <Text style={styles.actionText}>Medicamentos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/pages/caregiver/chat' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="chatbubbles" size={26} color="#10b981" />
              </View>
              <Text style={styles.actionText}>Mensajes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/pages/caregiver/relations' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#e0e7ff' }]}>
                <Ionicons name="people" size={26} color="#6366f1" />
              </View>
              <Text style={styles.actionText}>Mis Pacientes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/pages/hospitals-map' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="medical" size={26} color="#ef4444" />
              </View>
              <Text style={styles.actionText}>Hospitales</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#f59e0b',
    padding: 24,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#fef3c7',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  roleText: {
    fontSize: 13,
    color: '#fef3c7',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  taskCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 12,
  },
  taskCount: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 36,
  },
  seniorCard: {
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
  seniorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seniorInitials: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  seniorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  seniorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  seniorDetail: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  selectedPatientCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  changePatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changePatientText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginRight: 4,
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seniorCardSelected: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  seniorAvatarSelected: {
    backgroundColor: '#f59e0b',
  },
  seniorInitialsSelected: {
    color: '#ffffff',
  },
  medicationCard: {
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
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  medicationDetails: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  medicationSchedule: {
    fontSize: 12,
    color: '#94a3b8',
  },
  medicationActionBtn: {
    marginLeft: 12,
    padding: 4,
  },
  moreText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  reminderCard: {
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
  reminderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  reminderTime: {
    fontSize: 13,
    color: '#64748b',
  },
  // Empty State
  emptyStateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

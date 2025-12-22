// app/(app)/family/index.tsx
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
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import authService, { User } from '@/services/authService';
import seniorsService, { Senior } from '@/services/seniorsService';
import medicationsService, { Medication } from '@/services/medicationsService';
import remindersService, { Reminder } from '@/services/remindersService';

export default function FamilyDashboard() {
  const router = useRouter();
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
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      console.log('👤 Usuario actual:', userData?.full_name, userData?.id);
      
      // Obtener solo los seniors asignados a este usuario
      const mySeniors = userData?.id 
        ? await seniorsService.getSeniors(userData.id)
        : await seniorsService.getSeniors();
      
      console.log('📋 Mis seniors asignados:', mySeniors.length);
      console.log('🏥 Seniors asignados:', mySeniors.length);
      setSeniors(mySeniors);
      
      // Seleccionar el primer senior por defecto
      if (mySeniors.length > 0) {
        setSelectedSenior(mySeniors[0]);
        console.log('✅ Senior seleccionado:', mySeniors[0].full_name);
        await loadSeniorData(mySeniors[0].id);
      } else {
        setSelectedSenior(null);
        console.log('⚠️ No hay seniors asignados');
      }
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
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
      console.error('❌ Error cargando datos:', error);
    }
  };

  const calculateAge = (birthdate: string | null): number => {
    if (!birthdate) return 0;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleSelectSenior = () => {
    if (seniors.length === 0) {
      Alert.alert('Sin adultos mayores', 'No hay adultos mayores asignados a tu cuidado.');
      return;
    }
    
    if (seniors.length === 1) {
      Alert.alert('Solo hay un adulto mayor', 'Solo tienes un adulto mayor asignado a tu cuidado.');
      return;
    }
    
    const options = [
      ...seniors.map((senior) => senior.full_name),
      'Cancelar'
    ];
    
    Alert.alert(
      'Seleccionar Adulto Mayor',
      'Elige el familiar que deseas monitorear:',
      options.map((option, index) => {
        if (index === options.length - 1) {
          return { text: option, style: 'cancel' };
        }
        return {
          text: option,
          onPress: async () => {
            const selected = seniors[index];
            console.log('Senior seleccionado:', selected);
            setSelectedSenior(selected);
            await loadSeniorData(selected.id);
            Alert.alert('Selección actualizada', `Ahora estás monitoreando a ${selected.full_name}`);
          }
        };
      })
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/login');
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Portal Familiar 💝</Text>
          <Text style={styles.userName}>{user?.full_name || 'Familiar'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Senior Info Card o Estado Vacío */}
      {seniors.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>No hay adultos mayores asignados</Text>
          <Text style={styles.emptyDescription}>
            Para comenzar a monitorear el cuidado de un adulto mayor, necesitas ser agregado a su equipo de cuidado.
          </Text>
          <TouchableOpacity 
            style={styles.emptyActionButton}
            onPress={() => router.push('/pages/family/relations')}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.emptyActionText}>Ver Relaciones</Text>
          </TouchableOpacity>
        </View>
      ) : selectedSenior ? (
        <View style={styles.seniorInfoCard}>
          <View style={styles.seniorCardHeader}>
            <View style={styles.seniorAvatar}>
              <Ionicons name="person" size={40} color="#ec4899" />
            </View>
            <View style={styles.seniorInfo}>
              <Text style={styles.seniorName}>{selectedSenior.full_name}</Text>
              <Text style={styles.seniorDetail}>
                {calculateAge(selectedSenior.birthdate)} años
                {selectedSenior.birthdate && ` • ${new Date(selectedSenior.birthdate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`}
              </Text>
            </View>
            {seniors.length > 1 && (
              <TouchableOpacity style={styles.changeButton} onPress={handleSelectSenior}>
                <Ionicons name="swap-horizontal" size={20} color="#ec4899" />
              </TouchableOpacity>
            )}
          </View>
          {selectedSenior.conditions && (
            <View style={styles.conditionsBox}>
              <Ionicons name="medical" size={18} color="#ec4899" />
              <Text style={styles.conditionsText}>{selectedSenior.conditions}</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Stats */}
      {selectedSenior && (
        <>
          <View style={styles.statsContainer}>
            <View style={[styles.statBox, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="medical" size={28} color="#3b82f6" />
              <Text style={styles.statNumber}>{medications.length}</Text>
              <Text style={styles.statLabel}>Medicamentos</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="notifications" size={28} color="#f59e0b" />
              <Text style={styles.statNumber}>{todayReminders.length}</Text>
              <Text style={styles.statLabel}>Recordatorios Hoy</Text>
            </View>
          </View>

          {/* Today's Medications */}
          {medications.length > 0 && (
            <View style={styles.medicationsSection}>
              <Text style={styles.sectionTitle}>Medicaciones de Hoy 💊</Text>
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
                  <View style={styles.medicationStatus}>
                    <Ionicons 
                      name={med.taken_today ? "checkmark-circle" : "time-outline"} 
                      size={28} 
                      color={med.taken_today ? "#10b981" : "#f59e0b"} 
                    />
                  </View>
                </View>
              ))}
              {medications.length > 3 && (
                <Text style={styles.moreText}>+{medications.length - 3} más medicamentos</Text>
              )}
            </View>
          )}

          {/* Today's Reminders */}
          {todayReminders.length > 0 && (
            <View style={styles.remindersSection}>
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

          {/* Emergency Contact */}
          {selectedSenior.emergency_contact_name && (
            <View style={styles.alertBox}>
              <Ionicons name="call" size={24} color="#10b981" />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Contacto de Emergencia</Text>
                <Text style={styles.alertText}>
                  {selectedSenior.emergency_contact_name}
                  {selectedSenior.emergency_contact_phone && (
                    <Text> • {selectedSenior.emergency_contact_phone}</Text>
                  )}
                </Text>
              </View>
            </View>
          )}
        </>
      )}

      {/* Quick Actions */}
      {selectedSenior && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/pages/family/appointments')}
            >
              <Ionicons name="calendar" size={32} color="#f59e0b" />
              <Text style={styles.actionText}>Ver Citas</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/pages/family/chat')}
            >
              <Ionicons name="chatbubbles" size={32} color="#3b82f6" />
              <Text style={styles.actionText}>Mensajes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/pages/family/relations')}
            >
              <Ionicons name="people" size={32} color="#9333ea" />
              <Text style={styles.actionText}>Mis Familiares</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/pages/hospitals-map' as any)}
            >
              <Ionicons name="medical" size={32} color="#ef4444" />
              <Text style={styles.actionText}>Hospitales</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Medical Info */}
      {selectedSenior && selectedSenior.conditions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Médica</Text>
          <View style={styles.infoCard}>
            <Ionicons name="medical" size={24} color="#6366f1" />
            <Text style={styles.infoText}>{selectedSenior.conditions}</Text>
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
    backgroundColor: '#ec4899',
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
    color: '#fce7f3',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  seniorInfoCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#ec4899',
  },
  seniorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seniorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  seniorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fce7f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seniorInfo: {
    flex: 1,
    marginLeft: 16,
  },
  seniorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  seniorDetail: {
    fontSize: 14,
    color: '#64748b',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 2,
  },
  alertText: {
    fontSize: 14,
    color: '#b45309',
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
  },
  activityList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 4,
    textAlign: 'center',
  },
  changeButton: {
    padding: 8,
    backgroundColor: '#fce7f3',
    borderRadius: 8,
  },
  conditionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fce7f3',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  conditionsText: {
    flex: 1,
    fontSize: 14,
    color: '#831843',
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  medicationsSection: {
    padding: 16,
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
  medicationStatus: {
    marginLeft: 12,
  },
  moreText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  remindersSection: {
    padding: 16,
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
    backgroundColor: '#ec4899',
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

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
import authService, { User } from '@/services/authService';
import seniorsService, { Senior } from '@/services/seniorsService';

export default function CaregiverDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [seniors, setSeniors] = useState<Senior[]>([]);
  const [selectedSenior, setSelectedSenior] = useState<Senior | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
    
    const seniorsData = await seniorsService.getSeniors();
    console.log('Seniors data:', JSON.stringify(seniorsData, null, 2));
    setSeniors(seniorsData);
    
    // Seleccionar primer senior por defecto
    if (seniorsData.length > 0) {
      setSelectedSenior(seniorsData[0]);
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

  const handleSelectSenior = () => {
    if (seniors.length === 0) {
      Alert.alert('Sin pacientes', 'No hay pacientes asignados.');
      return;
    }
    
    Alert.alert(
      'Seleccionar Paciente',
      'Elige el paciente que deseas ver',
      [
        ...seniors.map((senior) => ({
          text: senior.full_name,
          onPress: () => setSelectedSenior(senior),
        })),
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
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

      {/* Patient Selector */}
      {seniors.length > 0 && selectedSenior && (
        <View style={styles.selectedPatientCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Paciente Activo</Text>
            <TouchableOpacity style={styles.changePatientBtn} onPress={handleSelectSenior}>
              <Text style={styles.changePatientText}>Cambiar</Text>
              <Ionicons name="swap-horizontal" size={18} color="#f59e0b" />
            </TouchableOpacity>
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

      {/* Today's Tasks */}
      {selectedSenior && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tareas de Hoy</Text>
          <View style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.taskTitle}>Medicamentos Programados</Text>
            </View>
            <Text style={styles.taskCount}>Ver detalles</Text>
          </View>
          <View style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Ionicons name="calendar" size={24} color="#f59e0b" />
              <Text style={styles.taskTitle}>Citas Médicas</Text>
            </View>
            <Text style={styles.taskCount}>Ver próximas</Text>
          </View>
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
                onPress={() => setSelectedSenior(senior)}
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
                <Ionicons name="medkit" size={24} color="#3b82f6" />
              </View>
              <Text style={styles.actionText}>Gestionar Medicamentos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="document-text" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.actionText}>Notas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="chatbubbles" size={24} color="#10b981" />
              </View>
              <Text style={styles.actionText}>Mensajes</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/pages/hospitals-map' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="medical" size={24} color="#ef4444" />
              </View>
              <Text style={styles.actionText}>Hospitales</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#fce7f3' }]}>
                <Ionicons name="alert-circle" size={24} color="#ec4899" />
              </View>
              <Text style={styles.actionText}>Emergencia</Text>
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
});

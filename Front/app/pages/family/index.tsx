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
import authService, { User } from '@/services/authService';
import seniorsService, { Senior } from '@/services/seniorsService';

export default function FamilyDashboard() {
  const router = useRouter();
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
    
    // Obtener seniors asignados a este familiar
    const seniorsData = await seniorsService.getSeniors();
    setSeniors(seniorsData);
    
    // Seleccionar el primer senior por defecto
    if (seniorsData.length > 0) {
      setSelectedSenior(seniorsData[0]);
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
    
    Alert.alert(
      'Seleccionar Adulto Mayor',
      'Elige el familiar que deseas monitorear',
      [
        ...seniors.map((senior) => ({
          text: senior.full_name,
          onPress: () => setSelectedSenior(senior),
        })),
        { text: 'Cancelar', style: 'cancel' },
      ]
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

      {/* Senior Selector Card */}
      {seniors.length > 0 ? (
        <TouchableOpacity style={styles.seniorCard} onPress={handleSelectSenior}>
          <View style={styles.seniorAvatar}>
            <Ionicons name="person" size={40} color="#ec4899" />
          </View>
          <View style={styles.seniorInfo}>
            <Text style={styles.seniorName}>
              {selectedSenior?.full_name || 'Seleccionar familiar'}
            </Text>
            {selectedSenior && (
              <Text style={styles.seniorDetail}>
                {calculateAge(selectedSenior.birthdate)} años
                {selectedSenior.conditions ? ` • ${selectedSenior.conditions.substring(0, 30)}` : ''}
              </Text>
            )}
          </View>
          <View style={styles.changeButton}>
            <Ionicons name="swap-horizontal" size={20} color="#ec4899" />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No hay adultos mayores asignados</Text>
          <Text style={styles.emptySubtext}>Contacta con un administrador</Text>
        </View>
      )}

      {/* Stats */}
      {selectedSenior && (
        <>
          <View style={styles.statsContainer}>
            <View style={[styles.statBox, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="medical" size={28} color="#3b82f6" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Medicamentos</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="calendar" size={28} color="#f59e0b" />
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Citas</Text>
            </View>
          </View>

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
              onPress={() => Alert.alert('Emergencia', '¿Deseas contactar al equipo médico?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Llamar', onPress: () => {} }
              ])}
            >
              <Ionicons name="alert-circle" size={32} color="#ef4444" />
              <Text style={styles.actionText}>Emergencia</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/pages/hospitals-map' as any)}
            >
              <Ionicons name="medical" size={32} color="#ef4444" />
              <Text style={styles.actionText}>Hospitales</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="document-text" size={32} color="#10b981" />
              <Text style={styles.actionText}>Reportes</Text>
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
});

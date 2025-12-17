// app/pages/doctor/index.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import authService, { User } from '@/services/authService';
import seniorsService, { Senior } from '@/services/seniorsService';

export default function DoctorPatientsScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [seniors, setSeniors] = useState<Senior[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
    
    const seniorsData = await seniorsService.getSeniors();
    setSeniors(seniorsData);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Panel Médico 🩺</Text>
          <Text style={styles.userName}>Dr. {user?.full_name}</Text>
        </View>
        <TouchableOpacity onPress={() => authService.logout()} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
          <Ionicons name="people" size={32} color="#10b981" />
          <Text style={styles.statNumber}>{seniors.length}</Text>
          <Text style={styles.statLabel}>Pacientes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
          <Ionicons name="calendar" size={32} color="#3b82f6" />
          <Text style={styles.statNumber}>5</Text>
          <Text style={styles.statLabel}>Citas Hoy</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mis Pacientes</Text>
        {seniors.length > 0 ? (
          seniors.map((senior) => (
            <TouchableOpacity key={senior.id} style={styles.patientCard}>
              <View style={styles.patientAvatar}>
                <Text style={styles.patientInitials}>
                  {senior.first_name[0]}{senior.last_name[0]}
                </Text>
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>
                  {senior.first_name} {senior.last_name}
                </Text>
                <Text style={styles.patientDetail}>
                  {new Date().getFullYear() - new Date(senior.date_of_birth).getFullYear()} años
                </Text>
                {senior.medical_history && (
                  <Text style={styles.patientHistory} numberOfLines={1}>
                    {senior.medical_history}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No hay pacientes asignados</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#10b981',
    padding: 24,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: { fontSize: 16, color: '#d1fae5', fontWeight: '500' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginTop: 4 },
  logoutButton: { padding: 8 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, padding: 20, borderRadius: 12, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginTop: 8 },
  statLabel: { fontSize: 13, color: '#64748b', marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  patientCard: {
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
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientInitials: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  patientInfo: { flex: 1, marginLeft: 12 },
  patientName: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  patientDetail: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  patientHistory: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#94a3b8', marginTop: 16 },
});

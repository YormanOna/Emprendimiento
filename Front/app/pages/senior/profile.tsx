// app/pages/senior/profile.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import authService, { User } from '@/services/authService';

export default function SeniorProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.full_name.split(' ').map(n => n[0]).join('') || 'S'}</Text>
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Adulto Mayor</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={28} color="#8b5cf6" />
          <Text style={styles.menuText}>Mi Información</Text>
          <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={28} color="#8b5cf6" />
          <Text style={styles.menuText}>Notificaciones</Text>
          <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={28} color="#8b5cf6" />
          <Text style={styles.menuText}>Ayuda</Text>
          <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={28} color="#ef4444" />
          <Text style={[styles.menuText, { color: '#ef4444' }]}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#fff', padding: 36, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  avatarText: { fontSize: 42, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 26, fontWeight: 'bold', color: '#1e293b', marginBottom: 6 },
  email: { fontSize: 15, color: '#64748b', marginBottom: 14 },
  badge: { backgroundColor: '#ede9fe', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 24 },
  badgeText: { fontSize: 14, fontWeight: '600', color: '#8b5cf6' },
  section: { padding: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  menuText: { flex: 1, fontSize: 17, color: '#1e293b', marginLeft: 16 },
});

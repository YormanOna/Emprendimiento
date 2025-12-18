import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import authService, { User } from '@/services/authService';

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('🔍 Verificando autenticación...');
      const currentUser = await authService.getCurrentUser();
      console.log('👤 Usuario actual:', currentUser?.email || 'No autenticado');
      setUser(currentUser);
    } catch (error) {
      console.error('❌ Error verificando auth:', error);
      setUser(null);
    } finally {
      setLoading(false);
      setIsChecking(false);
    }
  };

  if (loading || isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!user) {
    console.log('🔓 No hay usuario, redirigiendo a login');
    return <Redirect href="/login" />;
  }

  // Redirigir según el rol del usuario
  const roleRoutes: Record<string, string> = {
    ADMIN: '/pages/admin',
    DOCTOR: '/pages/doctor',
    CAREGIVER: '/pages/caregiver',
    FAMILY: '/pages/family',
    SENIOR: '/pages/senior',
  };

  const redirectTo = roleRoutes[user.role] || '/login';
  console.log('📍 Redirigiendo a:', redirectTo);
  
  return <Redirect href={redirectTo} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});

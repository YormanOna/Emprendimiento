import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import authService, { User } from '@/services/authService';

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!user) {
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

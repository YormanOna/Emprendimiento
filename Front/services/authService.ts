import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  role: 'CAREGIVER' | 'FAMILY' | 'SENIOR';
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

class AuthService {
  async login(data: LoginData): Promise<User> {
    try {
      console.log('🔐 Intentando login...', data.email);
      const response = await api.post<AuthResponse>('/auth/login', data);
      console.log('✅ Login exitoso, tokens recibidos');
      
      const { access_token, refresh_token } = response.data;

      // Guardar tokens
      await AsyncStorage.setItem('access_token', access_token);
      await AsyncStorage.setItem('refresh_token', refresh_token);
      console.log('💾 Tokens guardados');

      // Obtener datos del usuario
      const userResponse = await api.get<User>('/me');
      const user = userResponse.data;
      console.log('👤 Usuario obtenido:', user.email);

      await AsyncStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error: any) {
      console.error('❌ Error en login:', error.message);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Tiempo de espera agotado. Verifica tu conexión.');
      }
      if (!error.response) {
        throw new Error('No se pudo conectar al servidor. Verifica que esté corriendo.');
      }
      throw error;
    }
  }

  async register(data: RegisterData): Promise<User> {
    try {
      console.log('📝 Intentando registrar usuario:', { ...data, password: '***' });
      const response = await api.post<User>('/register', data);
      console.log('✅ Usuario registrado exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error en registro:', error.response?.data || error.message);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('Error al hacer logout:', error);
    } finally {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const userStr = await AsyncStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('access_token');
    return !!token;
  }
}

export default new AuthService();

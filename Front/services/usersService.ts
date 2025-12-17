// services/usersService.ts
import api from './api';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  role: 'CAREGIVER' | 'FAMILY' | 'SENIOR';
}

export interface RegisterDoctorData {
  full_name: string;
  email: string;
  password: string;
  specialty?: string;
  license_number?: string;
}

class UsersService {
  async getUsers(): Promise<User[]> {
    try {
      const response = await api.get<User[]>('/users');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      return [];
    }
  }

  async registerUser(data: RegisterData): Promise<User | null> {
    try {
      const response = await api.post<User>('/register', data);
      return response.data;
    } catch (error) {
      console.error('Error registrando usuario:', error);
      return null;
    }
  }

  async registerDoctor(data: RegisterDoctorData): Promise<User | null> {
    try {
      const response = await api.post<User>('/register-doctor', data);
      return response.data;
    } catch (error) {
      console.error('Error registrando doctor:', error);
      return null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get<User>('/me');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      return null;
    }
  }

  async updateUser(userId: number, data: Partial<User>): Promise<User | null> {
    try {
      const response = await api.put<User>(`/users/${userId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      return null;
    }
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      await api.delete(`/users/${userId}`);
      return true;
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      return false;
    }
  }
}

export default new UsersService();

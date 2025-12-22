// services/seniorsService.ts
import api from './api';

export interface Senior {
  id: number;
  full_name: string;
  birthdate: string | null;
  conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface SeniorCreate {
  full_name: string;
  birthdate?: string;
  conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface TeamMember {
  id: number;
  senior_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_role: string;
  added_at: string;
}

export interface TeamMemberAdd {
  user_id: number;
  membership_role: 'SELF' | 'DOCTOR' | 'NURSE' | 'CAREGIVER' | 'PRIMARY_CAREGIVER' | 'FAMILY' | 'OTHER';
  can_view?: boolean;
  can_edit?: boolean;
}

class SeniorsService {
  async getSeniors(userId?: number): Promise<Senior[]> {
    try {
      const params = userId ? { user_id: userId } : {};
      const response = await api.get<Senior[]>('/seniors/', { params });
      return response.data;
    } catch (error) {
      console.error('Error obteniendo seniors:', error);
      return [];
    }
  }

  async getSenior(id: number): Promise<Senior | null> {
    try {
      const response = await api.get<Senior>(`/seniors/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo senior:', error);
      return null;
    }
  }

  async createSenior(data: SeniorCreate): Promise<Senior | null> {
    try {
      const response = await api.post<Senior>('/seniors/', data);
      return response.data;
    } catch (error) {
      console.error('Error creando senior:', error);
      return null;
    }
  }

  async getTeam(seniorId: number): Promise<TeamMember[]> {
    try {
      const response = await api.get<TeamMember[]>(`/seniors/${seniorId}/team`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo equipo:', error);
      return [];
    }
  }

  async addTeamMember(seniorId: number, data: TeamMemberAdd): Promise<TeamMember | null> {
    try {
      const response = await api.post<TeamMember>(`/seniors/${seniorId}/team`, data);
      return response.data;
    } catch (error) {
      console.error('Error agregando miembro del equipo:', error);
      return null;
    }
  }
}

export default new SeniorsService();

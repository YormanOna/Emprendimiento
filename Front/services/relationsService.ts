import api from './api';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  senior_id?: number; // Solo para usuarios de rol SENIOR
  created_at: string;
}

export interface CareTeamMember {
  id: number;
  senior_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_role: string;
  membership_role: string;
  can_view: boolean;
  can_edit: boolean;
  added_at: string;
}

export interface Relation {
  id: number;
  senior_id: number;
  senior_name: string;
  user_id: number;
  user_name: string;
  membership_role: string;
  can_view: boolean;
  can_edit: boolean;
}

export interface AddTeamMemberPayload {
  user_id: number;
  membership_role: 'SELF' | 'DOCTOR' | 'NURSE' | 'CAREGIVER' | 'PRIMARY_CAREGIVER' | 'FAMILY' | 'OTHER';
  can_view?: boolean;
  can_edit?: boolean;
}

/**
 * Buscar usuarios por nombre o email
 */
export const searchUsers = async (query: string, role?: string): Promise<User[]> => {
  try {
    const params = new URLSearchParams({ q: query });
    if (role) params.append('role', role);
    
    const response = await api.get(`/users/search?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

/**
 * Obtener todos los usuarios del sistema
 */
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get('/users');
    return response.data;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};

/**
 * Obtener el equipo de cuidado de un senior
 */
export const getSeniorTeam = async (seniorId: number): Promise<CareTeamMember[]> => {
  try {
    const response = await api.get(`/seniors/${seniorId}/team`);
    return response.data;
  } catch (error) {
    console.error('Error getting senior team:', error);
    throw error;
  }
};

/**
 * Agregar un miembro al equipo de cuidado de un senior
 */
export const addTeamMember = async (
  seniorId: number,
  payload: AddTeamMemberPayload
): Promise<CareTeamMember> => {
  try {
    const response = await api.post(`/seniors/${seniorId}/team`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 409) {
      throw new Error('Este usuario ya está en el equipo de cuidado');
    }
    console.error('Error adding team member:', error);
    throw error;
  }
};

/**
 * Eliminar un miembro del equipo de cuidado
 */
export const removeTeamMember = async (
  seniorId: number,
  memberId: number
): Promise<void> => {
  try {
    await api.delete(`/seniors/${seniorId}/team/${memberId}`);
  } catch (error) {
    console.error('Error removing team member:', error);
    throw error;
  }
};

/**
 * Obtener todas las relaciones del usuario actual
 * (los seniors que cuida/monitorea)
 */
export const getMyRelations = async (): Promise<Relation[]> => {
  try {
    const response = await api.get('/seniors/my-relations/all');
    return response.data;
  } catch (error) {
    console.error('Error getting my relations:', error);
    throw error;
  }
};

export default {
  searchUsers,
  getAllUsers,
  getSeniorTeam,
  addTeamMember,
  removeTeamMember,
  getMyRelations,
};

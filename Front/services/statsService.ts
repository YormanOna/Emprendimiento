// services/statsService.ts
import api from './api';

export interface DashboardStats {
  total_medications: number;
  upcoming_appointments: number;
  pending_reminders: number;
  recent_activities: Activity[];
}

export interface Activity {
  id: number;
  type: 'medication' | 'appointment' | 'chat' | 'reminder';
  description: string;
  timestamp: string;
  color: string;
}

class StatsService {
  async getDashboardStats(seniorId?: number): Promise<DashboardStats> {
    try {
      const params = seniorId ? { senior_id: seniorId } : {};
      const response = await api.get<DashboardStats>('/stats/dashboard', { params });
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      // Devolver datos por defecto en caso de error
      return {
        total_medications: 0,
        upcoming_appointments: 0,
        pending_reminders: 0,
        recent_activities: [],
      };
    }
  }
}

export default new StatsService();

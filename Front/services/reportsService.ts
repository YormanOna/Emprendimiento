// services/reportsService.ts
import api from './api';

export interface SeniorStats {
  total_medications: number;
  total_appointments: number;
  total_reminders: number;
  medications_taken_this_week: number;
  appointments_this_month: number;
  last_activity_date?: string;
}

export interface Report {
  id: number;
  senior_id: number;
  report_type: string;
  start_date: string;
  end_date: string;
  data: any;
  generated_at: string;
  generated_by_user_id: number;
}

export interface ReportCreate {
  report_type: 'monthly' | 'weekly' | 'custom';
  start_date: string;
  end_date: string;
}

// Nuevas interfaces para reportes mejorados
export interface MedicationAdherenceDetail {
  medication_name: string;
  total_doses: number;
  taken: number;
  missed: number;
  adherence_rate: number;
}

export interface AppointmentSummary {
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  missed: number;
}

export interface ActivityByHour {
  hour: number;
  medication_intakes: number;
  appointments: number;
  reminders: number;
}

export interface CareTeamActivity {
  user_id: number;
  user_name: string;
  role: string;
  actions_count: number;
  last_activity: string | null;
}

export interface SeniorHealthReport {
  senior_id: number;
  senior_name: string;
  period_start: string;
  period_end: string;
  total_medications: number;
  medication_adherence: number;
  medications_detail: MedicationAdherenceDetail[];
  appointments_summary: AppointmentSummary;
  total_reminders: number;
  completed_reminders: number;
  activity_by_hour: ActivityByHour[];
  most_active_hours: number[];
  care_team_activity: CareTeamActivity[];
  insights: string[];
}

export interface GlobalStats {
  total_seniors: number;
  total_caregivers: number;
  total_family_members: number;
  total_doctors: number;
  total_medications: number;
  total_appointments_today: number;
  active_reminders: number;
  average_adherence: number;
  top_performing_seniors: any[];
  seniors_needing_attention: any[];
}

export interface QuickStats {
  period_days: number;
  medication_adherence: number;
  total_doses: number;
  doses_taken: number;
  upcoming_appointments: number;
  pending_reminders_today: number;
}

export interface CareTeamPerformance {
  user_id: number;
  user_name: string;
  role: string;
  period_days: number;
  total_actions: number;
  avg_actions_per_day: number;
  seniors_under_care: number;
  last_activity: {
    timestamp: string;
    action: string;
  } | null;
}

class ReportsService {
  async getSeniorStats(seniorId: number): Promise<SeniorStats | null> {
    try {
      const response = await api.get<SeniorStats>(`/stats/seniors/${seniorId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estadísticas del adulto mayor:', error);
      return null;
    }
  }

  async createReport(seniorId: number, data: ReportCreate): Promise<Report | null> {
    try {
      const response = await api.post<Report>(`/stats/seniors/${seniorId}/reports`, data);
      return response.data;
    } catch (error) {
      console.error('Error creando reporte:', error);
      return null;
    }
  }

  // ==================== NUEVOS MÉTODOS MEJORADOS ====================

  async getSeniorHealthReport(
    seniorId: number,
    periodStart: string,
    periodEnd: string
  ): Promise<SeniorHealthReport | null> {
    try {
      const response = await api.get<SeniorHealthReport>(
        `/stats/seniors/${seniorId}/health-report`,
        { params: { period_start: periodStart, period_end: periodEnd } }
      );
      return response.data;
    } catch (error) {
      console.error('Error obteniendo reporte de salud:', error);
      return null;
    }
  }

  async getGlobalStats(): Promise<GlobalStats | null> {
    try {
      const response = await api.get<GlobalStats>('/stats/global-stats');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estadísticas globales:', error);
      return null;
    }
  }

  async getQuickStats(seniorId: number, days: number = 7): Promise<QuickStats | null> {
    try {
      const response = await api.get<QuickStats>(
        `/stats/seniors/${seniorId}/quick-stats`,
        { params: { days } }
      );
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estadísticas rápidas:', error);
      return null;
    }
  }

  async getCareTeamPerformance(
    userId: number,
    days: number = 30
  ): Promise<CareTeamPerformance | null> {
    try {
      const response = await api.get<CareTeamPerformance>(
        `/stats/care-team/${userId}/performance`,
        { params: { days } }
      );
      return response.data;
    } catch (error) {
      console.error('Error obteniendo desempeño del equipo:', error);
      return null;
    }
  }

  async getReport(reportId: number): Promise<Report | null> {
    try {
      const response = await api.get<Report>(`/stats/reports/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo reporte:', error);
      return null;
    }
  }

  async downloadReport(reportId: number): Promise<Blob | null> {
    try {
      const response = await api.get(`/stats/reports/${reportId}/download`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error descargando reporte:', error);
      return null;
    }
  }
}

export default new ReportsService();

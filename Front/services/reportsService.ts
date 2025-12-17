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

// services/appointmentsService.ts
import api from './api';

export interface Appointment {
  id: number;
  senior_id: number;
  doctor_user_id?: number;
  doctor_name?: string;
  specialty?: string;
  starts_at: string;
  scheduled_at?: string; // Alias para starts_at (opcional)
  ends_at?: string;
  location?: string;
  reason?: string;
  notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentCreate {
  scheduled_at: string;
  doctor_name?: string;
  specialty?: string;
  location?: string;
  reason?: string;
  notes?: string;
  doctor_user_id?: number;
}

export interface AppointmentUpdate {
  doctor_user_id?: number;
  starts_at?: string;
  location?: string;
  reason?: string;
  status?: string;
}

export interface AppointmentNote {
  id: number;
  appointment_id: number;
  note: string;
  author_user_id: number;
  created_at: string;
}

export interface AppointmentNoteCreate {
  note: string;
}

class AppointmentsService {
  async getAllAppointments(params?: {
    from_date?: string;
    to_date?: string;
    status?: string;
  }): Promise<Appointment[]> {
    try {
      const response = await api.get<Appointment[]>('/appointments/appointments', { params });
      return response.data;
    } catch (error) {
      console.error('Error obteniendo todas las citas:', error);
      return [];
    }
  }

  async getAppointments(seniorId: number): Promise<Appointment[]> {
    try {
      const response = await api.get<Appointment[]>(`/appointments/seniors/${seniorId}/appointments`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo citas:', error);
      return [];
    }
  }

  async getAppointment(appointmentId: number): Promise<Appointment | null> {
    try {
      const response = await api.get<Appointment>(`/appointments/appointments/${appointmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo cita:', error);
      return null;
    }
  }

  async createAppointment(seniorId: number, data: AppointmentCreate): Promise<Appointment | null> {
    try {
      const response = await api.post<Appointment>(`/appointments/seniors/${seniorId}/appointments`, data);
      return response.data;
    } catch (error) {
      console.error('Error creando cita:', error);
      return null;
    }
  }

  async updateAppointment(appointmentId: number, data: AppointmentUpdate): Promise<Appointment | null> {
    try {
      const response = await api.patch<Appointment>(`/appointments/appointments/${appointmentId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error actualizando cita:', error);
      return null;
    }
  }

  async deleteAppointment(appointmentId: number): Promise<boolean> {
    try {
      await api.delete(`/appointments/appointments/${appointmentId}`);
      return true;
    } catch (error) {
      console.error('Error eliminando cita:', error);
      return false;
    }
  }

  async getNotes(appointmentId: number): Promise<AppointmentNote[]> {
    try {
      const response = await api.get<AppointmentNote[]>(`/appointments/appointments/${appointmentId}/notes`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo notas:', error);
      return [];
    }
  }

  async addNote(appointmentId: number, data: AppointmentNoteCreate): Promise<AppointmentNote | null> {
    try {
      const response = await api.post<AppointmentNote>(`/appointments/appointments/${appointmentId}/notes`, data);
      return response.data;
    } catch (error) {
      console.error('Error agregando nota:', error);
      return null;
    }
  }
}

export default new AppointmentsService();

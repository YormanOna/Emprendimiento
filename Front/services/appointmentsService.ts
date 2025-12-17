// services/appointmentsService.ts
import api from './api';

export interface Appointment {
  id: number;
  senior_id: number;
  doctor_user_id: number;
  starts_at: string;
  ends_at?: string;
  location?: string;
  reason?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentCreate {
  starts_at: string;
  location?: string;
  reason?: string;
  doctor_user_id: number;
}

export interface AppointmentNote {
  id: number;
  appointment_id: number;
  note: string;
  created_by_user_id: number;
  created_by_name?: string;
  created_at: string;
}

export interface AppointmentNoteCreate {
  note: string;
}

class AppointmentsService {
  async getAllAppointments(): Promise<Appointment[]> {
    try {
      const response = await api.get<Appointment[]>('/appointments/appointments');
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

  async createAppointment(seniorId: number, data: AppointmentCreate): Promise<Appointment | null> {
    try {
      const response = await api.post<Appointment>(`/appointments/seniors/${seniorId}/appointments`, data);
      return response.data;
    } catch (error) {
      console.error('Error creando cita:', error);
      return null;
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

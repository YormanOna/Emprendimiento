// services/remindersService.ts
import api from './api';

export interface Reminder {
  id: number;
  senior_id: number;
  title: string;
  description?: string;
  scheduled_at: string;
  repeat_rule?: string;
  status: 'PENDING' | 'DONE' | 'CANCELLED';
  done_at?: string;
  actor_user_id?: number;
  created_at: string;
  updated_at: string;
}

export interface ReminderCreate {
  title: string;
  description?: string;
  scheduled_at: string;
  repeat_rule?: string;
}

export interface ReminderUpdate {
  title?: string;
  description?: string;
  scheduled_at?: string;
  repeat_rule?: string;
  status?: 'PENDING' | 'DONE' | 'CANCELLED';
}

class RemindersService {
  async getReminders(seniorId: number, date?: string, status?: string): Promise<Reminder[]> {
    try {
      const params: any = {};
      if (date) params.date = date;
      if (status) params.status = status;
      
      const response = await api.get<Reminder[]>(
        `/reminders/seniors/${seniorId}/reminders`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('Error obteniendo recordatorios:', error);
      return [];
    }
  }

  async createReminder(seniorId: number, data: ReminderCreate): Promise<Reminder | null> {
    try {
      const response = await api.post<Reminder>(`/reminders/seniors/${seniorId}/reminders`, data);
      return response.data;
    } catch (error) {
      console.error('Error creando recordatorio:', error);
      return null;
    }
  }

  async markDone(reminderId: number): Promise<Reminder | null> {
    try {
      const response = await api.post<Reminder>(`/reminders/${reminderId}/done`);
      return response.data;
    } catch (error) {
      console.error('Error marcando recordatorio:', error);
      return null;
    }
  }

  async updateStatus(reminderId: number, status: 'PENDING' | 'DONE' | 'CANCELLED'): Promise<Reminder | null> {
    try {
      const response = await api.patch<Reminder>(
        `/reminders/${reminderId}/status`,
        { status }
      );
      return response.data;
    } catch (error) {
      console.error('Error actualizando estado:', error);
      return null;
    }
  }

  async updateReminder(reminderId: number, data: ReminderUpdate): Promise<Reminder | null> {
    try {
      const response = await api.patch<Reminder>(`/reminders/${reminderId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error actualizando recordatorio:', error);
      return null;
    }
  }

  async deleteReminder(reminderId: number): Promise<boolean> {
    try {
      await api.delete(`/reminders/${reminderId}`);
      return true;
    } catch (error) {
      console.error('Error eliminando recordatorio:', error);
      return false;
    }
  }
}

export default new RemindersService();

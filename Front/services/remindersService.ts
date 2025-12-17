// services/remindersService.ts
import api from './api';

export interface Reminder {
  id: number;
  senior_id: number;
  title: string;
  description?: string;
  scheduled_at: string;
  repeat_rule?: string;
  status: string;
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

class RemindersService {
  async getReminders(seniorId: number): Promise<Reminder[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get<Reminder[]>(`/reminders/seniors/${seniorId}/reminders?date_=${today}`);
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

  async markDone(reminderId: number): Promise<boolean> {
    try {
      await api.post(`/reminders/${reminderId}/done`);
      return true;
    } catch (error) {
      console.error('Error marcando recordatorio:', error);
      return false;
    }
  }
}

export default new RemindersService();

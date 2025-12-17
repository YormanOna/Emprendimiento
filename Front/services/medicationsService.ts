// services/medicationsService.ts
import api from './api';

export interface Medication {
  id: number;
  senior_id: number;
  name: string;
  dose: string;
  unit: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MedicationCreate {
  name: string;
  dose: string;
  unit: string;
  notes?: string;
}

export interface Schedule {
  id: number;
  medication_id: number;
  time_of_day: string;
  frequency: string;
  created_at: string;
}

export interface ScheduleCreate {
  time_of_day: string;
  frequency: string;
}

export interface Intake {
  id: number;
  medication_id: number;
  senior_id: number;
  scheduled_at: string;
  taken_at?: string;
  status: string;
  actor_user_id?: number;
  created_at: string;
}

export interface IntakeCreate {
  medication_id: number;
  scheduled_at: string;
}

class MedicationsService {
  async getAllMedications(): Promise<Medication[]> {
    try {
      const response = await api.get<Medication[]>('/meds/medications');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo todos los medicamentos:', error);
      return [];
    }
  }

  async getMedications(seniorId: number): Promise<Medication[]> {
    try {
      const response = await api.get<Medication[]>(`/meds/seniors/${seniorId}/medications`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo medicamentos:', error);
      return [];
    }
  }

  async createMedication(seniorId: number, data: MedicationCreate): Promise<Medication | null> {
    try {
      const response = await api.post<Medication>(`/meds/seniors/${seniorId}/medications`, data);
      return response.data;
    } catch (error) {
      console.error('Error creando medicamento:', error);
      return null;
    }
  }

  async createSchedule(medicationId: number, data: ScheduleCreate): Promise<Schedule | null> {
    try {
      const response = await api.post<Schedule>(`/meds/medications/${medicationId}/schedule`, data);
      return response.data;
    } catch (error) {
      console.error('Error creando horario:', error);
      return null;
    }
  }

  async getIntakes(seniorId: number): Promise<Intake[]> {
    try {
      const response = await api.get<Intake[]>(`/meds/seniors/${seniorId}/intakes`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo tomas:', error);
      return [];
    }
  }

  async recordIntake(data: IntakeCreate): Promise<Intake | null> {
    try {
      const response = await api.post<Intake>('/meds/intakes', data);
      return response.data;
    } catch (error) {
      console.error('Error registrando toma:', error);
      return null;
    }
  }
}

export default new MedicationsService();

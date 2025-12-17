// app/pages/caregiver/reminders.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import remindersService, { Reminder } from '@/services/remindersService';
import seniorsService from '@/services/seniorsService';
import { Alert } from 'react-native';

export default function RemindersScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      // Obtener el primer senior disponible
      const seniors = await seniorsService.getSeniors();
      if (seniors.length > 0) {
        const data = await remindersService.getReminders(seniors[0].id);
        setReminders(data);
      }
    } catch (error) {
      console.error('Error cargando recordatorios:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReminders();
    setRefreshing(false);
  };

  const handleMarkDone = async (id: number) => {
    await remindersService.markDone(id);
    loadReminders();
  };

  const handleDelete = async (id: number) => {
    // TODO: Implementar eliminación cuando el backend tenga el endpoint
    console.log('Eliminar recordatorio:', id);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.headerBar}>
        <Text style={styles.pageTitle}>RECORDATORIOS</Text>
      </View>

      {/* Lista de Recordatorios */}
      <View style={styles.content}>
        {reminders.length > 0 ? (
          reminders.map((reminder) => {
            const date = new Date(reminder.scheduled_at);
            const dateStr = date.toISOString().split('T')[0];
            const timeStr = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            
            return (
              <View key={reminder.id} style={styles.reminderCard}>
                <View style={styles.reminderHeader}>
                  <Text style={styles.reminderTitle}>{reminder.title}</Text>
                </View>
                
                {reminder.description && (
                  <Text style={styles.reminderDescription}>{reminder.description}</Text>
                )}
                
                <View style={styles.reminderFooter}>
                  <Text style={styles.reminderDate}>{dateStr}</Text>
                  <Text style={styles.reminderTime}>{timeStr}</Text>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.doneButton]}
                    onPress={() => handleMarkDone(reminder.id)}
                    disabled={reminder.status === 'DONE'}
                  >
                    <Text style={styles.buttonText}>
                      {reminder.status === 'DONE' ? 'Hecho' : 'Hecho'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.button, styles.deleteButton]}
                    onPress={() => handleDelete(reminder.id)}
                  >
                    <Text style={styles.buttonText}>Borrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay recordatorios</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerBar: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    marginBottom: 20,
  },
  pageTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#000',
    textAlign: 'center',
    letterSpacing: 1,
  },
  content: {
    padding: 16,
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reminderHeader: {
    marginBottom: 12,
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  reminderDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  reminderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reminderDate: {
    fontSize: 14,
    color: '#666',
  },
  reminderTime: {
    fontSize: 14,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#DC3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: { 
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: { 
    fontSize: 15, 
    color: '#999',
    textAlign: 'center',
  },
});

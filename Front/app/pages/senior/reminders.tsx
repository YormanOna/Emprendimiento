// app/pages/senior/reminders.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import remindersService, { Reminder } from '@/services/remindersService';
import authService from '@/services/authService';

export default function SeniorRemindersScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        const data = await remindersService.getReminders(user.id);
        setReminders(data);
      }
    } catch (error) {
      console.error('Error obteniendo recordatorios:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReminders();
    setRefreshing(false);
  };

  const handleMarkDone = async (reminderId: number, title: string) => {
    try {
      await remindersService.markDone(reminderId);
      Alert.alert('¡Completado!', `"${title}" marcado como hecho`);
      await loadReminders();
    } catch (error) {
      Alert.alert('Error', 'No se pudo marcar como hecho');
    }
  };

  const handleDelete = async (reminderId: number, title: string) => {
    Alert.alert(
      'Confirmar',
      `¿Eliminar "${title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            // Aquí iría la llamada al API para borrar
            // Por ahora solo removemos localmente
            setReminders(reminders.filter(r => r.id !== reminderId));
          }
        }
      ]
    );
  };

  const getIconName = (title: string): any => {
    const lower = title.toLowerCase();
    if (lower.includes('medicin') || lower.includes('pastill')) return 'medical';
    if (lower.includes('cita') || lower.includes('doctor')) return 'calendar';
    if (lower.includes('terapi') || lower.includes('ejercici')) return 'fitness';
    if (lower.includes('comid') || lower.includes('aliment')) return 'restaurant';
    return 'checkmark-circle';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recordatorios</Text>
        <Text style={styles.headerSubtitle}>
          {reminders.filter(r => !r.done_at).length} pendientes
        </Text>
      </View>

      {/* Lista de recordatorios */}
      <View style={styles.content}>
        {reminders.length > 0 ? (
          reminders.map((reminder) => {
            const isDone = !!reminder.done_at;
            const scheduledDate = new Date(reminder.scheduled_at);
            
            return (
              <View 
                key={reminder.id} 
                style={[styles.reminderCard, isDone && styles.reminderCardDone]}
              >
                {/* Título e icono */}
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBox, isDone && styles.iconBoxDone]}>
                    <Ionicons 
                      name={getIconName(reminder.title)} 
                      size={28} 
                      color={isDone ? '#94a3b8' : '#8b5cf6'} 
                    />
                  </View>
                  <View style={styles.titleSection}>
                    <Text style={[styles.reminderTitle, isDone && styles.textDone]}>
                      {reminder.title}
                    </Text>
                    {reminder.description && (
                      <Text style={[styles.reminderDesc, isDone && styles.textDone]}>
                        {reminder.description}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Fecha y hora */}
                <View style={styles.dateTimeRow}>
                  <View style={styles.dateTimeItem}>
                    <Ionicons name="calendar-outline" size={16} color="#64748b" />
                    <Text style={styles.dateTimeText}>
                      {scheduledDate.toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={styles.dateTimeItem}>
                    <Ionicons name="time-outline" size={16} color="#64748b" />
                    <Text style={styles.dateTimeText}>
                      {scheduledDate.toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>

                {/* Botones de acción */}
                {!isDone && (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.doneBtn}
                      onPress={() => handleMarkDone(reminder.id, reminder.title)}
                    >
                      <Text style={styles.doneBtnText}>Hecho</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(reminder.id, reminder.title)}
                    >
                      <Text style={styles.deleteBtnText}>Borrar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isDone && (
                  <View style={styles.doneLabel}>
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                    <Text style={styles.doneLabelText}>Completado</Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={80} color="#cbd5e1" />
            <Text style={styles.emptyText}>No tienes recordatorios</Text>
            <Text style={styles.emptySubtext}>Tus recordatorios aparecerán aquí</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 6 },
  headerSubtitle: { fontSize: 14, color: '#64748b' },
  content: { padding: 16 },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  reminderCardDone: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxDone: {
    backgroundColor: '#f1f5f9',
  },
  titleSection: { flex: 1, marginLeft: 16 },
  reminderTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  reminderDesc: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  textDone: { color: '#94a3b8' },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  dateTimeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateTimeText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  doneBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  doneLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  doneLabelText: { color: '#10b981', fontSize: 16, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#64748b', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
});

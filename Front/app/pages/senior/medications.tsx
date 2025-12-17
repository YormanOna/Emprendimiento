// app/pages/senior/medications.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import medicationsService, { Medication } from '@/services/medicationsService';
import remindersService, { Reminder } from '@/services/remindersService';
import authService from '@/services/authService';

type TabType = 'medications' | 'intakes' | 'reminders';

export default function SeniorMedicationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('medications');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        const data = await medicationsService.getMedications(user.id);
        setMedications(data);
        
        const remindersData = await remindersService.getReminders(user.id);
        setReminders(remindersData);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedications();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Medicamentos</Text>
          <Text style={styles.headerSubtitle}>
            {medications.length} {medications.length === 1 ? 'medicamento' : 'medicamentos'} registrados
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'medications' && styles.activeTab]}
          onPress={() => setActiveTab('medications')}
        >
          <Ionicons 
            name="medical" 
            size={20} 
            color={activeTab === 'medications' ? '#8b5cf6' : '#94a3b8'} 
          />
          <Text style={[styles.tabText, activeTab === 'medications' && styles.activeTabText]}>
            Mis Medicamentos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'intakes' && styles.activeTab]}
          onPress={() => setActiveTab('intakes')}
        >
          <Ionicons 
            name="checkmark-circle" 
            size={20} 
            color={activeTab === 'intakes' ? '#8b5cf6' : '#94a3b8'} 
          />
          <Text style={[styles.tabText, activeTab === 'intakes' && styles.activeTabText]}>
            Registro
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reminders' && styles.activeTab]}
          onPress={() => setActiveTab('reminders')}
        >
          <Ionicons 
            name="notifications" 
            size={20} 
            color={activeTab === 'reminders' ? '#8b5cf6' : '#94a3b8'} 
          />
          <Text style={[styles.tabText, activeTab === 'reminders' && styles.activeTabText]}>
            Recordatorios
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido según tab activo */}
      <View style={styles.content}>
        {activeTab === 'medications' ? (
          // Lista de Medicamentos
          medications.length > 0 ? (
            medications.map((med) => (
              <TouchableOpacity 
                key={med.id} 
                style={styles.medCard}
                onPress={() => router.push(`/pages/senior/medication-detail?id=${med.id}`)}
              >
                <View style={styles.medIcon}>
                  <Ionicons name="medical" size={28} color="#8b5cf6" />
                </View>
                <View style={styles.medContent}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <View style={styles.doseRow}>
                    <Ionicons name="flask-outline" size={16} color="#64748b" />
                    <Text style={styles.medDose}>{med.dose} {med.unit}</Text>
                  </View>
                  {med.notes && (
                    <View style={styles.notesRow}>
                      <Ionicons name="information-circle-outline" size={16} color="#64748b" />
                      <Text style={styles.medNotes}>{med.notes}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.moreBtn}>
                  <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No tienes medicamentos registrados</Text>
              <Text style={styles.emptySubtext}>Consulta con tu médico para agregar medicamentos</Text>
            </View>
          )
        ) : activeTab === 'intakes' ? (
          // Registro de Tomas (próximamente)
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>Registro de Tomas</Text>
            <Text style={styles.emptySubtext}>Aquí verás el historial de cuando has tomado tus medicamentos</Text>
          </View>
        ) : (
          // Recordatorios
          reminders.length > 0 ? (
            reminders.map((reminder) => {
              const isDone = !!reminder.done_at;
              const scheduledDate = new Date(reminder.scheduled_at);
              
              return (
                <View key={reminder.id} style={[styles.reminderCard, isDone && styles.reminderCardDone]}>
                  <View style={styles.reminderHeader}>
                    <View style={[styles.reminderIcon, isDone && styles.reminderIconDone]}>
                      <Ionicons 
                        name={reminder.title.toLowerCase().includes('medicin') ? 'medical' : 'notifications'}
                        size={24} 
                        color={isDone ? '#94a3b8' : '#8b5cf6'} 
                      />
                    </View>
                    <View style={styles.reminderContent}>
                      <Text style={[styles.reminderTitle, isDone && styles.textDone]}>
                        {reminder.title}
                      </Text>
                      {reminder.description && (
                        <Text style={[styles.reminderDesc, isDone && styles.textDone]}>
                          {reminder.description}
                        </Text>
                      )}
                      <Text style={styles.reminderTime}>
                        {scheduledDate.toLocaleDateString('es-MX')} {scheduledDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                  {!isDone && (
                    <View style={styles.reminderActions}>
                      <TouchableOpacity
                        style={styles.doneBtn}
                        onPress={async () => {
                          await remindersService.markDone(reminder.id);
                          Alert.alert('¡Completado!', `"${reminder.title}" marcado como hecho`);
                          loadMedications();
                        }}
                      >
                        <Text style={styles.doneBtnText}>Hecho</Text>
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
              <Ionicons name="notifications-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No tienes recordatorios</Text>
              <Text style={styles.emptySubtext}>Tus recordatorios aparecerán aquí</Text>
            </View>
          )
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#f3e8ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  activeTabText: {
    color: '#8b5cf6',
  },
  content: { padding: 16 },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  medIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medContent: { flex: 1, marginLeft: 16 },
  medName: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 6 },
  doseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  medDose: { fontSize: 14, color: '#64748b', marginLeft: 6 },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  medNotes: { fontSize: 13, color: '#94a3b8', marginLeft: 6, flex: 1 },
  moreBtn: { padding: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 8, textAlign: 'center' },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  reminderCardDone: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    opacity: 0.7,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reminderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderIconDone: {
    backgroundColor: '#f1f5f9',
  },
  reminderContent: { flex: 1, marginLeft: 12 },
  reminderTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  reminderDesc: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  reminderTime: { fontSize: 12, color: '#94a3b8' },
  textDone: { color: '#94a3b8' },
  reminderActions: {
    marginTop: 12,
  },
  doneBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  doneLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  doneLabelText: { color: '#10b981', fontSize: 14, fontWeight: '600' },
});

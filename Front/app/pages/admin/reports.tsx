// app/(app)/admin/reports.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import statsService from '@/services/statsService';
import usersService from '@/services/usersService';
import medicationsService from '@/services/medicationsService';
import appointmentsService from '@/services/appointmentsService';

export default function ReportsScreen() {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const reports = [
    { id: 1, title: 'Reporte de Medicamentos', icon: 'medical', color: '#3b82f6', period: 'Último mes', type: 'medications' },
    { id: 2, title: 'Reporte de Citas', icon: 'calendar', color: '#f59e0b', period: 'Últimas 2 semanas', type: 'appointments' },
    { id: 3, title: 'Actividad de Usuarios', icon: 'people', color: '#10b981', period: 'Última semana', type: 'users' },
    { id: 4, title: 'Adherencia Medicamentos', icon: 'checkmark-circle', color: '#8b5cf6', period: 'Último mes', type: 'adherence' },
  ];

  const handleGenerateReport = async (reportType: string, title: string, icon: string, color: string) => {
    setLoading(true);
    try {
      let data: any = { title, icon, color, type: reportType };
      
      switch (reportType) {
        case 'medications':
          const meds = await medicationsService.getAllMedications();
          const stats = await statsService.getDashboardStats();
          data.total = meds.length;
          data.active = meds.length;
          data.items = meds.slice(0, 5).map(m => `${m.name} - ${m.dose} ${m.unit}`);
          data.stats = stats;
          break;
          
        case 'appointments':
          const apts = await appointmentsService.getAllAppointments();
          const now = new Date();
          const upcoming = apts.filter(a => new Date(a.starts_at) > now);
          data.total = apts.length;
          data.upcoming = upcoming.length;
          data.items = upcoming.slice(0, 5).map(a => 
            `${a.reason || 'Cita'} - ${new Date(a.starts_at).toLocaleDateString('es')}`
          );
          break;
          
        case 'users':
          const users = await usersService.getUsers();
          const active = users.filter(u => u.is_active);
          data.total = users.length;
          data.active = active.length;
          data.items = users.slice(0, 5).map(u => `${u.full_name} - ${u.role}`);
          break;
          
        case 'adherence':
          const statsAdh = await statsService.getDashboardStats();
          data.total = statsAdh?.total_medications || 0;
          data.pending = statsAdh?.pending_reminders || 0;
          data.items = [`Recordatorios pendientes: ${statsAdh?.pending_reminders || 0}`];
          break;
      }
      
      setReportData(data);
      setModalVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Error generando el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reportes del Sistema</Text>
        <Text style={styles.headerSubtitle}>Genera y descarga reportes</Text>
      </View>

      <View style={styles.content}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Generando reporte...</Text>
          </View>
        )}
        {reports.map((report) => (
          <TouchableOpacity 
            key={report.id} 
            style={styles.reportCard}
            onPress={() => handleGenerateReport(report.type, report.title, report.icon, report.color)}
          >
            <View style={[styles.reportIcon, { backgroundColor: `${report.color}15` }]}>
              <Ionicons name={report.icon as any} size={28} color={report.color} />
            </View>
            <View style={styles.reportInfo}>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportPeriod}>{report.period}</Text>
            </View>
            <Ionicons name="download-outline" size={24} color="#6366f1" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.customReportButton}>
          <Ionicons name="add-circle" size={24} color="#6366f1" />
          <Text style={styles.customReportText}>Crear Reporte Personalizado</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Reporte Detallado */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIcon, { backgroundColor: `${reportData?.color || '#6366f1'}15` }]}>
                  <Ionicons name={reportData?.icon as any} size={32} color={reportData?.color || '#6366f1'} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>{reportData?.title}</Text>
                  <Text style={styles.modalSubtitle}>Generado: {new Date().toLocaleString('es')}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Estadísticas */}
              <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>Estadísticas</Text>
                <View style={styles.statsGrid}>
                  {reportData?.total !== undefined && (
                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>{reportData.total}</Text>
                      <Text style={styles.statLabel}>Total</Text>
                    </View>
                  )}
                  {reportData?.active !== undefined && (
                    <View style={styles.statBox}>
                      <Text style={[styles.statNumber, { color: '#10b981' }]}>{reportData.active}</Text>
                      <Text style={styles.statLabel}>Activos</Text>
                    </View>
                  )}
                  {reportData?.upcoming !== undefined && (
                    <View style={styles.statBox}>
                      <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{reportData.upcoming}</Text>
                      <Text style={styles.statLabel}>Próximas</Text>
                    </View>
                  )}
                  {reportData?.pending !== undefined && (
                    <View style={styles.statBox}>
                      <Text style={[styles.statNumber, { color: '#ef4444' }]}>{reportData.pending}</Text>
                      <Text style={styles.statLabel}>Pendientes</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Detalles */}
              {reportData?.items && reportData.items.length > 0 && (
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Detalles Recientes</Text>
                  {reportData.items.map((item: string, index: number) => (
                    <View key={index} style={styles.detailItem}>
                      <Ionicons name="ellipse" size={8} color={reportData.color} />
                      <Text style={styles.detailText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.downloadButton}>
                <Ionicons name="download" size={20} color="#fff" />
                <Text style={styles.downloadButtonText}>Descargar PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportInfo: {
    flex: 1,
    marginLeft: 16,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  reportPeriod: {
    fontSize: 13,
    color: '#64748b',
  },
  customReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  customReportText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 8,
  },
  loadingOverlay: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  modalBody: {
    padding: 20,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  detailsSection: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import authService, { User } from '@/services/authService';
import medicationsService, { Medication } from '@/services/medicationsService';

export default function SeniorMedicationsManageScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    dose: '',
    unit: 'mg',
    notes: '',
    start_date: '',
    end_date: '',
  });
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]); // Todos los días por defecto
  const [currentStep, setCurrentStep] = useState(1); // Paso actual del wizard

  const daysOfWeek = [
    { day: 0, label: 'Lunes', short: 'L' },
    { day: 1, label: 'Martes', short: 'M' },
    { day: 2, label: 'Miércoles', short: 'X' },
    { day: 3, label: 'Jueves', short: 'J' },
    { day: 4, label: 'Viernes', short: 'V' },
    { day: 5, label: 'Sábado', short: 'S' },
    { day: 6, label: 'Domingo', short: 'D' },
  ];

  const commonHours = [
    { hour: 6, label: '6:00 AM\n(Desayuno)' },
    { hour: 8, label: '8:00 AM\n(Mañana)' },
    { hour: 12, label: '12:00 PM\n(Almuerzo)' },
    { hour: 14, label: '2:00 PM\n(Tarde)' },
    { hour: 18, label: '6:00 PM\n(Cena)' },
    { hour: 20, label: '8:00 PM\n(Noche)' },
    { hour: 22, label: '10:00 PM\n(Antes de dormir)' },
  ];

  const toggleHour = (hour: number) => {
    if (selectedHours.includes(hour)) {
      setSelectedHours(selectedHours.filter(h => h !== hour));
    } else {
      setSelectedHours([...selectedHours, hour].sort((a, b) => a - b));
    }
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      // No permitir deseleccionar todos los días
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter(d => d !== day));
      } else {
        Alert.alert('Atención', 'Debes seleccionar al menos un día');
      }
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  const toggleAllDays = () => {
    if (selectedDays.length === 7) {
      setSelectedDays([0]); // Dejar solo lunes
    } else {
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]); // Seleccionar todos
    }
  };

  // Funciones auxiliares para las fechas
  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getDateAfterDays = (days: number) => {
    const startDate = newMed.start_date ? new Date(newMed.start_date) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);
    return endDate.toISOString().split('T')[0];
  };

  const formatDateReadable = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
    
    if (userData?.senior_id) {
      const medsData = await medicationsService.getMedications(userData.senior_id);
      setMedications(medsData);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddMedication = async () => {
    if (!newMed.name || !newMed.dose || !newMed.unit) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos');
      return;
    }

    if (!user?.senior_id) {
      Alert.alert('Error', 'No se encontró el perfil de senior');
      return;
    }

    try {
      // Crear medicamento con horarios incluidos
      const medicationData: any = {
        name: newMed.name,
        dose: newMed.dose,
        unit: newMed.unit,
        notes: newMed.notes,
      };

      // Agregar horarios si se especificaron
      if (selectedHours.length > 0) {
        medicationData.hours = selectedHours;
        medicationData.days_of_week = selectedDays;
        if (newMed.start_date) {
          medicationData.start_date = newMed.start_date;
        }
        if (newMed.end_date) {
          medicationData.end_date = newMed.end_date;
        }
      }

      await medicationsService.createMedication(user.senior_id, medicationData);

      Alert.alert('Éxito', 'Medicamento agregado correctamente');
      setModalVisible(false);
      setNewMed({ name: '', dose: '', unit: 'mg', notes: '', start_date: '', end_date: '' });
      setSelectedHours([]);
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]); // Reset a todos los días
      setCurrentStep(1); // Reset al paso 1
      await loadData();
    } catch (error) {
      console.error('Error al agregar medicamento:', error);
      Alert.alert('Error', 'No se pudo agregar el medicamento');
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!newMed.name || !newMed.dose || !newMed.unit) {
        Alert.alert('Campos incompletos', 'Por favor completa el nombre, dosis y unidad del medicamento');
        return;
      }
    } else if (currentStep === 2) {
      if (selectedHours.length === 0) {
        Alert.alert('Selecciona al menos una hora', 'Debes elegir al menos un horario para tomar el medicamento');
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setCurrentStep(1);
    setNewMed({ name: '', dose: '', unit: 'mg', notes: '', start_date: '', end_date: '' });
    setSelectedHours([]);
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const handleDeleteMedication = async (medId: number) => {
    Alert.alert(
      'Confirmar',
      '¿Estás seguro de eliminar este medicamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await medicationsService.deleteMedication(medId);
              Alert.alert('Éxito', 'Medicamento eliminado');
              await loadData();
            } catch (error) {
              console.error('Error al eliminar:', error);
              Alert.alert('Error', 'No se pudo eliminar el medicamento');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mis Medicamentos</Text>
          <Text style={styles.headerSubtitle}>Gestiona tus medicinas</Text>
        </View>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add-circle" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Lista de Medicamentos */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {medications.length > 0 ? (
          medications.map((med) => (
            <TouchableOpacity 
              key={med.id} 
              style={styles.medCard}
              onPress={() => router.push(`/pages/senior/medication-detail?id=${med.id}`)}
            >
              <View style={styles.medIcon}>
                <Ionicons name="medical" size={28} color="#8b5cf6" />
              </View>
              <View style={styles.medInfo}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medDose}>
                  {med.dose} {med.unit}
                </Text>
                {med.notes && <Text style={styles.medNotes}>{med.notes}</Text>}
              </View>
              <View style={styles.medActions}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteMedication(med.id);
                  }}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No tienes medicamentos registrados</Text>
            <Text style={styles.emptySubtext}>Presiona el botón + para agregar uno</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal para Agregar Medicamento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Nuevo Medicamento</Text>
                <Text style={styles.stepIndicator}>Paso {currentStep} de 5</Text>
              </View>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close-circle" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Indicador de progreso */}
            <View style={styles.progressContainer}>
              {[1, 2, 3, 4, 5].map((step) => (
                <View key={step} style={styles.progressStepWrapper}>
                  <View
                    style={[
                      styles.progressStep,
                      currentStep >= step && styles.progressStepActive,
                      currentStep > step && styles.progressStepCompleted,
                    ]}
                  >
                    {currentStep > step ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : (
                      <Text
                        style={[
                          styles.progressStepText,
                          currentStep >= step && styles.progressStepTextActive,
                        ]}
                      >
                        {step}
                      </Text>
                    )}
                  </View>
                  {step < 5 && (
                    <View
                      style={[
                        styles.progressLine,
                        currentStep > step && styles.progressLineActive,
                      ]}
                    />
                  )}
                </View>
              ))}
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* PASO 1: Datos del medicamento */}
              {currentStep === 1 && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepIconCircle}>
                      <Ionicons name="medical" size={32} color="#8b5cf6" />
                    </View>
                    <Text style={styles.stepTitle}>Información Básica</Text>
                    <Text style={styles.stepDescription}>
                      Ingresa el nombre y dosis del medicamento
                    </Text>
                  </View>

                  <Text style={styles.label}>Nombre del Medicamento *</Text>
                  <TextInput
                    style={styles.input}
                    value={newMed.name}
                    onChangeText={(text) => setNewMed({ ...newMed, name: text })}
                    placeholder="Ej: Losartán"
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={styles.label}>Dosis *</Text>
                  <TextInput
                    style={styles.input}
                    value={newMed.dose}
                    onChangeText={(text) => setNewMed({ ...newMed, dose: text })}
                    placeholder="Ej: 50"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />

                  <Text style={styles.label}>Unidad de Medida *</Text>
                  <View style={styles.unitButtonsContainer}>
                    {['mg', 'ml', 'tabletas', 'cápsulas', 'gotas'].map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[
                          styles.unitButton,
                          newMed.unit === unit && styles.unitButtonSelected,
                        ]}
                        onPress={() => setNewMed({ ...newMed, unit })}
                      >
                        <Text
                          style={[
                            styles.unitButtonText,
                            newMed.unit === unit && styles.unitButtonTextSelected,
                          ]}
                        >
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* PASO 2: Selección de horas */}
              {currentStep === 2 && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepIconCircle}>
                      <Ionicons name="time" size={32} color="#8b5cf6" />
                    </View>
                    <Text style={styles.stepTitle}>Horarios de Toma</Text>
                    <Text style={styles.stepDescription}>
                      Selecciona una o más horas del día
                    </Text>
                  </View>

                  <View style={styles.hoursGrid}>
                    {commonHours.map(({ hour, label }) => (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.hourButton,
                          selectedHours.includes(hour) && styles.hourButtonSelected,
                        ]}
                        onPress={() => toggleHour(hour)}
                      >
                        <Ionicons
                          name={selectedHours.includes(hour) ? 'checkmark-circle' : 'time-outline'}
                          size={36}
                          color={selectedHours.includes(hour) ? '#fff' : '#8b5cf6'}
                        />
                        <Text
                          style={[
                            styles.hourButtonText,
                            selectedHours.includes(hour) && styles.hourButtonTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {selectedHours.length > 0 && (
                    <View style={styles.selectionSummary}>
                      <Ionicons name="alarm" size={22} color="#8b5cf6" />
                      <Text style={styles.selectionSummaryText}>
                        {selectedHours.length} {selectedHours.length === 1 ? 'hora seleccionada' : 'horas seleccionadas'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* PASO 3: Selección de días */}
              {currentStep === 3 && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepIconCircle}>
                      <Ionicons name="calendar" size={32} color="#8b5cf6" />
                    </View>
                    <Text style={styles.stepTitle}>Días de la Semana</Text>
                    <Text style={styles.stepDescription}>
                      ¿Qué días tomas este medicamento?
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.allDaysButton} onPress={toggleAllDays}>
                    <Ionicons
                      name={selectedDays.length === 7 ? 'checkbox' : 'square-outline'}
                      size={26}
                      color="#8b5cf6"
                    />
                    <Text style={styles.allDaysText}>Todos los días</Text>
                  </TouchableOpacity>

                  <View style={styles.daysGridWizard}>
                    {daysOfWeek.map(({ day, label, short }) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayButtonWizard,
                          selectedDays.includes(day) && styles.dayButtonWizardSelected,
                        ]}
                        onPress={() => toggleDay(day)}
                      >
                        <Text
                          style={[
                            styles.dayButtonShortWizard,
                            selectedDays.includes(day) && styles.dayButtonTextWizardSelected,
                          ]}
                        >
                          {short}
                        </Text>
                        <Text
                          style={[
                            styles.dayButtonLabelWizard,
                            selectedDays.includes(day) && styles.dayButtonTextWizardSelected,
                          ]}
                        >
                          {label}
                        </Text>
                        {selectedDays.includes(day) && (
                          <View style={styles.dayCheckmark}>
                            <Ionicons name="checkmark" size={18} color="#fff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  {selectedDays.length > 0 && (
                    <View style={styles.selectionSummary}>
                      <Ionicons name="calendar" size={22} color="#8b5cf6" />
                      <Text style={styles.selectionSummaryText}>
                        {selectedDays.length} {selectedDays.length === 1 ? 'día seleccionado' : 'días seleccionados'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* PASO 4: Duración del tratamiento */}
              {currentStep === 4 && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepIconCircle}>
                      <Ionicons name="calendar-outline" size={32} color="#8b5cf6" />
                    </View>
                    <Text style={styles.stepTitle}>Duración del Tratamiento</Text>
                    <Text style={styles.stepDescription}>
                      ¿Desde cuándo hasta cuándo tomará este medicamento?
                    </Text>
                  </View>

                  <Text style={styles.label}>Fecha de Inicio</Text>
                  <View style={styles.dateButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.dateButton, !newMed.start_date && styles.dateButtonSelected]}
                      onPress={() => setNewMed({ ...newMed, start_date: '' })}
                    >
                      <Ionicons name="today" size={24} color={!newMed.start_date ? "#fff" : "#8b5cf6"} />
                      <Text style={[styles.dateButtonText, !newMed.start_date && styles.dateButtonTextSelected]}>
                        Hoy
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dateButton, newMed.start_date === getTomorrow() && styles.dateButtonSelected]}
                      onPress={() => setNewMed({ ...newMed, start_date: getTomorrow() })}
                    >
                      <Ionicons name="arrow-forward" size={24} color={newMed.start_date === getTomorrow() ? "#fff" : "#8b5cf6"} />
                      <Text style={[styles.dateButtonText, newMed.start_date === getTomorrow() && styles.dateButtonTextSelected]}>
                        Mañana
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {newMed.start_date && (
                    <View style={styles.selectedDateBox}>
                      <Ionicons name="calendar" size={20} color="#8b5cf6" />
                      <Text style={styles.selectedDateText}>
                        Inicia: {formatDateReadable(newMed.start_date)}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.label}>Duración del Tratamiento</Text>
                  <View style={styles.durationButtonsGrid}>
                    <TouchableOpacity
                      style={[styles.durationButton, !newMed.end_date && styles.durationButtonSelected]}
                      onPress={() => setNewMed({ ...newMed, end_date: '' })}
                    >
                      <Ionicons name="infinite" size={28} color={!newMed.end_date ? "#fff" : "#8b5cf6"} />
                      <Text style={[styles.durationButtonLabel, !newMed.end_date && styles.durationButtonLabelSelected]}>
                        Indefinido
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.durationButton, newMed.end_date === getDateAfterDays(7) && styles.durationButtonSelected]}
                      onPress={() => setNewMed({ ...newMed, end_date: getDateAfterDays(7) })}
                    >
                      <Text style={[styles.durationButtonNumber, newMed.end_date === getDateAfterDays(7) && styles.durationButtonLabelSelected]}>7</Text>
                      <Text style={[styles.durationButtonLabel, newMed.end_date === getDateAfterDays(7) && styles.durationButtonLabelSelected]}>
                        días
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.durationButton, newMed.end_date === getDateAfterDays(15) && styles.durationButtonSelected]}
                      onPress={() => setNewMed({ ...newMed, end_date: getDateAfterDays(15) })}
                    >
                      <Text style={[styles.durationButtonNumber, newMed.end_date === getDateAfterDays(15) && styles.durationButtonLabelSelected]}>15</Text>
                      <Text style={[styles.durationButtonLabel, newMed.end_date === getDateAfterDays(15) && styles.durationButtonLabelSelected]}>
                        días
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.durationButton, newMed.end_date === getDateAfterDays(30) && styles.durationButtonSelected]}
                      onPress={() => setNewMed({ ...newMed, end_date: getDateAfterDays(30) })}
                    >
                      <Text style={[styles.durationButtonNumber, newMed.end_date === getDateAfterDays(30) && styles.durationButtonLabelSelected]}>1</Text>
                      <Text style={[styles.durationButtonLabel, newMed.end_date === getDateAfterDays(30) && styles.durationButtonLabelSelected]}>
                        mes
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.durationButton, newMed.end_date === getDateAfterDays(60) && styles.durationButtonSelected]}
                      onPress={() => setNewMed({ ...newMed, end_date: getDateAfterDays(60) })}
                    >
                      <Text style={[styles.durationButtonNumber, newMed.end_date === getDateAfterDays(60) && styles.durationButtonLabelSelected]}>2</Text>
                      <Text style={[styles.durationButtonLabel, newMed.end_date === getDateAfterDays(60) && styles.durationButtonLabelSelected]}>
                        meses
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.durationButton, newMed.end_date === getDateAfterDays(90) && styles.durationButtonSelected]}
                      onPress={() => setNewMed({ ...newMed, end_date: getDateAfterDays(90) })}
                    >
                      <Text style={[styles.durationButtonNumber, newMed.end_date === getDateAfterDays(90) && styles.durationButtonLabelSelected]}>3</Text>
                      <Text style={[styles.durationButtonLabel, newMed.end_date === getDateAfterDays(90) && styles.durationButtonLabelSelected]}>
                        meses
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {newMed.start_date && newMed.end_date && (
                    <View style={styles.durationSummary}>
                      <Ionicons name="time" size={22} color="#8b5cf6" />
                      <Text style={styles.durationText}>
                        {formatDateReadable(newMed.start_date)} → {formatDateReadable(newMed.end_date)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* PASO 5: Notas y confirmación */}
              {currentStep === 5 && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepIconCircle}>
                      <Ionicons name="document-text" size={32} color="#8b5cf6" />
                    </View>
                    <Text style={styles.stepTitle}>Notas y Confirmación</Text>
                    <Text style={styles.stepDescription}>
                      Agrega información adicional (opcional)
                    </Text>
                  </View>

                  <Text style={styles.label}>Notas o Instrucciones</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={newMed.notes}
                    onChangeText={(text) => setNewMed({ ...newMed, notes: text })}
                    placeholder="Ej: Tomar con alimentos, evitar lácteos, etc."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={4}
                  />

                  {/* Resumen */}
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Resumen del Medicamento</Text>
                    
                    <View style={styles.summaryRow}>
                      <Ionicons name="medical" size={20} color="#8b5cf6" />
                      <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>Medicamento</Text>
                        <Text style={styles.summaryValue}>{newMed.name}</Text>
                      </View>
                    </View>

                    <View style={styles.summaryRow}>
                      <Ionicons name="flask" size={20} color="#8b5cf6" />
                      <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>Dosis</Text>
                        <Text style={styles.summaryValue}>
                          {newMed.dose} {newMed.unit}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.summaryRow}>
                      <Ionicons name="time" size={20} color="#8b5cf6" />
                      <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>Horarios</Text>
                        <Text style={styles.summaryValue}>
                          {selectedHours.length > 0
                            ? selectedHours
                                .map((h) => {
                                  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
                                  const period = h >= 12 ? 'PM' : 'AM';
                                  return `${hour12}:00 ${period}`;
                                })
                                .join(', ')
                            : 'No seleccionado'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.summaryRow}>
                      <Ionicons name="calendar" size={20} color="#8b5cf6" />
                      <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>Días</Text>
                        <Text style={styles.summaryValue}>
                          {selectedDays.length === 7
                            ? 'Todos los días'
                            : selectedDays
                                .map((d) => daysOfWeek.find((day) => day.day === d)?.short)
                                .join(', ')}
                        </Text>
                      </View>
                    </View>

                    {(newMed.start_date || newMed.end_date) && (
                      <View style={styles.summaryRow}>
                        <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
                        <View style={styles.summaryContent}>
                          <Text style={styles.summaryLabel}>Duración</Text>
                          <Text style={styles.summaryValue}>
                            {newMed.start_date ? `Desde: ${newMed.start_date}` : 'Desde hoy'}
                            {newMed.end_date && `\nHasta: ${newMed.end_date}`}
                            {!newMed.end_date && '\nSin fecha de fin'}
                          </Text>
                        </View>
                      </View>
                    )}

                    {newMed.notes && (
                      <View style={styles.summaryRow}>
                        <Ionicons name="information-circle" size={20} color="#8b5cf6" />
                        <View style={styles.summaryContent}>
                          <Text style={styles.summaryLabel}>Notas</Text>
                          <Text style={styles.summaryValue}>{newMed.notes}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Botones de navegación */}
            <View style={styles.navigationButtons}>
              {currentStep > 1 && (
                <TouchableOpacity
                  style={styles.backButtonNav}
                  onPress={handlePreviousStep}
                >
                  <Ionicons name="arrow-back" size={20} color="#8b5cf6" />
                  <Text style={styles.backButtonText}>Atrás</Text>
                </TouchableOpacity>
              )}
              
              {currentStep < 5 ? (
                <TouchableOpacity
                  style={[styles.nextButton, currentStep === 1 && styles.nextButtonFull]}
                  onPress={handleNextStep}
                >
                  <Text style={styles.nextButtonText}>Siguiente</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.saveButtonFinal, currentStep === 1 && styles.nextButtonFull]}
                  onPress={handleAddMedication}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text style={styles.saveButtonTextFinal}>Guardar Medicamento</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { padding: 8, marginRight: 8 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#e9d5ff', marginTop: 2 },
  addButton: { padding: 4 },
  content: { flex: 1, padding: 16 },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
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
    marginRight: 12,
  },
  medInfo: { flex: 1 },
  medName: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  medDose: { fontSize: 14, color: '#64748b' },
  medNotes: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 },
  medActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteButton: { padding: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    height: '92%',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  stepIndicator: { fontSize: 13, color: '#8b5cf6', fontWeight: '600', marginTop: 2 },
  
  // Progress bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  progressStepWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  progressStepCompleted: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  progressStepTextActive: {
    color: '#fff',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#10b981',
  },
  
  // Steps
  modalForm: {
    flex: 1,
  },
  stepContainer: {
    paddingBottom: 20,
    minHeight: 400,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  stepIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  
  // Form elements
  label: { fontSize: 15, fontWeight: '600', color: '#475569', marginBottom: 10 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 20,
  },
  textArea: { 
    height: 100, 
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  
  // Unit buttons
  unitButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  unitButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 10,
  },
  unitButtonSelected: {
    backgroundColor: '#8b5cf6',
    borderColor: '#7c3aed',
  },
  unitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  unitButtonTextSelected: {
    color: '#fff',
  },
  
  // Hours
  hoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  hourButton: {
    width: '47%',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  hourButtonSelected: {
    backgroundColor: '#8b5cf6',
    borderColor: '#7c3aed',
  },
  hourButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  hourButtonTextSelected: {
    color: '#fff',
  },
  
  // Days
  allDaysButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  allDaysText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7c3aed',
  },
  daysGridWizard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  dayButtonWizard: {
    width: '30%',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    position: 'relative',
  },
  dayButtonWizardSelected: {
    backgroundColor: '#8b5cf6',
    borderColor: '#7c3aed',
  },
  dayButtonShortWizard: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 6,
  },
  dayButtonLabelWizard: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  dayButtonTextWizardSelected: {
    color: '#fff',
  },
  dayCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    padding: 2,
  },
  
  // Selection summary
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    padding: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  selectionSummaryText: {
    fontSize: 15,
    color: '#7c3aed',
    fontWeight: '600',
    marginLeft: 10,
  },
  
  // Summary card
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  summaryContent: {
    flex: 1,
    marginLeft: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  
  // Navigation buttons
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
  },
  backButtonNav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#8b5cf6',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  backButtonText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonFinal: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonTextFinal: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: -8,
    marginBottom: 16,
    fontStyle: 'italic',
  },

  // Date picker buttons
  dateButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 18,
    gap: 8,
  },
  dateButtonSelected: {
    backgroundColor: '#8b5cf6',
    borderColor: '#7c3aed',
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  dateButtonTextSelected: {
    color: '#fff',
  },
  selectedDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 24,
    gap: 10,
  },
  selectedDateText: {
    fontSize: 15,
    color: '#7c3aed',
    fontWeight: '600',
  },

  // Duration buttons grid
  durationButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  durationButton: {
    width: '30%',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  durationButtonSelected: {
    backgroundColor: '#8b5cf6',
    borderColor: '#7c3aed',
  },
  durationButtonNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  durationButtonLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  durationButtonLabelSelected: {
    color: '#fff',
  },
  durationSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  durationText: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '600',
  },
});

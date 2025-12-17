import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Hospitales principales en Ecuador
const hospitals = [
  // Quito
  {
    id: 1,
    name: 'Hospital Metropolitano',
    city: 'Quito',
    address: 'Av. Mariana de Jesús y Occidental',
    phone: '02-399-8000',
    latitude: -0.1807,
    longitude: -78.4816,
    specialties: ['Emergencias', 'Cardiología', 'Oncología'],
  },
  {
    id: 2,
    name: 'Hospital Vozandes Quito',
    city: 'Quito',
    address: 'Villalengua Oe2-37 y Av. 10 de Agosto',
    phone: '02-226-2142',
    latitude: -0.2022,
    longitude: -78.4931,
    specialties: ['Cirugía', 'Pediatría', 'Ginecología'],
  },
  {
    id: 3,
    name: 'Hospital Carlos Andrade Marín',
    city: 'Quito',
    address: 'Av. 18 de Septiembre y Ayacucho',
    phone: '02-256-0146',
    latitude: -0.2097,
    longitude: -78.5014,
    specialties: ['Medicina General', 'Traumatología'],
  },
  // Guayaquil
  {
    id: 4,
    name: 'Hospital Luis Vernaza',
    city: 'Guayaquil',
    address: 'Loja 700 y Escobedo',
    phone: '04-256-0300',
    latitude: -2.1894,
    longitude: -79.8890,
    specialties: ['Emergencias', 'UCI', 'Cirugía'],
  },
  {
    id: 5,
    name: 'Hospital de los Ceibos',
    city: 'Guayaquil',
    address: 'Av. de los Ceibos',
    phone: '04-371-8700',
    latitude: -2.1462,
    longitude: -79.9076,
    specialties: ['Emergencias', 'Pediatría', 'Maternidad'],
  },
  {
    id: 6,
    name: 'Hospital Alcívar',
    city: 'Guayaquil',
    address: 'Coronel 2301 y Azuay',
    phone: '04-372-9000',
    latitude: -2.1670,
    longitude: -79.9060,
    specialties: ['Cardiología', 'Neurología', 'Oncología'],
  },
  // Cuenca
  {
    id: 7,
    name: 'Hospital Monte Sinaí',
    city: 'Cuenca',
    address: 'Miguel Cordero 6-111 y Av. Solano',
    phone: '07-288-5595',
    latitude: -2.9005,
    longitude: -79.0011,
    specialties: ['Emergencias', 'Cirugía', 'Maternidad'],
  },
  {
    id: 8,
    name: 'Hospital Santa Inés',
    city: 'Cuenca',
    address: 'Daniel Córdova Toral y Agustín Cueva',
    phone: '07-281-7888',
    latitude: -2.8946,
    longitude: -79.0067,
    specialties: ['Pediatría', 'Ginecología', 'Medicina Interna'],
  },
  // Ambato
  {
    id: 9,
    name: 'Hospital Regional Ambato',
    city: 'Ambato',
    address: 'Av. Unidad Nacional',
    phone: '03-242-1319',
    latitude: -1.2416,
    longitude: -78.6250,
    specialties: ['Emergencias', 'Cirugía General'],
  },
  // Machala
  {
    id: 10,
    name: 'Hospital Teófilo Dávila',
    city: 'Machala',
    address: 'Av. Buenavista y Boyacá',
    phone: '07-293-2701',
    latitude: -3.2581,
    longitude: -79.9553,
    specialties: ['Emergencias', 'Traumatología', 'Pediatría'],
  },
  // Manta
  {
    id: 11,
    name: 'Hospital de Especialidades de Manta',
    city: 'Manta',
    address: 'Av. 113 y Calle 107',
    phone: '05-262-2017',
    latitude: -0.9618,
    longitude: -80.7097,
    specialties: ['Emergencias', 'Medicina General'],
  },
  // Ibarra
  {
    id: 12,
    name: 'Hospital San Vicente de Paúl',
    city: 'Ibarra',
    address: 'Av. Atahualpa',
    phone: '06-264-1110',
    latitude: -0.3517,
    longitude: -78.1233,
    specialties: ['Emergencias', 'Cirugía', 'Pediatría'],
  },
];

export default function HospitalsMapScreen() {
  const router = useRouter();
  const [selectedHospital, setSelectedHospital] = useState<typeof hospitals[0] | null>(null);

  const openInMaps = (hospital: typeof hospitals[0]) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${hospital.latitude},${hospital.longitude}`;
    const label = hospital.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Hospitales en Ecuador</Text>
          <Text style={styles.headerSubtitle}>{hospitals.length} hospitales cercanos</Text>
        </View>
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Lista de Hospitales */}
      <ScrollView style={styles.listContainer}>
        {hospitals.map((hospital) => (
          <TouchableOpacity
            key={hospital.id}
            style={[
              styles.hospitalCard,
              selectedHospital?.id === hospital.id && styles.hospitalCardSelected
            ]}
            onPress={() => setSelectedHospital(hospital)}
          >
            <View style={styles.hospitalCardHeader}>
              <View style={styles.hospitalIconContainer}>
                <Ionicons name="medical" size={24} color="#ef4444" />
              </View>
              <View style={styles.hospitalCardInfo}>
                <Text style={styles.hospitalCardName}>{hospital.name}</Text>
                <Text style={styles.hospitalCardCity}>{hospital.city}</Text>
              </View>
              {selectedHospital?.id === hospital.id && (
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              )}
            </View>

            {selectedHospital?.id === hospital.id && (
              <View style={styles.hospitalDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={16} color="#64748b" />
                  <Text style={styles.detailText}>{hospital.address}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="call" size={16} color="#64748b" />
                  <Text style={styles.detailText}>{hospital.phone}</Text>
                </View>
                
                <View style={styles.specialtiesContainer}>
                  <Text style={styles.specialtiesLabel}>Especialidades:</Text>
                  <View style={styles.specialtiesList}>
                    {hospital.specialties.map((specialty, index) => (
                      <View key={index} style={styles.specialtyTag}>
                        <Text style={styles.specialtyText}>{specialty}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.directionsButton}
                  onPress={() => openInMaps(hospital)}
                >
                  <Ionicons name="navigate" size={20} color="#fff" />
                  <Text style={styles.directionsButtonText}>Cómo llegar</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    padding: 16,
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#fecaca',
    marginTop: 2,
  },
  infoButton: {
    padding: 8,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  hospitalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  hospitalCardSelected: {
    borderWidth: 2,
    borderColor: '#10b981',
  },
  hospitalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hospitalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hospitalCardInfo: {
    flex: 1,
  },
  hospitalCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  hospitalCardCity: {
    fontSize: 13,
    color: '#64748b',
  },
  hospitalDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 8,
    flex: 1,
  },
  specialtiesContainer: {
    marginTop: 12,
  },
  specialtiesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  specialtiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  specialtyText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 12,
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

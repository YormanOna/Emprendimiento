import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as relationsService from '../../../services/relationsService';
import authService from '../../../services/authService';

export default function CaregiverRelationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myRelations, setMyRelations] = useState<relationsService.Relation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<relationsService.User[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedSeniorId, setSelectedSeniorId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Obtener usuario actual
      const userData = await authService.getCurrentUser();
      setCurrentUserId(userData?.id || null);
      
      // Obtener las relaciones del cuidador
      const relations = await relationsService.getMyRelations();
      setMyRelations(relations);
    } catch (error: any) {
      console.error('Error loading relations:', error);
      Alert.alert('Error', 'No se pudo cargar la información');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Auto-refresh al volver a la página
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      // Buscar solo seniors
      const results = await relationsService.searchUsers(query, 'SENIOR');
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddPatient = async (senior: relationsService.User) => {
    if (!senior.id || !currentUserId) {
      Alert.alert('Error', 'Información incompleta');
      return;
    }

    // El senior_id es el mismo que el id para usuarios de rol SENIOR
    const seniorId = senior.senior_id || senior.id;

    // Verificar si ya está en mis relaciones
    const alreadyAdded = myRelations.some(r => r.senior_id === seniorId);
    if (alreadyAdded) {
      Alert.alert('Información', 'Ya tienes una relación con este paciente');
      return;
    }

    try {
      // Agregar al cuidador actual como miembro del care team del senior
      await relationsService.addTeamMember(seniorId, {
        user_id: currentUserId, // ID del cuidador actual
        membership_role: 'CAREGIVER',
        can_view: true,
        can_edit: true,
      });

      Alert.alert('Éxito', `${senior.full_name} fue agregado a tus pacientes`);
      
      // Recargar la lista
      await loadData();
      
      // Limpiar búsqueda
      setSearchQuery('');
      setSearchResults([]);
      setShowSearch(false);
    } catch (error: any) {
      console.error('Error adding team member:', error);
      Alert.alert('Error', error.message || 'No se pudo agregar el paciente');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      PRIMARY_CAREGIVER: 'Cuidador Principal',
      FAMILY: 'Familiar',
      DOCTOR: 'Médico',
      NURSE: 'Enfermero',
      OTHER: 'Otro',
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Cargando pacientes...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-green-600 pt-12 pb-6 px-6">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Mis Pacientes</Text>
        </View>
        <Text className="text-green-100">
          Gestiona los adultos mayores que cuidas
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Botón agregar paciente */}
        <View className="p-4">
          <TouchableOpacity
            onPress={() => setShowSearch(!showSearch)}
            className="bg-green-600 rounded-xl p-4 flex-row items-center justify-center"
          >
            <Ionicons name="person-add" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">
              {showSearch ? 'Ocultar búsqueda' : 'Agregar paciente'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Búsqueda */}
        {showSearch && (
          <View className="px-4 mb-4">
            <View className="bg-white rounded-xl p-4 shadow-sm">
              <Text className="text-lg font-semibold mb-3">Buscar adulto mayor</Text>
              
              <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
                <Ionicons name="search" size={20} color="#6b7280" />
                <TextInput
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholder="Nombre o email del paciente..."
                  className="flex-1 ml-2 text-base"
                />
                {searching && <ActivityIndicator size="small" color="#3b82f6" />}
              </View>

              {searchResults.length > 0 && (
                <View className="mt-3">
                  {searchResults.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      onPress={() => handleAddPatient(user)}
                      className="flex-row items-center justify-between py-3 border-b border-gray-200"
                    >
                      <View className="flex-1">
                        <Text className="font-semibold">{user.full_name}</Text>
                        <Text className="text-sm text-gray-600">{user.email}</Text>
                        <Text className="text-xs text-green-600 mt-1">Adulto Mayor</Text>
                      </View>
                      <Ionicons name="add-circle" size={28} color="#10b981" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                <Text className="text-gray-500 text-center mt-3">
                  No se encontraron pacientes
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Lista de pacientes */}
        <View className="px-4 pb-4">
          <Text className="text-lg font-semibold mb-3">
            Mis pacientes ({myRelations.length})
          </Text>

          {myRelations.length === 0 ? (
            <View className="bg-white rounded-xl p-6 items-center">
              <Ionicons name="people-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 mt-4 text-center">
                No tienes pacientes asignados
              </Text>
              <Text className="text-gray-400 text-sm mt-2 text-center">
                Busca y agrega adultos mayores para comenzar a cuidarlos
              </Text>
            </View>
          ) : (
            myRelations.map((relation) => (
              <View
                key={relation.id}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold text-lg">{relation.senior_name}</Text>
                    
                    <View className="flex-row items-center mt-2">
                      <View className="bg-green-100 rounded-full px-3 py-1">
                        <Text className="text-green-700 text-xs font-medium">
                          {getRoleLabel(relation.membership_role)}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center mt-2">
                      {relation.can_view && (
                        <View className="flex-row items-center mr-3">
                          <Ionicons name="eye" size={14} color="#10b981" />
                          <Text className="text-xs text-gray-600 ml-1">Puedes ver</Text>
                        </View>
                      )}
                      {relation.can_edit && (
                        <View className="flex-row items-center">
                          <Ionicons name="create" size={14} color="#f59e0b" />
                          <Text className="text-xs text-gray-600 ml-1">Puedes editar</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => router.push(`/pages/caregiver/chat`)}
                    className="ml-3 bg-green-100 p-3 rounded-full"
                  >
                    <Ionicons name="chatbubbles" size={24} color="#10b981" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

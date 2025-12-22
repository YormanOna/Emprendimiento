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

export default function SeniorRelationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seniorId, setSeniorId] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<relationsService.CareTeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<relationsService.User[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Obtener información del usuario actual
      const currentUser = await authService.getCurrentUser();
      
      if (!currentUser || !currentUser.senior_id) {
        Alert.alert('Error', 'No se encontró el perfil de adulto mayor');
        setLoading(false);
        return;
      }

      setSeniorId(currentUser.senior_id);

      // Cargar equipo de cuidado
      const team = await relationsService.getSeniorTeam(currentUser.senior_id);
      console.log('👥 Equipo cargado:', team);
      setTeamMembers(team);
    } catch (error: any) {
      console.error('Error loading relations:', error);
      console.error('Error details:', error.response?.data);
      Alert.alert('Error', error.response?.data?.detail || 'No se pudo cargar la información');
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
      // Buscar solo cuidadores, familia y doctores
      const results = await relationsService.searchUsers(query);
      // Filtrar para no mostrar seniors
      const filtered = results.filter(u => u.role !== 'SENIOR');
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (user: relationsService.User) => {
    if (!seniorId) return;

    // Verificar si ya está en el equipo
    const alreadyAdded = teamMembers.some(m => m.user_id === user.id);
    if (alreadyAdded) {
      Alert.alert('Información', 'Esta persona ya está en tu equipo de cuidado');
      return;
    }

    try {
      // Determinar el rol según el tipo de usuario
      let membershipRole: 'PRIMARY_CAREGIVER' | 'FAMILY' | 'DOCTOR' | 'NURSE' | 'OTHER';
      
      switch (user.role) {
        case 'CAREGIVER':
          membershipRole = 'PRIMARY_CAREGIVER';
          break;
        case 'FAMILY':
          membershipRole = 'FAMILY';
          break;
        case 'DOCTOR':
          membershipRole = 'DOCTOR';
          break;
        default:
          membershipRole = 'OTHER';
      }

      await relationsService.addTeamMember(seniorId, {
        user_id: user.id,
        membership_role: membershipRole,
        can_view: true,
        can_edit: false,
      });

      Alert.alert('Éxito', `${user.full_name} fue agregado a tu equipo de cuidado`);
      
      // Recargar la lista
      await loadData();
      
      // Limpiar búsqueda
      setSearchQuery('');
      setSearchResults([]);
      setShowSearch(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo agregar al miembro');
    }
  };

  const handleRemoveMember = (member: relationsService.CareTeamMember) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Deseas eliminar a ${member.user_name} de tu equipo de cuidado?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!seniorId) return;
            try {
              await relationsService.removeTeamMember(seniorId, member.id);
              Alert.alert('Éxito', 'Miembro eliminado del equipo');
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar al miembro');
            }
          },
        },
      ]
    );
  };

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      PRIMARY_CAREGIVER: 'Cuidador Principal',
      FAMILY: 'Familiar',
      DOCTOR: 'Médico',
      NURSE: 'Enfermero',
      OTHER: 'Otro',
      CAREGIVER: 'Cuidador',
      ADMIN: 'Administrador',
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Cargando relaciones...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-600 pt-12 pb-6 px-6">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Mi Equipo de Cuidado</Text>
        </View>
        <Text className="text-blue-100">
          Gestiona las personas que te cuidan y monitorean tu salud
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Botón agregar miembro */}
        <View className="p-4">
          <TouchableOpacity
            onPress={() => setShowSearch(!showSearch)}
            className="bg-blue-600 rounded-xl p-4 flex-row items-center justify-center"
          >
            <Ionicons name="person-add" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">
              {showSearch ? 'Ocultar búsqueda' : 'Agregar miembro'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Búsqueda */}
        {showSearch && (
          <View className="px-4 mb-4">
            <View className="bg-white rounded-xl p-4 shadow-sm">
              <Text className="text-lg font-semibold mb-3">Buscar persona</Text>
              
              <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
                <Ionicons name="search" size={20} color="#6b7280" />
                <TextInput
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholder="Nombre o email..."
                  className="flex-1 ml-2 text-base"
                />
                {searching && <ActivityIndicator size="small" color="#3b82f6" />}
              </View>

              {searchResults.length > 0 && (
                <View className="mt-3">
                  {searchResults.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      onPress={() => handleAddMember(user)}
                      className="flex-row items-center justify-between py-3 border-b border-gray-200"
                    >
                      <View className="flex-1">
                        <Text className="font-semibold">{user.full_name}</Text>
                        <Text className="text-sm text-gray-600">{user.email}</Text>
                        <Text className="text-xs text-blue-600 mt-1">
                          {getRoleLabel(user.role)}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={28} color="#3b82f6" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                <Text className="text-gray-500 text-center mt-3">
                  No se encontraron resultados
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Lista de miembros del equipo */}
        <View className="px-4 pb-4">
          <Text className="text-lg font-semibold mb-3">
            Miembros del equipo ({teamMembers.length})
          </Text>

          {teamMembers.length === 0 ? (
            <View className="bg-white rounded-xl p-6 items-center">
              <Ionicons name="people-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 mt-4 text-center">
                No tienes miembros en tu equipo de cuidado
              </Text>
              <Text className="text-gray-400 text-sm mt-2 text-center">
                Agrega cuidadores, familiares o médicos para que puedan monitorear tu salud
              </Text>
            </View>
          ) : (
            teamMembers.map((member) => {
              // Validar que tengamos datos mínimos
              const hasValidData = member.user_name && member.user_name !== 'Desconocido';
              
              return (
                <View
                  key={member.id}
                  className="bg-white rounded-xl p-4 mb-3 shadow-sm"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="font-semibold text-lg">
                          {member.user_name || 'Usuario sin nombre'}
                        </Text>
                        {!hasValidData && (
                          <View className="ml-2 bg-red-100 rounded-full px-2 py-1">
                            <Text className="text-red-600 text-xs font-medium">
                              Datos incompletos
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {member.user_email && (
                        <Text className="text-gray-600 text-sm">{member.user_email}</Text>
                      )}
                      
                      <View className="flex-row items-center mt-2 flex-wrap">
                        {member.user_role && (
                          <View className="bg-blue-100 rounded-full px-3 py-1 mr-2 mb-1">
                            <Text className="text-blue-700 text-xs font-medium">
                              {getRoleLabel(member.user_role)}
                            </Text>
                          </View>
                        )}
                        <View className="bg-purple-100 rounded-full px-3 py-1 mb-1">
                          <Text className="text-purple-700 text-xs font-medium">
                            {getRoleLabel(member.membership_role)}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center mt-2">
                        {member.can_view && (
                          <View className="flex-row items-center mr-3">
                            <Ionicons name="eye" size={14} color="#10b981" />
                            <Text className="text-xs text-gray-600 ml-1">Puede ver</Text>
                          </View>
                        )}
                        {member.can_edit && (
                          <View className="flex-row items-center">
                            <Ionicons name="create" size={14} color="#f59e0b" />
                            <Text className="text-xs text-gray-600 ml-1">Puede editar</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleRemoveMember(member)}
                      className="ml-3"
                    >
                      <Ionicons name="trash" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

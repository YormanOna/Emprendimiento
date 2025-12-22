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

export default function DoctorRelationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myRelations, setMyRelations] = useState<relationsService.Relation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<relationsService.User[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
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
      const results = await relationsService.searchUsers(query, 'SENIOR');
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
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
      <View className="bg-teal-600 pt-12 pb-6 px-6">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Mis Pacientes</Text>
        </View>
        <Text className="text-teal-100">
          Gestiona los pacientes bajo tu cuidado médico
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          <TouchableOpacity
            onPress={() => setShowSearch(!showSearch)}
            className="bg-teal-600 rounded-xl p-4 flex-row items-center justify-center"
          >
            <Ionicons name="person-add" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">
              {showSearch ? 'Ocultar búsqueda' : 'Agregar paciente'}
            </Text>
          </TouchableOpacity>
        </View>

        {showSearch && (
          <View className="px-4 mb-4">
            <View className="bg-white rounded-xl p-4 shadow-sm">
              <Text className="text-lg font-semibold mb-3">Buscar paciente</Text>
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
                      className="flex-row items-center justify-between py-3 border-b border-gray-200"
                    >
                      <View className="flex-1">
                        <Text className="font-semibold">{user.full_name}</Text>
                        <Text className="text-sm text-gray-600">{user.email}</Text>
                      </View>
                      <Ionicons name="add-circle" size={28} color="#14b8a6" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

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
            </View>
          ) : (
            myRelations.map((relation) => (
              <View key={relation.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold text-lg">{relation.senior_name}</Text>
                    <View className="flex-row items-center mt-2">
                      <View className="bg-teal-100 rounded-full px-3 py-1">
                        <Text className="text-teal-700 text-xs font-medium">
                          {getRoleLabel(relation.membership_role)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push(`/pages/doctor/chat`)}
                    className="ml-3 bg-teal-100 p-3 rounded-full"
                  >
                    <Ionicons name="chatbubbles" size={24} color="#14b8a6" />
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

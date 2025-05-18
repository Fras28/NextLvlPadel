// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Platform, ActivityIndicator, View } from 'react-native'; // Añadido ActivityIndicator y View
import { useAuth } from '../../context/AuthContext'; // Asegúrate que la ruta sea correcta

const ACTIVE_COLOR = '#0284c7';
const INACTIVE_COLOR = '#6b7280';

export default function TabLayout() {
  const { user, isLoading } = useAuth();

  // Determinar el nombre a mostrar. Prioriza 'name', luego 'username'.
  const profileDisplayName =  `Hola ${user?.username}` || 'Mi Perfil';

  // Mientras se carga el estado de autenticación, podrías mostrar un título genérico o un indicador.
  // Sin embargo, el título de la pestaña no se actualiza tan dinámicamente con un spinner.
  // Es mejor mostrar un título por defecto y se actualizará cuando 'user' cambie.
  const tabProfileTitle = isLoading ? 'Cargando...' : profileDisplayName;

  // Si isLoading es true globalmente y quieres mostrar un loader para todo el layout de tabs:
  // if (isLoading) {
  //   return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={ACTIVE_COLOR} /></View>;
  // }
  // Sin embargo, para el título de la pestaña, el cambio reactivo es suficiente.

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        headerShown: true,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.85)' : 'white',
          position: Platform.OS === 'ios' ? 'absolute' : 'relative',
          borderTopWidth: Platform.OS === 'android' ? 1 : 0,
          borderTopColor: Platform.OS === 'android' ? '#e5e7eb' : undefined,
          // height: Platform.OS === 'ios' ? 90 : 60, // Ajustar altura si es necesario
        },
        headerStyle: {
          backgroundColor: '#0284c7',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        },
      }}
    >
      <Tabs.Screen
        name="index" // Corresponde a app/(tabs)/index.tsx
        options={{
          title: 'Mis Partidos',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'tennisball' : 'tennisball-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ranking" // Corresponde a app/(tabs)/ranking.tsx
        options={{
          title: 'Ranking',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons name={'leaderboard'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rules" // Corresponde a app/(tabs)/rules.tsx
        options={{
          title: 'Reglamento',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons name={focused ? 'gavel' : 'gavel'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile" // Corresponde a app/(tabs)/profile.tsx
        options={{
          title: tabProfileTitle, // <-- TÍTULO DINÁMICO AQUÍ
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
// import { useAuth } from '../../context/AuthContext'; // <-- COMPLETAMENTE COMENTADO O ELIMINADO

const ACTIVE_COLOR = '#0284c7';
const INACTIVE_COLOR = '#6b7280';

export default function TabLayout() {
  // const { user, isLoading } = useAuth(); // <-- COMPLETAMENTE COMENTADO O ELIMINADO
  // console.log('[TabLayout] Rendering.'); // Puedes añadir este log para depurar

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
        name="index"
        options={{
          title: 'Mis Partidos', // Estático
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'tennisball' : 'tennisball-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: 'Ranking', // Estático
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons name={'leaderboard'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: 'Reglamento', // Estático
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialIcons name={focused ? 'gavel' : 'gavel'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Mi Perfil', // Estático
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
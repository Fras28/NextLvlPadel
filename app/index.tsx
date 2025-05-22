// app/index.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import WelcomeScreenComponent from './Auth/WelcomeScreen';

export default function IndexScreen() {
  // Asegúrate de que tu useAuth() exporte initialRedirectPerformed y setInitialRedirectPerformed
  const { user, token, isLoading, initialRedirectPerformed, setInitialRedirectPerformed } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) { 
      if (user && token) {
        if (!initialRedirectPerformed) { // Solo redirigir si no se ha hecho antes
          console.log('[IndexScreen] Attempting initial redirect to /(tabs)');
          router.replace('/(tabs)');
          setInitialRedirectPerformed(true); 
        }
      } else {
        // Si el usuario se desloguea o el token desaparece, resetear la bandera
        if (initialRedirectPerformed) {
          setInitialRedirectPerformed(false);
        }
      }
    }
  }, [isLoading, user, token, router, initialRedirectPerformed, setInitialRedirectPerformed]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!user || !token) {
    return <WelcomeScreenComponent />;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
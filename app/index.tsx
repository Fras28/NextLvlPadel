// app/index.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext'; // Asegúrate que la ruta sea correcta
import WelcomeScreenComponent from './Auth/WelcomeScreen'; // Tu componente de bienvenida

export default function IndexScreen() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Solo intentar navegar una vez que el estado de carga se haya resuelto
    if (!isLoading) {
      if (user && token) {
        // Usuario autenticado, reemplazar la ruta actual con el dashboard
        // La ruta '/(tabs)' debe corresponder a tu app/(tabs)/index.tsx
        router.replace('/(tabs)');
      }
      // Si !user || !token, se renderizará WelcomeScreenComponent más abajo
    }
  }, [isLoading, user, token, router]); // Dependencias para el efecto

  if (isLoading) {
    // Mostrar un indicador de carga mientras se determina el estado de autenticación
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Si la carga ha finalizado y el usuario no está autenticado
  if (!user || !token) {
    return <WelcomeScreenComponent />;
  }

  // Si la carga ha finalizado y el usuario ESTÁ autenticado,
  // useEffect debería haber iniciado una redirección.
  // Mostrar un indicador de carga o null mientras la redirección está en progreso
  // para evitar que WelcomeScreenComponent aparezca brevemente.
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
    // Considera usar el fondo de imagen global aquí si es necesario,
    // aunque _layout.tsx ya lo podría estar manejando.
    // Si _layout.tsx aplica ImageBackground globalmente, este View podría ser transparente.
    // backgroundColor: 'transparent', // o el color que desees para el loader
  },
});
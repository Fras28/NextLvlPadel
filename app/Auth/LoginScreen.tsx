// app/Auth/LoginScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView, StatusBar,
  Alert, StyleSheet, Platform, ActivityIndicator,
  Image, Animated, Easing, /* Dimensions, */ ImageSourcePropType, AppState // Dimensions no se usaba aquí
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import SponsorBottom from '@/components/elementos/SponsorBottom';

const STRAPI_BACKEND_URL = 'https://3c1c-200-127-6-159.ngrok-free.app';

const FLUORESCENT_YELLOW = '#DFFF00';

// Componente SponsorImageMarquee (definido localmente)

// Componente principal LoginScreen
const LoginScreen = () => {
  const router = useRouter();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async () => {
     if (!identifier.trim() || !password.trim()) {
      Alert.alert('Campos incompletos', 'Por favor, ingresa tu email/usuario y contraseña.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${STRAPI_BACKEND_URL}/api/auth/local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true', // Solo para desarrollo con ngrok
        },
        body: JSON.stringify({ identifier, password }),
      });
      
      const clonedResponse = response.clone(); // Clonar para poder leer el cuerpo múltiples veces si es necesario
      const responseText = await clonedResponse.text(); // Leer como texto para el manejo de errores

      if (!response.ok) {
        let errorMessage = `Error del servidor: ${response.status}.`;
        if (responseText) { // Intentar obtener un mensaje más detallado del cuerpo del error
          try {
            const errorData = JSON.parse(responseText); // Asumir que el error es JSON
            errorMessage = errorData?.error?.message || errorData?.message || responseText;
          } catch (e) {
            // Si no es JSON, usar el texto directo (o una parte)
            errorMessage = responseText.substring(0, 200); // Limitar longitud del mensaje
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json(); // Si response.ok, parsear el cuerpo original como JSON

      if (data.error) { // Strapi puede devolver un objeto `error` incluso con status 200
        const errorMessage = data.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
        throw new Error(errorMessage);
      }

      if (data.jwt && data.user) {
        await signIn(data.user, data.jwt);
        Alert.alert('Inicio de Sesión Exitoso', `¡Bienvenido ${data.user.username}!`);
        router.replace('/(tabs)');
      } else {
        // Esta situación no debería ocurrir si la respuesta es OK y no hay data.error
        throw new Error('Respuesta de login inválida del servidor.');
      }
    } catch (err: any) {
      Alert.alert('Error de Login', err.message || 'Ocurrió un problema. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={styles.safeArea.backgroundColor} />
      <View style={styles.mainContainer}>
        <View style={styles.formOuterContainer}>
          <View style={styles.formContainer}>
            {/* Todo el texto está correctamente dentro de componentes <Text> */}
            <Text style={styles.formTitle}>Iniciar Sesión</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo Electrónico o Usuario</Text>
              <TextInput
                style={styles.textInput}
                placeholder="tu@correo.com o tuUsuario"
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="username"
                textContentType="username"
                editable={!isLoading} // Buena práctica: deshabilitar input mientras carga
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Tu contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                editable={!isLoading}
              />
              {/* Link con texto correctamente envuelto */}
              <Link href="/Auth/ForgotPasswordScreen" asChild style={styles.forgotPasswordLinkContainer}>
                <TouchableOpacity disabled={isLoading}>
                  <Text style={styles.forgotPasswordLinkText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Botón con renderizado condicional seguro: ActivityIndicator o Text */}
            <TouchableOpacity onPress={handleLogin} style={[styles.button, styles.buttonSubmit]} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator size="small" color={styles.buttonSubmitText.color} />
              ) : (
                <Text style={styles.buttonSubmitText}>Ingresar</Text>
              )}
            </TouchableOpacity>

            {/* Link con texto correctamente envuelto */}
            <Link href="/Auth/RegisterScreen" asChild style={styles.linkToRegister}>
              <TouchableOpacity disabled={isLoading}>
                <Text style={styles.linkToRegisterText}>
                  ¿No tienes cuenta? Regístrate
                </Text>
              </TouchableOpacity>
            </Link>
      <SponsorBottom
            imageHeight={35}
            imageWidth={110}
            backgroundColor="rgba(10,20,70,0.7)"
            title="Con el Apoyo de"
          />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Los estilos se mantienen como los proporcionaste.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#142986',
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  formOuterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: Platform.OS === 'ios' ? 24 : 32,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
    maxWidth: 448,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0369a1',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  textInput: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12, // Ajuste para iOS
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: 'white',
    color: '#111827',
    fontSize: 16,
  },
  forgotPasswordLinkContainer: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  forgotPasswordLinkText: {
    fontSize: 12, // Consistente con lo que tenías
    color: '#0284c7',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    // paddingHorizontal: 24, // Ya estaba, redundante si solo alignItems
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center', // Para centrar el ActivityIndicator
  },
  buttonSubmit: {
    backgroundColor: '#facc15',
    marginBottom: 24,
    minHeight: 50, // Para dar una buena altura al botón
  },
  buttonSubmitText: {
    color: '#075985',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
  },
  linkToRegister: {
    // Estilo para el TouchableOpacity dentro del Link si es necesario
  },
  linkToRegisterText: {
    textAlign: 'center',
    color: '#0284c7',
    fontWeight: '500',
    padding: 8, // Aumenta el área táctil
  },
  measureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0,
    position: 'absolute',
  },
  marqueeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    alignSelf: 'center',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.8)', // Fondo claro para mejor lectura
    borderRadius: 4,
  }
});

export default LoginScreen;
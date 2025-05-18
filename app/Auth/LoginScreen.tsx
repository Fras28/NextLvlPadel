// app/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator // Para el indicador de carga
} from 'react-native';
import { Link, useRouter } from 'expo-router';
// import * as SecureStore from 'expo-secure-store'; // No es necesario aquí si signIn se encarga
// import AsyncStorage from '@react-native-async-storage/async-storage'; // No es necesario aquí si signIn se encarga
import { useAuth } from '../../context/AuthContext'; // <-- IMPORTA useAuth

// Asegúrate que esta URL sea la URL de ngrok activa y correcta
const STRAPI_BACKEND_URL = 'https://6544-200-127-6-159.ngrok-free.app'; // SIN ESPACIO AL FINAL

const LoginScreen = () => {
  const router = useRouter();
  const { signIn } = useAuth(); // <-- USA EL HOOK de AuthContext
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // const [error, setError] = useState<string>(''); // Podrías usarlo para mostrar errores en la UI

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Campos incompletos', 'Por favor, ingresa tu email/usuario y contraseña.');
      return;
    }

    setIsLoading(true);
    // setError('');

    try {
      const response = await fetch(`${STRAPI_BACKEND_URL}/api/auth/local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true', // <-- AÑADIDO PARA SALTAR ADVERTENCIA DE NGROK
        },
        body: JSON.stringify({ identifier, password }),
      });

      const clonedResponse = response.clone();
      const responseText = await clonedResponse.text();

      console.log('[LoginScreen] Response Status:', response.status);
      console.log('[LoginScreen] Raw Response Text:', responseText);

      // Primero verifica si la respuesta es OK antes de intentar parsear como JSON
      if (!response.ok) {
        // Intenta parsear el error si el Content-Type sugiere JSON, sino usa responseText
        let errorMessage = `Error del servidor: ${response.status}.`;
        if (responseText) {
          try {
            const errorData = JSON.parse(responseText); // Intenta parsear como JSON
            errorMessage = errorData?.error?.message || errorData?.message || responseText;
          } catch (e) {
            // Si no es JSON, responseText ya tiene el error (podría ser HTML o texto plano)
            errorMessage = responseText.substring(0, 200); // Limita la longitud del mensaje
          }
        }
        throw new Error(errorMessage);
      }

      // Si la respuesta es OK, ahora sí parsea el JSON de la respuesta original
      const data = await response.json();

      // Strapi devuelve un error dentro de un 200 OK a veces si la validación falla
      // (ej. contraseña incorrecta). `data.error` es el formato común de error de Strapi.
      if (data.error) {
        const errorMessage = data.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
        throw new Error(errorMessage);
      }

      // Si todo está bien y tenemos data.jwt y data.user
      if (data.jwt && data.user) {
        await signIn(data.user, data.jwt); // Llama a signIn del AuthContext
        // signIn se encargará de guardar el token, los datos del usuario y actualizar el estado.
        // Y luego navegará o el router escuchará el cambio de estado de autenticación.
        Alert.alert('Inicio de Sesión Exitoso', `¡Bienvenido ${data.user.username}!`);
        // La navegación debería manejarse idealmente por el estado de autenticación en tu _layout.tsx o App.tsx
        // o puedes forzarla aquí si es necesario:
        router.replace('/(tabs)'); // O la ruta principal después del login
      } else {
        // Esto no debería suceder si la respuesta.ok y no hay data.error, pero por si acaso.
        throw new Error('Respuesta de login inválida del servidor.');
      }

    } catch (err: any) {
      console.error('[LoginScreen] Error en handleLogin:', err);
      // setError(err.message); // Si quieres mostrar el error en la UI
      Alert.alert('Error de Login', err.message || 'No se pudo conectar al servidor o ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Iniciar Sesión</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Correo Electrónico o Usuario</Text>
            <TextInput
              style={styles.textInput}
              placeholder="tu@correo.com o tuUsuario"
              placeholderTextColor="#9ca3af"
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Tu contraseña"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Link href="/Auth/ForgotPasswordScreen" asChild style={styles.forgotPasswordLinkContainer}>
              <TouchableOpacity disabled={isLoading}>
                <Text style={styles.forgotPasswordLinkText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <TouchableOpacity onPress={handleLogin} style={[styles.button, styles.buttonSubmit]} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#075985" />
            ) : (
              <Text style={styles.buttonSubmitText}>Ingresar</Text>
            )}
          </TouchableOpacity>

          <Link href="/Auth/RegisterScreen" asChild style={styles.linkToRegister}>
            <TouchableOpacity disabled={isLoading}>
              <Text style={styles.linkToRegisterText}>
                ¿No tienes cuenta? Regístrate
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Tus estilos (styles) se mantienen igual.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
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
    paddingVertical: 12,
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
    fontSize: 12,
    color: '#0284c7',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSubmit: {
    backgroundColor: '#facc15',
    marginBottom: 24,
  },
  buttonSubmitText: {
    color: '#075985',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
  },
  linkToRegister: {},
  linkToRegisterText: {
    textAlign: 'center',
    color: '#0284c7',
    fontWeight: '500',
  },
});

export default LoginScreen;
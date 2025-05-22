// app/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView, StatusBar,
  Alert, StyleSheet, Platform, ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import SponsorBottom from '@/components/elementos/SponsorBottom';

const STRAPI_BACKEND_URL = 'https://3c1c-200-127-6-159.ngrok-free.app'; // Asegúrate que esta sea tu URL correcta

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
          'ngrok-skip-browser-warning': 'true', // Solo para desarrollo con ngrok si es necesario
        },
        body: JSON.stringify({ identifier, password }),
      });

      const clonedResponse = response.clone();
      const responseText = await clonedResponse.text();

      if (!response.ok) {
        let errorMessage = `Error del servidor: ${response.status}.`;
        if (responseText) {
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData?.error?.message || errorData?.message || responseText;
          } catch (e) {
            errorMessage = responseText.substring(0, 200);
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.error) {
        const errorMessage = data.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
        throw new Error(errorMessage);
      }

      if (data.jwt && data.user) {
        await signIn(data.user, data.jwt);
        Alert.alert('Inicio de Sesión Exitoso', `¡Bienvenido ${data.user.username}!`);
        // Navegar a la pantalla de perfil después del login exitoso
        router.replace('/(tabs)/profile');
      } else {
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formOuterContainer}>
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
                  autoComplete="username"
                  textContentType="username"
                  editable={!isLoading}
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
                  autoComplete="password"
                  textContentType="password"
                  editable={!isLoading}
                />
                <Link href="/Auth/ForgotPasswordScreen" asChild style={styles.forgotPasswordLinkContainer}>
                  <TouchableOpacity disabled={isLoading}>
                    <Text style={styles.forgotPasswordLinkText}>¿Olvidaste tu contraseña?</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <TouchableOpacity onPress={handleLogin} style={[styles.button, styles.buttonSubmit]} disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={styles.buttonSubmitText.color} />
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
              <SponsorBottom
                imageHeight={35}
                imageWidth={110}
                backgroundColor="rgba(10,20,70,0.7)"
                title="Con el Apoyo de"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#142986',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formOuterContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
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
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSubmit: {
    backgroundColor: '#facc15',
    marginBottom: 24,
    minHeight: 50,
  },
  buttonSubmitText: {
    color: '#075985',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
  },
  linkToRegister: { // Estilo para el TouchableOpacity del link de registro
    marginTop: 16,
    alignSelf: 'center',
  },
  linkToRegisterText: {
    textAlign: 'center',
    color: '#0284c7',
    fontWeight: '500',
    padding: 8,
  },
  // Los siguientes estilos no se usan directamente en LoginScreen pero estaban en tu archivo original.
  // Puedes eliminarlos si no los necesitas para este componente específico.
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
  errorText: { // Estilo de error genérico, por si lo necesitas para mostrar errores de API
    color: 'red',
    textAlign: 'center',
    alignSelf: 'center',
    padding: 10,
    marginBottom:10,
    backgroundColor: 'rgba(255,220,220,0.8)',
    borderRadius: 4,
  }
});

export default LoginScreen;
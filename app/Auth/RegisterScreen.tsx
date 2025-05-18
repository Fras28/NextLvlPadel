// app/Auth/RegisterScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  StatusBar, ScrollView, Alert, StyleSheet, Platform, ActivityIndicator
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext'; // <-- IMPORTA useAuth

// Asegúrate que esta URL sea correcta y accesible desde tu dispositivo/emulador
const STRAPI_BACKEND_URL = 'https://6544-200-127-6-159.ngrok-free.app ';

const RegisterScreen = () => {
  const router = useRouter();
  // En Strapi, el registro usa 'username', 'email', 'password'.
  // 'fullName' y 'padelLevel' son campos personalizados que quizás necesites
  // añadir a tu Content-Type 'user' en Strapi si quieres guardarlos directamente.
  const { signIn } = useAuth(); // <-- USA EL HOOK
  const [username, setUsername] = useState<string>(''); // 'username' para Strapi
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  // Campos adicionales (asegúrate que tu backend Strapi los acepte o guárdalos de otra forma)
  const [fullName, setFullName] = useState<string>(''); // Podrías usarlo para 'username' o un campo custom
  const [padelLevel, setPadelLevel] = useState<string>(''); // Campo custom

  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // const [error, setError] = useState<string>('');

  const handleRegister = async () => {
    // setError(''); // Limpiar errores previos
    if (!username || !email || !password || !confirmPassword /* || !padelLevel */) { // PadelLevel es opcional aquí, depende de tu lógica
      Alert.alert('Campos incompletos', 'Por favor, completa usuario, email y contraseña.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Contraseña insegura', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error de contraseña', 'Las contraseñas no coinciden.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Email inválido', 'Por favor, ingresa un correo electrónico válido.');
      return;
    }
    if (!termsAccepted) {
      Alert.alert('Términos y Condiciones', 'Debes aceptar los términos y condiciones.');
      return;
    }

    setIsLoading(true);

    try {
      const registrationPayload: any = {
        username, // Strapi usa 'username'. Si 'fullName' es diferente, decide cuál usar o si 'username' es único.
        email,
        password,
        // Aquí puedes añadir campos adicionales si tu endpoint de registro de Strapi los permite
        // o si has personalizado el controlador de registro.
        // Por ejemplo, si tienes campos custom 'fullName' y 'padelLevel' en tu User content-type:
        // fullName: fullName, (solo si 'username' es diferente y 'fullName' es un campo aparte)
        // padelCategory: padelLevel, // Asegúrate que el nombre del campo coincida con Strapi
      };

      // Si fullName está pensado para ser el username, y username es un campo separado
      // podrías hacer algo como:
      // if (fullName && !username) setUsername(fullName.replace(/\s+/g, '').toLowerCase());
      // Pero es mejor tener un campo de 'username' explícito.
      // El `RegisterForm.js` usa `username` directamente.

      const response = await fetch(`${STRAPI_BACKEND_URL}/api/auth/local/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationPayload),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMessage = data?.error?.message || data?.message?.[0]?.messages?.[0]?.message || 'Ocurrió un error en el registro.';
        throw new Error(errorMessage);
      }

      console.log('Registro data:', data);
      // Opcional: auto-login después del registro si Strapi devuelve JWT y user
      if (data.jwt && data.user) { // Si Strapi devuelve token y user en registro (auto-login)
        await signIn(data.user, data.jwt); // <-- LLAMA A signIn
        Alert.alert('Registro Exitoso', `¡Bienvenido ${data.user.username}!`);
        router.replace('/(tabs)');
      } else { // Si no hay auto-login
        Alert.alert('Registro Exitoso', '¡Cuenta creada! Por favor, inicia sesión.');
        router.replace('/Auth/LoginScreen');
      }

    } catch (err: any) {
      console.error('Error en handleRegister:', err);
      // setError(err.message);
      Alert.alert('Error de Registro', err.message || 'No se pudo conectar al servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.scrollView}>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Crear Cuenta</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre de Usuario</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Elige un nombre de usuario único"
              placeholderTextColor="#9ca3af"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          {/* Podrías tener un campo separado para Nombre Completo si es diferente al username */}
          {/* <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre Completo</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Juan Pérez"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View> */}


          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Correo Electrónico</Text>
            <TextInput
              style={styles.textInput}
              placeholder="tu@correo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirmar Contraseña</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          {/* <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nivel de Pádel (1ra a 7ma)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: 6ta"
              value={padelLevel}
              onChangeText={setPadelLevel}
            />
            <Text style={styles.inputHelperText}>Indica tu categoría aproximada.</Text>
          </View> */}

          <View style={styles.checkboxContainer}>
            <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)} style={[styles.checkboxBase, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && <Text style={styles.checkboxCheckmark}>✓</Text>}
            </TouchableOpacity>
            <Link href={"/terms" as any} asChild>
              <TouchableOpacity>
                <Text style={styles.termsText}>
                  Acepto los <Text style={styles.termsLink}>Términos y Condiciones</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* {error ? <Text style={styles.errorText}>{error}</Text> : null} */}

          <TouchableOpacity onPress={handleRegister} style={[styles.button, styles.buttonSubmit]} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#075985" />
            ) : (
              <Text style={styles.buttonSubmitText}>Registrarme</Text>
            )}
          </TouchableOpacity>

          <Link href="/Auth/LoginScreen" asChild style={styles.linkToLogin}>
            <TouchableOpacity disabled={isLoading}>
              <Text style={styles.linkToLoginText}>
                ¿Ya tienes cuenta? Inicia Sesión
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Tus estilos (styles) se mantienen. Puedes añadir errorText.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
   backgroundColor: '#f3f4f6', // bg-gray-100
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  formContainer: { // Este SÍ tiene fondo blanco para el formulario
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
    alignSelf: 'center',
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
  inputHelperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxBase: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#9ca3af',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  checkboxCheckmark: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  termsText: {
    fontSize: 14,
    color: '#374151',
    flexShrink: 1,
  },
  termsLink: {
    color: '#0284c7',
    fontWeight: 'bold',
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
  },
  buttonSubmitText: {
    color: '#075985',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
  },
  linkToLogin: {
    marginTop: 24,
  },
  linkToLoginText: {
    textAlign: 'center',
    color: '#0284c7',
    fontWeight: '500',
  },
  // errorText: {
  //   color: 'red',
  //   textAlign: 'center',
  //   marginBottom: 10,
  // }
});

export default RegisterScreen;
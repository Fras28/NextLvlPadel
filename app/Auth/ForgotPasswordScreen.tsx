// app/Auth/ForgotPasswordScreen.tsx
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
  KeyboardAvoidingView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Para el botón de volver

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');

  const handlePasswordReset = () => {
    if (!email) {
      Alert.alert('Campo incompleto', 'Por favor, ingresa tu correo electrónico.');
      return;
    }
    // Aquí iría la lógica para llamar a tu backend y solicitar el reseteo de contraseña
    console.log('Solicitud de reseteo para:', email);
    Alert.alert(
      'Solicitud Enviada (Simulado)',
      `Si existe una cuenta asociada a ${email}, recibirás un correo con instrucciones.`,
      [
        { text: 'OK', onPress: () => router.back() } // Volver a la pantalla anterior (Login)
      ]
    );
    // Idealmente, aquí limpiarías el campo de email o manejarías el estado de carga
    // setEmail('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={styles.safeArea.backgroundColor} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoiding}
      >
        <View style={styles.container}>
          {/* Botón para volver */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#0284c7" />
          </TouchableOpacity>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>
              Recuperar Contraseña
            </Text>
            <Text style={styles.formSubtitle}>
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo Electrónico</Text>
              <TextInput
                style={styles.textInput}
                placeholder="tu@correo.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <TouchableOpacity onPress={handlePasswordReset} style={[styles.button, styles.buttonSubmit]}>
              <Text style={styles.buttonSubmitText}>
                Enviar Enlace
              </Text>
            </TouchableOpacity>

            {/* Opcional: Enlace para volver al Login si el usuario no quiere usar el botón de flecha */}
            {/* <Link href="/Auth/LoginScreen" asChild style={styles.linkToLogin}>
              <TouchableOpacity>
                <Text style={styles.linkToLoginText}>
                  Volver a Iniciar Sesión
                </Text>
              </TouchableOpacity>
            </Link> */}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6', // bg-gray-100
  },
  keyboardAvoiding: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center', // Centra el contenido verticalmente
    alignItems: 'center',
    paddingHorizontal: 24, // px-6
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 20, // Ajusta según sea necesario para SafeAreaView
    left: 20,
    zIndex: 10, // Para asegurar que esté encima de otros elementos
    padding: 8, // Para hacer más fácil el toque
  },
  formContainer: {
    backgroundColor: 'white',
    padding: Platform.OS === 'ios' ? 24 : 32, // p-6 sm:p-8
    borderRadius: 12, // rounded-xl
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
    maxWidth: 448, // max-w-md
  },
  formTitle: {
    fontSize: 26, // text-2xl o text-3xl
    fontWeight: 'bold',
    color: '#0369a1', // text-sky-700
    marginBottom: 12, // mb-3
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#4b5563', // text-gray-600
    marginBottom: 28, // mb-7
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  inputGroup: {
    marginBottom: 24, // Similar a space-y-X o mb-X en los inputs
  },
  inputLabel: {
    fontSize: 14, // text-sm
    fontWeight: '500', // font-medium
    color: '#374151', // text-gray-700
    marginBottom: 4, // mb-1
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  textInput: {
    width: '100%',
    paddingHorizontal: 16, // px-4
    paddingVertical: 12, // py-3
    borderWidth: 1,
    borderColor: '#d1d5db', // border-gray-300
    borderRadius: 8, // rounded-lg
    backgroundColor: 'white',
    color: '#111827', // text-gray-900
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  button: {
    width: '100%',
    paddingVertical: 16, // py-4
    paddingHorizontal: 24, // px-6
    borderRadius: 8, // rounded-lg
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  buttonSubmit: {
    backgroundColor: '#0284c7', // bg-sky-600 (un color diferente al de login)
    marginBottom: 16, // mb-4 (ajustado si no hay link abajo)
  },
  buttonSubmitText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18, // text-lg
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  linkToLogin: { // Estilos para el enlace opcional de volver al login
    marginTop: 16,
  },
  linkToLoginText: {
    textAlign: 'center',
    color: '#0284c7', // text-sky-600
    fontWeight: '500', // font-medium
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  }
});

export default ForgotPasswordScreen;
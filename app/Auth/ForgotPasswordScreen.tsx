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
  ScrollView, // <--- IMPORTADO
} from 'react-native';
import { useRouter } from 'expo-router'; // Link no se usa directamente aquí
import { Ionicons } from '@expo/vector-icons';

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  // No hay estado de carga (isLoading) actualmente, pero podría ser útil si la llamada a la API tarda.
  // const [isLoading, setIsLoading] = useState<boolean>(false);

  const handlePasswordReset = () => {
    if (!email.trim()) {
      Alert.alert('Campo incompleto', 'Por favor, ingresa tu correo electrónico.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert("Email inválido", "Por favor, ingresa un correo electrónico válido.");
      return;
    }
    // setIsLoading(true); // Si añades estado de carga
    console.log('Solicitud de reseteo para:', email);
    Alert.alert(
      'Solicitud Enviada (Simulado)',
      `Si existe una cuenta asociada a ${email}, recibirás un correo con instrucciones.`,
      [
        { text: 'OK', onPress: () => router.back() }
      ]
    );
    // .finally(() => setIsLoading(false)); // Si añades estado de carga
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={styles.safeArea.backgroundColor} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoiding} // Ya tenías flex: 1 aquí, lo cual es bueno
      >
        <ScrollView
          contentContainerStyle={styles.scrollContentContainer} // Estilo para centrar y permitir crecimiento
          keyboardShouldPersistTaps="handled" // Para que los taps funcionen con el teclado abierto
          showsVerticalScrollIndicator={false}
        >
          {/* El View 'contentWrapper' ayuda a organizar el contenido dentro del ScrollView */}
          {/* y sirve de referencia para el posicionamiento absoluto del botón de volver. */}
          <View style={styles.contentWrapper}>
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
                  // editable={!isLoading} // Si añades estado de carga
                />
              </View>

              <TouchableOpacity
                onPress={handlePasswordReset}
                style={[styles.button, styles.buttonSubmit]}
                // disabled={isLoading} // Si añades estado de carga
              >
                {/* {isLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.buttonSubmitText}>Enviar Enlace</Text>} */}
                <Text style={styles.buttonSubmitText}>
                  Enviar Enlace
                </Text>
              </TouchableOpacity>
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
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContentContainer: { // Nuevo: Contenedor del ScrollView
    flexGrow: 1, // Permite que el contenido crezca
    justifyContent: 'center', // Centra el 'contentWrapper' verticalmente
    paddingHorizontal: 24, // Mantenemos el padding horizontal aquí
  },
  contentWrapper: { // Nuevo: Contenedor para alinear el formContainer y el backButton
    alignItems: 'center', // Centra el 'formContainer' horizontalmente
    width: '100%',
    // position: 'relative', // Opcional: si el backButton necesita un ancestro posicionado explícitamente
  },
  // El estilo 'container' original se ha reemplazado por 'scrollContentContainer' y 'contentWrapper'
  backButton: {
    position: 'absolute',
    // Ajustamos top y left para que se alinee con el padding de scrollContentContainer
    // y esté un poco por encima o al inicio del formContainer visualmente.
    // Estos valores pueden necesitar ajustes finos.
    top: 0, // Se alineará con la parte superior del contentWrapper (que está centrado)
            // Si el formContainer es el primer elemento visible, esto podría estar bien.
            // O puedes darle un valor negativo pequeño para que esté "fuera" del formContainer.
    left: 0,  // Se alineará con el inicio del contentWrapper (que tiene padding del scrollContentContainer)
    zIndex: 10,
    padding: 8, // Área táctil
    // Para que el botón esté en la esquina superior izquierda de la pantalla visible por el padding:
    // Si scrollContentContainer tiene paddingHorizontal: 24,
    // para que esté a 20px del borde real, left sería 20 - 24 = -4, (si contentWrapper no tuviera su propio padding)
    // Es más simple si lo posicionamos relativo al contentWrapper que ya está centrado y con padding.
    // Este posicionamiento lo coloca en la esquina superior izquierda del 'contentWrapper'.
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
    width: '100%', // formContainer tomará el ancho de contentWrapper
    maxWidth: 448,
    marginTop: 50, // Añadido para dar espacio al backButton si está posicionado arriba
  },
  formTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0369a1',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 28,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  buttonSubmit: {
    backgroundColor: '#0284c7',
    marginBottom: 16,
  },
  buttonSubmitText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  // Los estilos linkToLogin y linkToLoginText no se usan si el Link está comentado
});

export default ForgotPasswordScreen;
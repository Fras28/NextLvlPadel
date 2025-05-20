// app/Auth/LoginScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView, StatusBar,
  Alert, StyleSheet, Platform, ActivityIndicator,
  Image, Animated, Easing, /* Dimensions, */ ImageSourcePropType, AppState // Dimensions no se usaba aquí
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

const STRAPI_BACKEND_URL = 'https://a1f3-200-127-6-159.ngrok-free.app';

const FLUORESCENT_YELLOW = '#DFFF00';

interface Sponsor {
  id: string;
  image: ImageSourcePropType;
  name?: string;
}

const SPONSOR_LOGOS: Sponsor[] = [
  { id: 'sponsor1', image: require('../../assets/images/VairoSponsor.png'), name: 'Sponsor 1' },
  { id: 'sponsor2', image: require('../../assets/images/3M.png'), name: 'Sponsor 2' },
  { id: 'sponsor3', image: require('../../assets/images/HeadLogo.png'), name: 'Sponsor 3' },
  { id: 'sponsor4', image: require('../../assets/images/AsicsLogo.png'), name: 'Sponsor 4' },
  { id: 'sponsor5', image: require('../../assets/images/PumaLogo.png'), name: 'Sponsor 5' },
  { id: 'sponsor6', image: require('../../assets/images/Joma.png'), name: 'Sponsor 6' },
  { id: 'sponsor7', image: require('../../assets/images/RedBull.png'), name: 'Sponsor 7' },
];

const SPONSOR_IMAGE_HEIGHT = 40;
const SPONSOR_IMAGE_WIDTH = 100;
const SPONSOR_IMAGE_MARGIN_HORIZONTAL = 10;

interface SponsorImageMarqueeProps {
  sponsors: Sponsor[];
  speed?: number;
  imageHeight?: number;
  imageWidth?: number;
  imageMarginHorizontal?: number;
}

// Componente SponsorImageMarquee (definido localmente)
const SponsorImageMarquee: React.FC<SponsorImageMarqueeProps> = ({
  sponsors,
  speed = 40,
  imageHeight = SPONSOR_IMAGE_HEIGHT,
  imageWidth = SPONSOR_IMAGE_WIDTH,
  imageMarginHorizontal = SPONSOR_IMAGE_MARGIN_HORIZONTAL,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [actualContentWidth, setActualContentWidth] = useState(0);
  const [isMeasured, setIsMeasured] = useState(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      animationRef.current?.stop();
    };
  }, []);

  const itemsToMeasure = sponsors;
  // Solo duplicar para la animación si ya se midió y hay ancho, para evitar trabajo innecesario.
  const itemsToAnimate = isMeasured && actualContentWidth > 0 ? [...sponsors, ...sponsors] : [];

  useEffect(() => {
    animationRef.current?.stop();
    // Solo iniciar animación si está medido, hay ancho y hay ítems para animar.
    if (isMeasured && actualContentWidth > 0 && itemsToAnimate.length > 0) {
      animatedValue.setValue(0);
      const duration = (actualContentWidth / speed) * 1000;
      animationRef.current = Animated.loop(
        Animated.timing(animatedValue, {
          toValue: -actualContentWidth,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      animationRef.current.start();
    }
    return () => {
      animationRef.current?.stop();
    };
  }, [isMeasured, actualContentWidth, speed, animatedValue, itemsToAnimate]); // itemsToAnimate es una dependencia clave aquí

  const handleLayoutMeasure = (event: { nativeEvent: { layout: { width: number } } }) => {
    if (!isMountedRef.current || isMeasured) return;
    const measuredWidth = event.nativeEvent.layout.width;
    if (measuredWidth > 0) {
      setActualContentWidth(measuredWidth);
      setIsMeasured(true);
    }
  };
  
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (!isMountedRef.current || !animationRef.current) return;
      if (nextAppState === 'active' && isMeasured && actualContentWidth > 0) {
        animationRef.current.start();
      } else {
        animationRef.current.stop();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isMeasured, actualContentWidth, animatedValue]);

  // Correcto: si no hay patrocinadores, devuelve null, no una cadena de texto.
  if (!sponsors || sponsors.length === 0) return null;

  const sponsorImageStyle = {
    height: imageHeight,
    width: imageWidth,
    marginHorizontal: imageMarginHorizontal,
    resizeMode: 'contain' as 'contain',
  };

  return (
    <View style={styles.sponsorCarouselOuterContainer}> 
      {/* Contenedor para medir, se mantiene invisible */}
      {!isMeasured && (
        <View style={styles.measureContainer} onLayout={handleLayoutMeasure}>
          {itemsToMeasure.map((sponsor) => (
            // Renderiza componentes Image, no texto directo.
            <Image key={`measure-sponsor-${sponsor.id}`} source={sponsor.image} style={sponsorImageStyle} />
          ))}
        </View>
      )}
      {/* Contenedor animado, visible después de medir y si hay contenido */}
      {isMeasured && actualContentWidth > 0 && itemsToAnimate.length > 0 && (
        <Animated.View style={[styles.marqueeContainer, { transform: [{ translateX: animatedValue }] }]}>
          {itemsToAnimate.map((sponsor, index) => (
            // Renderiza componentes Image, no texto directo.
            <Image key={`marquee-sponsor-${sponsor.id}-${index}`} source={sponsor.image} style={sponsorImageStyle} />
          ))}
        </Animated.View>
      )}
      {/* Texto de error envuelto correctamente en <Text> */}
      {/* Mostrar error solo si se midió, el ancho es 0, pero había items para medir (evita mostrar error si no hay sponsors) */}
      {isMeasured && actualContentWidth === 0 && itemsToMeasure.length > 0 && (
        <Text style={styles.errorText}>Error al medir sponsors.</Text>
      )}
    </View>
  );
};

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
          </View>
        </View>
        
        <SponsorImageMarquee sponsors={SPONSOR_LOGOS} speed={50} />
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
  sponsorCarouselOuterContainer: {
    height: SPONSOR_IMAGE_HEIGHT + 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    borderTopWidth: 2,
    borderTopColor: FLUORESCENT_YELLOW,
    overflow: 'hidden',
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
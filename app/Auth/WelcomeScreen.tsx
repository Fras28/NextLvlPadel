// app/Auth/WelcomeScreen.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, StatusBar, StyleSheet,
  Platform, Image, Animated, Easing, Dimensions, ImageSourcePropType, AppState,
  ImageBackground
  // Para TextLayoutEvent si quieres tipar más estrictamente el evento onLayout de Text (opcional)
  // type TextLayoutEventData, NativeSyntheticEvent
} from 'react-native';
import { Link } from 'expo-router';

// --- INICIO DE RECORDATORIO IMPORTANTE ---
// ¡ATENCIÓN A LOS LOGS DE TU CONSOLA!
// 1. "Reduced motion setting is enabled on this device."
//    - SOLUCIÓN: Ve a los Ajustes de Accesibilidad de tu dispositivo/emulador
//      y DESACTIVA "Reducir Movimiento" o cualquier opción similar.
//      Esta es una causa MUY COMÚN de que las animaciones no se vean.
//
// 2. "Animated: `useNativeDriver` is not supported because the native animated module is missing."
//    - La opción `useNativeDriver` en el código de abajo está en `false` debido a este error.
//      Esto hará que la animación use el hilo de JS (menos fluida).
//    - SOLUCIÓN (si estás en Bare Workflow o Custom Dev Client):
//      Asegúrate de que las dependencias nativas estén bien.
//      Para iOS: `npx pod-install` (o `cd ios && pod install`) y reconstruye tu app.
//      Para Android: Reconstruye tu app.
//    - Si logras arreglarlo, cambia `useNativeDriver: false` a `useNativeDriver: true` para mejor rendimiento.
// --- FIN DE RECORDATORIO IMPORTANTE ---

interface Player {
  id: string;
  name: string;
  image?: ImageSourcePropType;
}

const FIRST_CATEGORY_PLAYERS: Player[] = [
  { id: '1', name: 'Selvarolo' }, { id: '2', name: 'Tanoni' },
  { id: '3', name: 'Caspanelo' }, { id: '4', name: 'Padin' },
  { id: '5', name: 'Schmidt' }, { id: '6', name: 'Figueroa' },
  { id: '7', name: 'Bustos' }, { id: '8', name: 'Gamio' },
  { id: '9', name: 'Jacob' }, { id: '10', name: 'Rivas' },
];

const { width: screenWidth } = Dimensions.get('window');
const FLUORESCENT_YELLOW = '#DFFF00';

const LogoPlaceholder = () => (
  <View>
    <Image
      source={require('../../assets/images/LogoPadel.png')} // Asegúrate que la ruta sea correcta
      style={styles.logoImage}
      resizeMode="contain"
    />
  </View>
);

interface PlayerMarqueeProps {
  players: Player[];
  speed?: number; // Píxeles por segundo
}

const PlayerMarquee: React.FC<PlayerMarqueeProps> = ({ players, speed = 40 }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [actualContentWidth, setActualContentWidth] = useState(0);
  const [isMeasured, setIsMeasured] = useState(false); // Para controlar el renderizado de medición vs animación
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isMountedRef = useRef(true); // Para evitar updates de estado en componente desmontado

  console.log('[PlayerMarquee] Component rendered. isMeasured:', isMeasured, 'actualContentWidth:', actualContentWidth);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      animationRef.current?.stop();
      console.log('[PlayerMarquee] Unmounted, animation stopped.');
    };
  }, []);

  const playerDisplayItems = players.map((player) => {
    const originalPlayerIndex = players.findIndex(p => p.id === player.id);
    return `${originalPlayerIndex + 1}#${player.name}`;
  });

  const itemsToAnimate = isMeasured ? [...playerDisplayItems, ...playerDisplayItems] : [];
  const itemsToMeasure = playerDisplayItems; // Siempre medimos la lista simple

  useEffect(() => {
    // Iniciar o reiniciar la animación si el ancho del contenido o la velocidad cambian
    animationRef.current?.stop(); // Detener animación anterior

    if (isMeasured && actualContentWidth > 0) {
      console.log('[PlayerMarquee] Attempting to start animation. Width:', actualContentWidth, 'Speed:', speed);
      animatedValue.setValue(0); // Reiniciar la posición
      const duration = (actualContentWidth / speed) * 1000;

      animationRef.current = Animated.loop(
        Animated.timing(animatedValue, {
          toValue: -actualContentWidth,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: false, // MANTENIDO EN FALSE DEBIDO A TU LOG. Cambiar a TRUE si arreglas el módulo nativo.
        })
      );
      animationRef.current.start();
      console.log('[PlayerMarquee] Animation started.');
    } else if (isMeasured) {
      console.log('[PlayerMarquee] Measured, but actualContentWidth is not > 0. Width:', actualContentWidth);
    }

    return () => {
      animationRef.current?.stop();
    };
  }, [isMeasured, actualContentWidth, speed, animatedValue]);

  const handleLayoutMeasure = (event: { nativeEvent: { layout: { width: number; }; }; }) => {
    if (!isMountedRef.current) return; // No hacer nada si está desmontado

    const measuredWidth = event.nativeEvent.layout.width;
    console.log('[PlayerMarquee] handleLayoutMeasure fired. Measured width:', measuredWidth);
    if (!isMeasured && measuredWidth > 0) {
      console.log('[PlayerMarquee] Setting actualContentWidth:', measuredWidth);
      setActualContentWidth(measuredWidth);
      setIsMeasured(true);
    } else if (isMeasured) {
      console.log('[PlayerMarquee] Already measured. current actualContentWidth:', actualContentWidth);
    } else {
      console.log('[PlayerMarquee] Measured width is 0 or component not ready.');
    }
  };

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (!isMountedRef.current) return;

      if (animationRef.current) {
        if (nextAppState === 'active' && isMeasured && actualContentWidth > 0) {
          console.log('[PlayerMarquee] AppState active: Restarting animation.');
          // Reiniciar la animación puede ser necesario si el loop se detiene completamente
          animatedValue.setValue(0); // Opcional: resetear posición para evitar saltos
          animationRef.current.start();
        } else {
          console.log('[PlayerMarquee] AppState inactive/background: Stopping animation.');
          animationRef.current.stop();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      animationRef.current?.stop(); // Asegurar que se detenga al quitar la suscripción
    };
  }, [isMeasured, actualContentWidth, animatedValue]); // Asegurar dependencias correctas

  if (!players || players.length === 0) {
    console.log('[PlayerMarquee] No players to display.');
    return null;
  }

  return (
    <View style={styles.carouselOuterContainer}>
      {!isMeasured && (
        // Vista para Medición (invisible o de altura 0 si se prefiere, pero debe renderizar el contenido)
        <View 
          style={styles.measureContainer} 
          onLayout={handleLayoutMeasure}
        >
          {itemsToMeasure.map((text, index) => (
            <Text key={`measure-${index}`} style={styles.carouselItemText} numberOfLines={1}>
              {text}
              {index < itemsToMeasure.length - 1 ? <Text style={styles.separator}> | </Text> : null}
            </Text>
          ))}
        </View>
      )}

      {isMeasured && actualContentWidth > 0 && (
        <Animated.View
          style={[
            styles.marqueeContainer,
            { transform: [{ translateX: animatedValue }] },
          ]}
        >
          {itemsToAnimate.map((text, index) => (
            <Text key={`marquee-${index}`} style={styles.carouselItemText} numberOfLines={1}>
              {text}
              {index < itemsToAnimate.length - 1 && playerDisplayItems.length > 0 ? <Text style={styles.separator}> | </Text> : null}
            </Text>
          ))}
        </Animated.View>
      )}
      {isMeasured && actualContentWidth === 0 && (
         <Text style={styles.errorText}>Error al medir contenido para marquesina.</Text>
      )}
    </View>
  );
};

const WelcomeScreen = () => {
  console.log('[WelcomeScreen] Rendering.');
  return (
    <SafeAreaView style={styles.safeAreaOuter}> {/* Cambiamos el estilo aquí si SafeAreaView no es el que lleva el fondo */}
      {/* Envuelve el contenido principal con ImageBackground */}
      <ImageBackground
        source={require('../../assets/images/BackApp.jpg')} // Asegúrate que esta ruta sea correcta
        style={styles.backgroundImageContainer} // Estilo para ImageBackground
        resizeMode="cover" // O "stretch", "contain", etc., según cómo quieras que se vea la imagen
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" /> {/* O el color que desees sobre la imagen */}

        {/* PlayerMarquee puede ir aquí o dentro de mainContentContainer dependiendo del diseño */}
        <PlayerMarquee players={FIRST_CATEGORY_PLAYERS} speed={50} />

        <View style={styles.mainContentContainer}>
          <LogoPlaceholder />
          <Text style={styles.title}>Liga de Pádel Bahiense</Text>
          <Text style={styles.subtitle}>Organiza, compite y conecta con la comunidad de pádel.</Text>
          <Link href="/Auth/RegisterScreen" asChild>
            <TouchableOpacity style={[styles.button, styles.buttonRegister]}>
              <Text style={styles.buttonTextRegister}>Registrarse</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/Auth/LoginScreen" asChild>
            <TouchableOpacity style={[styles.button, styles.buttonLogin]}>
              <Text style={styles.buttonTextLogin}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </Link>
          <Text style={styles.versionText}>Versión MVP 0.1</Text>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  safeAreaOuter: { // Estilo para el SafeAreaView exterior, si es necesario
    flex: 1,
    // backgroundColor: '#0284c7', // Ya no necesitas el color de fondo si la imagen lo cubre
  },
  backgroundImageContainer: { // Estilo para el ImageBackground
    flex: 1, // Para que ocupe todo el espacio disponible
    // Puedes añadir padding aquí si quieres que el contenido no toque los bordes de la imagen
    // paddingTop: StatusBar.currentHeight, // Ejemplo si quieres compensar la StatusBar manualmente y es translúcida
    paddingTop:40,
  },
  // Tus otros estilos (carouselOuterContainer, marqueeContainer, etc. se mantienen igual)
  // ...
  carouselOuterContainer: {
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.5)', // Un fondo semi-transparente para que se lea mejor sobre la imagen
    justifyContent: 'center',
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Ajuste para StatusBar si es necesario, o 50 como tenías
    // marginTop: 50, // Como lo tenías antes, puedes ajustar según el diseño final con la imagen de fondo
    borderTopWidth: 2.5,
    borderBottomWidth: 2.5,
    borderTopColor: FLUORESCENT_YELLOW,
    borderBottomColor: FLUORESCENT_YELLOW,
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
  carouselItemText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)', // Sombra para el texto para mejor legibilidad sobre la imagen
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 3,
  },
  separator: {
    color: FLUORESCENT_YELLOW,
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 3,
  },
  mainContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.3)', // Opcional: un overlay oscuro para mejorar legibilidad del contenido
    // O quitar el backgroundColor para que el contenido esté directamente sobre la imagen de fondo
  },
  logoImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: Platform.OS === 'ios' ? 36 : 32,
    fontWeight: 'bold',
    color: 'white', // Asegúrate que el color contraste con tu imagen de fondo
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)', // Sombra para el texto
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#e0f2fe', // Asegúrate que el color contraste
    marginBottom: 48,
    textAlign: 'center',
    paddingHorizontal: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.5)', // Sombra para el texto
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 3,
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
  buttonRegister: {
    backgroundColor: '#facc15', 
    marginBottom: 20,
  },
  buttonLogin: {
   backgroundColor: '#facc15',  
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  buttonTextRegister: {
    color: '#075985',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
    backgroundColor: '#facc15', 
    padding:8,
    borderRadius:8,
    marginBottom:8,
    borderColor:'#0369A1',
    borderWidth:1,
    width:150,
  },
  buttonTextLogin: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
    backgroundColor:'#0369A1',
    padding:8,
    borderRadius:8,
    borderColor:'#facc15',
    borderWidth:1,
    width:150,
  },
  versionText: {
    color: '#bae6fd',
    fontSize: 12,
    marginTop: 64,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    alignSelf: 'center',
  }
});


export default WelcomeScreen;
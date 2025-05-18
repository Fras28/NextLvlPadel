// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar as ReactNativeStatusBar, ImageBackground, StyleSheet } from 'react-native'; // Removí View y Platform si no se usan aquí directamente
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '../context/AuthContext'; // <-- IMPORTA TU AUTHPROVIDER

const backgroundImageSource = require('../assets/images/BackApp.jpg');

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const transparentDefaultTheme = { /* ... (como lo tenías) ... */ };
  const transparentDarkTheme = { /* ... (como lo tenías) ... */ };
  const themeToUse = colorScheme === 'dark' ? transparentDarkTheme : transparentDefaultTheme;
  
  // Definiciones de temas transparentes
  const customDefaultTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: 'transparent',
    },
  };

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: 'transparent',
    },
  };

  const finalThemeToUse = colorScheme === 'dark' ? customDarkTheme : customDefaultTheme;


  if (!loaded) {
    return null;
  }

  return (
    // Envuelve todo con AuthProvider AHORA DENTRO de ImageBackground si quieres que el fondo sea global
    // O AuthProvider puede envolver ImageBackground si el contexto no depende del fondo visual.
    // Para este caso, AuthProvider dentro está bien.
    <ImageBackground
      source={backgroundImageSource}
      style={styles.globalBackgroundImage}
      resizeMode="cover"
    >
      <AuthProvider> {/* <--- ENVUELVE CON AUTHPROVIDER */}
        <ReactNativeStatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ThemeProvider value={finalThemeToUse}> {/* Usa finalThemeToUse */}
          <Stack
            screenOptions={{
              headerTransparent: true,
              headerTintColor: '#FFFFFF',
              headerTitleStyle: { fontWeight: 'bold' },
              headerStyle: { backgroundColor: 'transparent' },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="Auth/LoginScreen" options={{ title: 'Iniciar Sesión', headerShown: false }} />
            <Stack.Screen name="Auth/RegisterScreen" options={{ title: 'Crear Cuenta', headerShown: false }}/>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="CoordinateMatchScreen" options={{ title: 'Coordinar Partido', headerShown: true }} />
            <Stack.Screen name="RecordResultScreen" options={{ title: 'Registrar Resultado', headerShown: true }}/>
            <Stack.Screen name="terms" options={{ title: 'Términos y Condiciones', presentation: 'modal' }} />
            <Stack.Screen name="forgot-password" options={{ title: 'Recuperar Contraseña' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </ThemeProvider>
        <ExpoStatusBar style="light" />
      </AuthProvider> {/* <--- CIERRA AUTHPROVIDER */}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  globalBackgroundImage: {
    flex: 1,
  },
});
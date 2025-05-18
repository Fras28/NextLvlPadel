// app/index.tsx
// Este archivo DEBERÍA ser la ruta raíz de tu aplicación.
import React from 'react';

// Asegúrate de que la ruta a WelcomeScreen sea correcta.
// Debería estar en app/Auth/WelcomeScreen.tsx
import WelcomeScreenComponent from './Auth/WelcomeScreen'; 

export default function IndexScreen() {
  // Esta pantalla simplemente renderizará tu WelcomeScreen.
  // Los estilos de Tailwind NO funcionarán porque quitamos nativewind/babel.
  // Deberías ver el texto y los botones, pero sin los colores ni el formato de Tailwind.
  return <WelcomeScreenComponent />;
}

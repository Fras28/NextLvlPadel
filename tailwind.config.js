// tailwind.config.js
module.exports = {
    content: [
      "./App.{js,jsx,ts,tsx}",      // Para tu archivo App.js principal
      "./app/**/*.{js,jsx,ts,tsx}", // Para todo dentro de la carpeta app (pantallas, etc.)
      "./components/**/*.{js,jsx,ts,tsx}", // Para todo dentro de la carpeta components
      // Puedes añadir más rutas si tienes código en otras carpetas
    ],
    theme: {
      extend: {
        colors: { // Tu paleta de colores
          sky: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9',
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
          },
          amber: {
             300: '#fcd34d',
             400: '#facc15',
             500: '#f59e0b',
          },
          yellow: {
            50: '#fefce8',
            100: '#fef9c3',
            200: '#fef08a',
            300: '#fde047',
            400: '#facc15',
            500: '#eab308',
          }
        },
        fontFamily: {
          sans: ['Inter', 'sans-serif'], // Asegúrate de cargar esta fuente en tu proyecto Expo
        },
      },
    },
    plugins: [],
  };
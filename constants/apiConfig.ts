// src/config/apiConfig.ts

const MODO_DESARROLLO = __DEV__; // __DEV__ es una variable global en React Native que es true en desarrollo

// URL para desarrollo local (cuando Strapi corre en tu máquina y usas emulador/dispositivo en la misma red)
// Android Emulator usualmente accede a localhost de la máquina host vía 10.0.2.2
// iOS Simulator usualmente puede usar localhost directamente si Strapi está en la misma máquina.
// Para dispositivos físicos en la misma red Wi-Fi, usa la IP local de tu máquina donde corre Strapi.
const DEVELOPMENT_STRAPI_URL = 'http://10.0.2.2:1337'; // Ejemplo para Android Emulator
// const DEVELOPMENT_STRAPI_URL = 'http://localhost:1337'; // Ejemplo para iOS Simulator
// const DEVELOPMENT_STRAPI_URL = 'http://TU_IP_LOCAL:1337'; // Ejemplo para dispositivo físico

// URL para producción (tu backend Strapi desplegado)
const PRODUCTION_STRAPI_URL = 'https://tu-api-strapi-en-produccion.com'; // ¡REEMPLAZA ESTO!

export const STRAPI_BACKEND_URL = MODO_DESARROLLO 
    ? DEVELOPMENT_STRAPI_URL 
    : PRODUCTION_STRAPI_URL;

// También puedes exportar otras constantes de API aquí si es necesario
// export const GOOGLE_WEB_CLIENT_ID = 'TU_GOOGLE_WEB_CLIENT_ID...';
// export const GOOGLE_ANDROID_CLIENT_ID = 'TU_GOOGLE_ANDROID_CLIENT_ID...';
// export const GOOGLE_IOS_CLIENT_ID = 'TU_GOOGLE_IOS_CLIENT_ID...';
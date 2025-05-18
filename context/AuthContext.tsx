// context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// --- INTERFACES BASADAS EN TUS SCHEMAS Y EJEMPLO DE RESPUESTA ---

// Para el campo 'profilePicture' (Media)
// Si Strapi devuelve el objeto de media directamente bajo user.profilePicture
export interface StrapiMedia {
  id: number;
  name: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  formats?: {
    thumbnail?: { url: string; /* ... */ };
    small?: { url: string; /* ... */ };
    // ...
  } | null;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string; // Ruta relativa
  previewUrl?: string | null;
  provider: string;
  provider_metadata?: any;
  createdAt: string;
  updatedAt: string;
}

// Para la relación 'category'
export interface Category {
  id: number;
  documentId?: string; // Visto en tu ejemplo
  name: string;
  level?: number | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

// Para la relación 'player_stat'
export interface PlayerStat {
  id: number;
  documentId?: string; // Visto en tu ejemplo
  totalMatches?: number | null;
  wins?: number | null;
  losses?: number | null;
  currentRank?: number | null;
  categoryPoints?: number | null;
  promotionPoints?: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

// Para la relación 'team_stats' (asociada a un Team)
export interface TeamStat {
  id: number;
  documentId?: string; // Asumiendo consistencia
  totalMatches?: number | null;
  wins?: number | null;
  losses?: number | null;
  categoryPoints?: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

// Para 'membership_plan'
export interface MembershipPlan {
    id: number;
    documentId?: string;
    name: string;
    description?: string | null;
    price?: number;
    moneda?: string;
    duration_days?: number;
    mercadopago_plan_id?: string | null;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null;
}

// Interfaz principal del Usuario para el Contexto
// Refleja la estructura de la respuesta de /api/users/:id?populate=*
export interface User {
  id: number;
  username: string;
  email: string;
  provider?: string;
  confirmed?: boolean;
  blocked?: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  documentId?: string;

  name?: string | null;
  phone?: string | null;
  isActive?: boolean | null;
  subscriptionEndDate?: string | null;
  stripeCustomerId?: string | null;
  membership_status?: 'active' | 'inactive' | 'pending_payment' | 'cancelled' | null;
  mercadopago_subscription_id?: string | null;

  // Relaciones populadas (AHORA DIRECTAS, basado en tu ejemplo)
  profilePicture?: StrapiMedia | null;
  category?: Category | null;
  player_stat?: PlayerStat | null;
  teams?: Team[] | null; // Array de objetos Team
  membership_plan?: MembershipPlan | null;
  role?: any; // Puedes tipar 'role' más específicamente si lo necesitas
  // Omitiendo 'notifications', 'clubOwner', 'payments' por simplicidad
}

// Interfaz para Team (usada en la relación 'teams' de User y para el Ranking de Equipos)
// Esta interfaz representa un objeto Team tal como podría venir en user.teams
export interface Team {
  id: number;
  documentId?: string; // Visto en tu ejemplo
  name: string;
  isActive?: boolean | null;
  currentRank?: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;

  // Si estas relaciones DENTRO de Team también se populan y necesitas sus detalles:
  // users_permissions_users?: { data: Partial<User>[] | null }; // Si siguiera la estructura data/attributes
  users_permissions_users?: Partial<User>[]; // O si es un array directo de usuarios parciales
  team_stats?: TeamStat | null; // Asumiendo que team_stats se popula directamente en Team
  category?: Category | null;   // Asumiendo que category se popula directamente en Team
}


// --- AuthContext ---
interface AuthContextData {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (strapiUserObjectFromLogin: any, jwtToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchAndUpdateUser: (currentToken?: string) => Promise<User | null>;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const STRAPI_API_URL = process.env.EXPO_PUBLIC_STRAPI_URL || 'https://6544-200-127-6-159.ngrok-free.app '; // Asegúrate que EXPO_PUBLIC_STRAPI_URL esté definida

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAndUpdateUser = useCallback(async (tokenToUse?: string): Promise<User | null> => {
    const currentToken = tokenToUse || token;
    if (!currentToken) {
      console.log('[AuthContext] fetchAndUpdateUser: No token.');
      return null;
    }
    console.log('[AuthContext] fetchAndUpdateUser: Attempting with token...');
    try {
      const populateQuery = 'populate[profilePicture]=*&populate[category]=*&populate[player_stat]=*&populate[teams][populate][team_stats]=*&populate[teams][populate][category]=*&populate[role]=*&populate[membership_plan]=*';
      
      const response = await fetch(
        `${STRAPI_API_URL}/api/users/me?${populateQuery}`,
        { headers: { Authorization: `Bearer ${currentToken}` } }
      );

      // --- INICIO DE MODIFICACIÓN PARA DEBUG ---
      const clonedResponse = response.clone(); // Clona la respuesta para leerla múltiples veces
      const responseText = await clonedResponse.text(); // Lee la respuesta como texto

      console.log('[AuthContext] /users/me Raw Response Status:', response.status);
      console.log('[AuthContext] /users/me Raw Response Text:', responseText); // ¡ESTO ES CLAVE! Aquí verás la "T"
      console.log('[AuthContext] /users/me Response Headers (Content-Type):', response.headers.get('Content-Type'));
      // --- FIN DE MODIFICACIÓN PARA DEBUG ---

      if (response.ok) {
        // Intenta parsear como JSON solo si la respuesta fue OK y es probable que sea JSON
        try {
          const fullUserDataFromApi = await response.json(); // Intenta parsear la respuesta original (no la clonada texto)

          if (fullUserDataFromApi && !fullUserDataFromApi.error) {
            const typedUser: User = fullUserDataFromApi; 
            await AsyncStorage.setItem('userData', JSON.stringify(typedUser));
            setUser(typedUser);
            console.log('[AuthContext] User data (from /users/me) fetched and updated:', typedUser.username);
            return typedUser;
          } else {
             console.error('[AuthContext] /users/me response invalid or contains error object:', fullUserDataFromApi);
             throw new Error(fullUserDataFromApi.error?.message || 'Invalid user data from server (/users/me)');
          }
        } catch (jsonError) {
          // Esto se ejecutará si response.ok fue true, PERO el cuerpo no era JSON válido.
          console.error('[AuthContext] JSON Parse Error (even with response.ok):', jsonError);
          console.error('[AuthContext] Problematic text that was not JSON (from response.ok block):', responseText);
          throw new Error('Failed to parse user data from server, even though response was OK.');
        }
      } else {
        // Si la respuesta no fue .ok, responseText ya contiene el cuerpo del error.
        console.error(`[AuthContext] Failed to fetch /users/me. Status: ${response.status}. Body: ${responseText}`);
        if (response.status === 401 || response.status === 403) {
          await signOutInternal(); // Desloguear si es un error de autorización
        }
        return null;
      }
    } catch (e: any) { // Captura cualquier otro error, incluyendo los que lanzamos arriba
      console.error('[AuthContext] Error in fetchAndUpdateUser catch block:', e.message);
      // Podrías decidir si cerrar sesión aquí basado en el tipo de error.
      // Por ejemplo, si e.message incluye "401" o "403" implícitamente.
      return null;
    }
  }, [token]); // Asegúrate que `token` sea la única dependencia necesaria o ajusta según tu lógica.

  const signOutInternal = async () => {
    try {
      setUser(null); setToken(null);
      await SecureStore.deleteItemAsync('jwtToken');
      await AsyncStorage.removeItem('userData');
      console.log('[AuthContext] Signed out and data cleared.');
    } catch (e) { console.error('[AuthContext] Sign out internal error:', e); }
  };


  useEffect(() => {
    const loadAuthData = async () => {
      console.log('[AuthContext] loadAuthData: Attempting...');
      try {
        const jwtToken = await SecureStore.getItemAsync('jwtToken');
        const userDataString = await AsyncStorage.getItem('userData');
        if (jwtToken) {
          setToken(jwtToken); // Es importante setear el token para fetchAndUpdateUser
          if (userDataString) {
            const userDataFromStorage: User = JSON.parse(userDataString);
            setUser(userDataFromStorage);
            console.log('[AuthContext] User data loaded from storage:', userDataFromStorage.username);
            // Refrescar datos en segundo plano
            fetchAndUpdateUser(jwtToken).catch(err => console.warn("[AuthContext] Background user update failed on load:", err));
          } else {
            console.log('[AuthContext] Token found but no user data in AsyncStorage, fetching from server...');
            await fetchAndUpdateUser(jwtToken);
          }
        } else {
          console.log('[AuthContext] No token found in storage.');
        }
      } catch (e) {
        console.error('[AuthContext] Failed to load auth data:', e);
        await signOutInternal(); // Limpiar si hay error
      } finally {
        setIsLoading(false);
      }
    };
    loadAuthData();
  }, [fetchAndUpdateUser]); // fetchAndUpdateUser ahora está en useCallback

  const signIn = async (strapiLoginResponseUser: any, jwtToken: string) => {
    try {
      // El objeto 'user' del login es básico. Lo guardamos y luego obtenemos el completo.
      const basicUserData: Partial<User> = { // Usar Partial<User> para el objeto básico
        id: strapiLoginResponseUser.id,
        username: strapiLoginResponseUser.username,
        email: strapiLoginResponseUser.email,
        confirmed: strapiLoginResponseUser.confirmed,
        blocked: strapiLoginResponseUser.blocked,
        createdAt: strapiLoginResponseUser.createdAt,
        updatedAt: strapiLoginResponseUser.updatedAt,
        name: strapiLoginResponseUser.name,
        // ...otros campos directos que devuelva /api/auth/local
      };
      
      await SecureStore.setItemAsync('jwtToken', jwtToken);
      await AsyncStorage.setItem('userData', JSON.stringify(basicUserData)); // Guarda el usuario básico
      
      setUser(basicUserData as User); // Hacemos un cast aquí, sabiendo que se completará
      setToken(jwtToken);
      console.log('[AuthContext] User signed in (basic data stored):', basicUserData.username);
      
      await fetchAndUpdateUser(jwtToken); // Obtener y actualizar con datos completamente populados
    } catch (e) {
      console.error('[AuthContext] Failed to sign in:', e);
      await signOutInternal();
      throw e;
    }
  };
  
  const publicSignOut = useCallback(async () => {
    return signOutInternal();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signOut: publicSignOut, fetchAndUpdateUser: () => fetchAndUpdateUser(token || '') }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};
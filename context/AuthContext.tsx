// context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// --- INTERFACES BASADAS EN TUS SCHEMAS Y EJEMPLO DE RESPUESTA ---

// Para el campo 'profilePicture' (Media)
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
  documentId?: string;
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
  documentId?: string;
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
  documentId?: string;
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

  profilePicture?: StrapiMedia | null;
  category?: Category | null;
  player_stat?: PlayerStat | null;
  teams?: Team[] | null;
  membership_plan?: MembershipPlan | null;
  role?: any;
}

// Interfaz para Team
export interface Team {
  id: number;
  documentId?: string;
  name: string;
  isActive?: boolean | null;
  currentRank?: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  users_permissions_users?: Partial<User>[];
  team_stats?: TeamStat | null;
  category?: Category | null;
}


// --- AuthContext ---
interface AuthContextData {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (strapiUserObjectFromLogin: any, jwtToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchAndUpdateUser: (currentToken?: string) => Promise<User | null>; // La firma se mantiene
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const STRAPI_API_URL = process.env.EXPO_PUBLIC_STRAPI_URL || 'https://a1f3-200-127-6-159.ngrok-free.app';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Esta es la función interna, correctamente memoizada.
  // Los consumidores del contexto llamarán a esta directamente.
  // Si se llama sin argumento, usará el 'token' del estado de AuthProvider.
  const fetchAndUpdateUser = useCallback(async (tokenToUse?: string): Promise<User | null> => {
    const currentToken = tokenToUse || token; // Usa el token del estado si tokenToUse no se provee
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

      const clonedResponse = response.clone();
      const responseText = await clonedResponse.text();

      console.log('[AuthContext] /users/me Raw Response Status:', response.status);
      console.log('[AuthContext] /users/me Raw Response Text:', responseText);
      console.log('[AuthContext] /users/me Response Headers (Content-Type):', response.headers.get('Content-Type'));

      if (response.ok) {
        try {
          const fullUserDataFromApi = await response.json();

          if (fullUserDataFromApi && !fullUserDataFromApi.error) {
            const typedUser: User = fullUserDataFromApi; 
            await AsyncStorage.setItem('userData', JSON.stringify(typedUser));
            setUser(typedUser); // Actualiza el estado del usuario
            console.log('[AuthContext] User data (from /users/me) fetched and updated:', typedUser.username);
            return typedUser;
          } else {
             console.error('[AuthContext] /users/me response invalid or contains error object:', fullUserDataFromApi);
             throw new Error(fullUserDataFromApi.error?.message || 'Invalid user data from server (/users/me)');
          }
        } catch (jsonError) {
          console.error('[AuthContext] JSON Parse Error (even with response.ok):', jsonError);
          console.error('[AuthContext] Problematic text that was not JSON (from response.ok block):', responseText);
          throw new Error('Failed to parse user data from server, even though response was OK.');
        }
      } else {
        console.error(`[AuthContext] Failed to fetch /users/me. Status: ${response.status}. Body: ${responseText}`);
        if (response.status === 401 || response.status === 403) {
          await signOutInternal();
        }
        return null;
      }
    } catch (e: any) {
      console.error('[AuthContext] Error in fetchAndUpdateUser catch block:', e.message);
      return null;
    }
  }, [token]); // Depende del 'token' del estado de AuthProvider
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
          setToken(jwtToken); // Establece el token para que fetchAndUpdateUser lo use si se llama sin argumento
          if (userDataString) {
            const userDataFromStorage: User = JSON.parse(userDataString);
            setUser(userDataFromStorage);
            console.log('[AuthContext] User data loaded from storage:', userDataFromStorage.username);
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
        await signOutInternal();
      } finally {
        setIsLoading(false);
      }
    };
    loadAuthData();
  }, [fetchAndUpdateUser]); // La dependencia aquí es correcta, se refiere a la función memoizada.

  const signIn = async (strapiLoginResponseUser: any, jwtToken: string) => {
    try {
      const basicUserData: Partial<User> = {
        id: strapiLoginResponseUser.id,
        username: strapiLoginResponseUser.username,
        email: strapiLoginResponseUser.email,
        confirmed: strapiLoginResponseUser.confirmed,
        blocked: strapiLoginResponseUser.blocked,
        createdAt: strapiLoginResponseUser.createdAt,
        updatedAt: strapiLoginResponseUser.updatedAt,
        name: strapiLoginResponseUser.name,
      };
      
      await SecureStore.setItemAsync('jwtToken', jwtToken);
      await AsyncStorage.setItem('userData', JSON.stringify(basicUserData));
      
      setUser(basicUserData as User);
      setToken(jwtToken); // Actualiza el token en el estado
      console.log('[AuthContext] User signed in (basic data stored):', basicUserData.username);
      
      // fetchAndUpdateUser usará el jwtToken que se acaba de setear en el estado,
      // o puedes pasarlo explícitamente: await fetchAndUpdateUser(jwtToken);
      await fetchAndUpdateUser(jwtToken); 
    } catch (e) {
      console.error('[AuthContext] Failed to sign in:', e);
      await signOutInternal();
      throw e;
    }
  };

  const publicSignOut = useCallback(async () => {
    return signOutInternal();
  }, []); // No tiene dependencias, signOutInternal no depende del scope de useCallback que cambie.

  return (
    <AuthContext.Provider value={{ 
        user, 
        token, 
        isLoading, 
        signIn, 
        signOut: publicSignOut, 
        fetchAndUpdateUser: fetchAndUpdateUser// <-- Se pasa la referencia directa de la función memoizada
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};
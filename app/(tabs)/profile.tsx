// app/(tabs)/profile.tsx
import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    ScrollView, Platform, ActivityIndicator, Image, Alert, RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { useAuth, User, Team } from '../../context/AuthContext'; // Importar Team si es necesario
import SponsorBottom from '@/components/elementos/SponsorBottom';

// --- Lógica de Categorías y Puntos (sin cambios) ---
const categoryPointThresholds: Record<string, { start: number; next: number }> = {
  '7ma': { start: 0, next: 500 }, '6ta': { start: 500, next: 1000 },
  '5ta': { start: 1000, next: 1500 }, '4ta': { start: 1500, next: 2000 },
  '3ra': { start: 2000, next: 2500 }, '2da': { start: 2500, next: 3000 },
  '1ra': { start: 3000, next: Infinity },
};

const getShortCategoryName = (fullCategoryName: string | undefined): string => {
  if (!fullCategoryName) return '';
  const match = fullCategoryName.match(/^(\d+[a-zªº]{1,2})/i);
  return match ? match[1].toLowerCase() : fullCategoryName.toLowerCase();
};

const getCurrentCategoryProgress = (userCatPoints: number | null | undefined, userCatName: string | undefined) => {
  if (userCatPoints === undefined || userCatPoints === null || !userCatName) {
    return { progress: 0, pointsToNext: 0, categoryDisplayName: userCatName || 'N/A', nextCategoryPoints: undefined };
  }
  const shortCategoryKey = getShortCategoryName(userCatName);
  const categoryInfo = categoryPointThresholds[shortCategoryKey];
  const categoryDisplayName = userCatName;

  if (!categoryInfo || categoryInfo.next === Infinity) {
    return { progress: 1, pointsToNext: 0, categoryDisplayName, nextCategoryPoints: Infinity };
  }
  const pointsNeededForCategory = categoryInfo.next - categoryInfo.start;
  if (pointsNeededForCategory <= 0) {
     return { progress: userCatPoints >= categoryInfo.next ? 1 : 0, pointsToNext: Math.max(0, categoryInfo.next - userCatPoints), categoryDisplayName, nextCategoryPoints: categoryInfo.next };
  }
  const pointsEarnedInCurrentCategory = userCatPoints - categoryInfo.start;
  const progress = Math.max(0, Math.min(pointsEarnedInCurrentCategory / pointsNeededForCategory, 1));
  const pointsToNext = Math.max(0, categoryInfo.next - userCatPoints);
  return { progress, pointsToNext, categoryDisplayName, nextCategoryPoints: categoryInfo.next };
};
// --- Fin de Lógica de Ejemplo ---

interface CircularProgressProps {
  size: number; strokeWidth: number; progressPercent: number;
  backgroundColor?: string; progressColor?: string; children?: React.ReactNode;
}
const CircularProgress: React.FC<CircularProgressProps> = ({
  size, strokeWidth, progressPercent,
  backgroundColor = "#e0e0e0", progressColor = "#0284c7", children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.max(0, Math.min(1, progressPercent || 0));
  const strokeDashoffset = circumference - circumference * clampedProgress;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle stroke={backgroundColor} fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <Circle
          stroke={progressColor} fill="none" cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </Svg>
      <View style={styles.childrenContainer}>{children}</View>
    </View>
  );
};


const ProfileScreen = () => {
  const router = useRouter();
  const { user, isLoading: authIsLoading, fetchAndUpdateUser, signOut } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      if (fetchAndUpdateUser) {
        console.log("[ProfileScreen] Screen focused, calling fetchAndUpdateUser if needed.");
        // Podrías añadir una condición aquí para no llamar si user ya está completo
        // if (!user || !user.player_stat || !user.category) {
        fetchAndUpdateUser().catch(err => {
            if (isActive) {
                console.error("[ProfileScreen] Error in fetchAndUpdateUser on focus:", err.message);
            }
        });
        // }
      }
      return () => {
        isActive = false;
      };
    }, [fetchAndUpdateUser]) // Depender solo de fetchAndUpdateUser
  );

  const onRefresh = useCallback(async () => {
    if (fetchAndUpdateUser) {
      setIsRefreshing(true);
      try {
        await fetchAndUpdateUser();
      } catch (error) {
        console.error("Error during refresh:", error)
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [fetchAndUpdateUser]);

  const handleLogout = async () => {
    try { await signOut(); router.replace('/Auth/WelcomeScreen'); }
    catch (e) { console.error("Logout error:", e); Alert.alert("Error", "No se pudo cerrar sesión."); }
  };

  // 1. Pantalla de carga si AuthContext está cargando y no hay objeto user aún
  if (authIsLoading && !user && !isRefreshing) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0284c7" />
      </SafeAreaView>
    );
  }

  // 2. Si no hay usuario (después de que AuthContext haya terminado de cargar)
  if (!user) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
        <Text style={styles.infoLabel}>No hay sesión activa.</Text>
        <TouchableOpacity onPress={() => router.replace('/Auth/LoginScreen')} style={styles.editButton}>
            <Text style={styles.editButtonText}>Ir a Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 3. NUEVO CHEQUEO: Si el objeto 'user' existe, pero le faltan datos detallados
  //    (por ejemplo, player_stat o category, que son poblados por fetchAndUpdateUser)
  //    Esto es común justo después del login/registro inicial.
  if (!user.player_stat || !user.category) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={{ color: 'white', marginTop: 10, fontSize: 16 }}>Cargando detalles del perfil...</Text>
      </SafeAreaView>
    );
  }

  // Si hemos pasado todos los chequeos, 'user' y sus datos detallados están disponibles
  const displayName = user.name || user.username || 'Usuario';
  const displayEmail = user.email || 'No disponible';
  
  // Ahora es más seguro acceder a user.player_stat y user.category
  const userCategoryPoints = user.player_stat.categoryPoints;
  const userCategoryNameFromContext = user.category.name;
  
  let profilePictureUrl = null;
  if (user.profilePicture?.url) {
    const strapiBaseUrl = process.env.EXPO_PUBLIC_STRAPI_URL || 'https://04dc-200-127-6-159.ngrok-free.app';
    profilePictureUrl = `${strapiBaseUrl}${user.profilePicture.url}`;
  }

  const { progress, pointsToNext, categoryDisplayName, nextCategoryPoints } = 
    getCurrentCategoryProgress(userCategoryPoints, userCategoryNameFromContext);

  const userTeamsUnique = user.teams 
    ? user.teams.reduce((acc, currentTeam) => {
        const key = currentTeam.documentId || String(currentTeam.id);
        if (!acc.some(item => (item.documentId || String(item.id)) === key)) {
          acc.push(currentTeam);
        }
        return acc;
      }, [] as Team[])
    : [];
    
  const userTeamsDisplay = userTeamsUnique.length > 0
    ? userTeamsUnique.map(team => team.name || `Equipo ${team.id}`).join(', ')
    : 'Sin equipos asignados';

  const avatarSize = 100;
  const progressStrokeWidth = 8;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#0284c7"]} tintColor={"#0284c7"} />
        }
      >
        <View style={styles.profileHeader}>
          <CircularProgress
            size={avatarSize + progressStrokeWidth * 2.5}
            strokeWidth={progressStrokeWidth}
            progressPercent={progress}
            progressColor="#facc15" // Amarillo para el progreso
            backgroundColor="rgba(229, 231, 235, 0.5)" // Un gris claro semitransparente para el fondo
          >
            {profilePictureUrl ? (
              <Image source={{ uri: profilePictureUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </CircularProgress>

          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{displayEmail}</Text>
          {categoryDisplayName !== 'Sin Categoría' && nextCategoryPoints !== undefined && nextCategoryPoints !== Infinity && pointsToNext >= 0 && (
             <Text style={styles.pointsToNextText}>
               {pointsToNext} pts para {nextCategoryPoints} pts (Sgte. Cat.)
             </Text>
          )}
        </View>

        <View style={styles.infoSection}>
          <InfoRow label="Equipos" value={userTeamsDisplay} />
          <InfoRow label="Categoría Actual" value={categoryDisplayName} />
          <InfoRow label="Puntos Ranking" value={userCategoryPoints !== undefined && userCategoryPoints !== null ? String(userCategoryPoints) : 'N/A'} />
          <InfoRow label="Partidos Jugados" value={String(user.player_stat.totalMatches || 0)} />
          <InfoRow label="Partidos Ganados" value={String(user.player_stat.wins || 0)} />
          <InfoRow label="Partidos Perdidos" value={String(user.player_stat.losses || 0)} />
          <InfoRow label="Miembro Desde" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES') : 'N/A'} />
        </View>

        <TouchableOpacity style={styles.editButton} onPress={() => router.push('/profile/edit' as any)}>
          <Text style={styles.editButtonText}>Editar Perfil</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
          <SponsorBottom
            imageHeight={35}
            imageWidth={110}
            backgroundColor="rgba(10,20,70,0.7)"
            borderColor="#FFD700" 
            title="Con el Apoyo de"
          />
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ label, value }: { label: string, value: string | number | undefined}) => (
  <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value !== undefined ? value : 'N/A'}</Text> 
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1,  backgroundColor: '#142986', }, // Fondo azul oscuro para el SafeAreaView
  loadingContainer: { 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'transparent', // O el mismo que safeArea si se prefiere
    flex: 1 
  },
  container: { flex: 1 }, // El ScrollView tomará el espacio
  profileHeader: {
    backgroundColor: 'rgba(0,0,0,0.3)', 
    paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center',
    marginBottom: 16,
    // No necesita border radius si no hay un color de fondo que lo requiera visualmente contra el safeArea
  },
  childrenContainer: { // Contenedor para el texto/imagen dentro del CircularProgress
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarPlaceholder: { 
    backgroundColor: '#0284c7', // Azul más vibrante para el placeholder
    justifyContent: 'center', alignItems: 'center' 
    // El tamaño y borderRadius se aplican dinámicamente en el JSX
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 }, // Asegúrate que el tamaño coincida con 'avatarSize'
  avatarText: { color: 'white', fontSize: 48, fontWeight: 'bold' },
  userName: {
    fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginTop: 16, 
    textShadowColor: 'rgba(0, 0, 0, 0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  userEmail: {
    fontSize: 15, color: '#E5E5E5', marginBottom: 4, // Un gris claro para el email
    textShadowColor: 'rgba(0, 0, 0, 0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  pointsToNextText: {
    fontSize: 13, color: '#F0F0F0', fontStyle: 'italic', marginTop: 6, // Un gris más claro para este texto informativo
    textShadowColor: 'rgba(0, 0, 0, 0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  infoSection: {
    backgroundColor: 'rgba(255,255,255,0.9)', // Fondo blanco semitransparente para la sección de información
    borderRadius: 10, marginHorizontal: 16, marginBottom: 16, overflow: 'hidden', // Importante para que el borderBottom no exceda el borderRadius
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(220, 220, 220, 0.7)', // Un color de borde más sutil
  },
  infoLabel: { fontSize: 16, color: '#4B5563' }, // Gris oscuro para las etiquetas
  infoValue: { fontSize: 16, color: '#1F2937', fontWeight: '600' }, // Negro/gris muy oscuro para los valores
  editButton: { 
    backgroundColor: '#0284c7', // Azul principal para el botón de editar
    paddingVertical: 14, borderRadius: 8, marginHorizontal: 16, marginBottom: 12, 
    alignItems: 'center', elevation: 2 
  }, 
  editButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  logoutButton: { 
    backgroundColor: '#DC2626', // Rojo para el botón de cerrar sesión
    paddingVertical: 14, borderRadius: 8, marginHorizontal: 16, marginBottom: 24, 
    alignItems: 'center', elevation: 2 
  }, 
  logoutButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default ProfileScreen;
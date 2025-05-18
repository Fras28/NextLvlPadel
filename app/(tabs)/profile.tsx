// app/(tabs)/profile.tsx
import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    ScrollView, Platform, ActivityIndicator, Image, Alert, RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext'; // Ajusta la ruta

// --- Lógica de Categorías y Puntos ---
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

interface CircularProgressProps { /* ... (sin cambios) ... */
  size: number; strokeWidth: number; progressPercent: number;
  backgroundColor?: string; progressColor?: string; children?: React.ReactNode;
}
const CircularProgress: React.FC<CircularProgressProps> = ({ /* ... */
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
  const { user, signOut, isLoading: authIsLoading, fetchAndUpdateUser } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user && fetchAndUpdateUser) { // Solo llama si ya hay un usuario para evitar llamadas mientras se carga inicialmente
        // console.log("[ProfileScreen] Screen focused, calling fetchAndUpdateUser.");
        fetchAndUpdateUser().catch(err => console.error("Error in fetchAndUpdateUser on focus:", err));
      }
    }, [fetchAndUpdateUser, user?.id]) // Depender del user.id para rehacer el callback si el usuario cambia
  );

  const onRefresh = useCallback(async () => {
    if (fetchAndUpdateUser) {
      setIsRefreshing(true);
      await fetchAndUpdateUser();
      setIsRefreshing(false);
    }
  }, [fetchAndUpdateUser]);

  const handleLogout = async () => {
    try { await signOut(); router.replace('/Auth/WelcomeScreen'); }
    catch (e) { console.error("Logout error:", e); Alert.alert("Error", "No se pudo cerrar sesión."); }
  };

  // Acceso a datos DIRECTO desde el objeto 'user' populado
  const displayName = user?.name || user?.username || 'Usuario';
  const displayEmail = user?.email || 'No disponible';
  
  // Acceder a los campos de las relaciones que ahora son objetos directos en 'user'
  const userCategoryPoints = user?.player_stat?.categoryPoints;
  const userCategoryNameFromContext = user?.category?.name; // Asume que 'user.category' es el objeto Category completo
  
  let profilePictureUrl = null;
  if (user?.profilePicture?.url) { // Acceso directo a la URL de la imagen de perfil
    const strapiBaseUrl = process.env.EXPO_PUBLIC_STRAPI_URL || 'https://6544-200-127-6-159.ngrok-free.app '; // Reemplaza localhost si es necesario
    profilePictureUrl = `${strapiBaseUrl}${user.profilePicture.url}`;
  }

  const { progress, pointsToNext, categoryDisplayName, nextCategoryPoints } = 
    getCurrentCategoryProgress(userCategoryPoints, userCategoryNameFromContext);

  const avatarSize = 100;
  const progressStrokeWidth = 8;

  if (authIsLoading && !user) { // Mostrar loader solo si el usuario aún no se ha cargado en absoluto desde AsyncStorage
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0284c7" />
      </SafeAreaView>
    );
  }
  if (!user) { // Si después de cargar, no hay usuario (ej. token inválido y signOut fue llamado)
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
        <Text style={styles.infoLabel}>No hay sesión activa.</Text>
        <TouchableOpacity onPress={() => router.replace('/Auth/LoginScreen')} style={styles.editButton}>
            <Text style={styles.editButtonText}>Ir a Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Si llegamos aquí, 'user' no es null
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
            progressColor="#facc15"
            backgroundColor="rgba(229, 231, 235, 0.5)"
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
          <InfoRow label="Categoría Actual" value={categoryDisplayName} />
          <InfoRow label="Puntos Ranking" value={userCategoryPoints !== undefined && userCategoryPoints !== null ? String(userCategoryPoints) : 'N/A'} />
          {/* Acceso directo a los campos de player_stat */}
          <InfoRow label="Partidos Jugados" value={String(user.player_stat?.totalMatches || 0)} />
          <InfoRow label="Partidos Ganados" value={String(user.player_stat?.wins || 0)} />
          <InfoRow label="Partidos Perdidos" value={String(user.player_stat?.losses || 0)} />
          <InfoRow label="Miembro Desde" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES') : 'N/A'} />
        </View>

        <TouchableOpacity style={styles.editButton} onPress={() => router.push('/profile/edit' as any)}>
          <Text style={styles.editButtonText}>Editar Perfil</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ label, value }: { label: string, value: string | number }) => (
  <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>
);

const styles = StyleSheet.create({ /* ... (Tus estilos actuales se mantienen) ... */
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', flex: 1 },
  container: { flex: 1 },
  profileHeader: {
    backgroundColor: 'rgba(0,0,0,0.3)', 
    paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center',
    marginBottom: 16,
  },
  childrenContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarPlaceholder: { backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 100 },
  avatarText: { color: 'white', fontSize: 48, fontWeight: 'bold' },
  userName: {
    fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginTop: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  userEmail: {
    fontSize: 15, color: '#E5E5E5', marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  pointsToNextText: {
    fontSize: 13, color: '#F0F0F0', fontStyle: 'italic', marginTop: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  infoSection: {
    backgroundColor: 'rgba(255,255,255,0.9)', 
    borderRadius: 10, marginHorizontal: 16, marginBottom: 16, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(220, 220, 220, 0.7)', 
  },
  infoLabel: { fontSize: 16, color: '#4B5563' },
  infoValue: { fontSize: 16, color: '#1F2937', fontWeight: '600' },
  editButton: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 8, marginHorizontal: 16, marginBottom: 12, alignItems: 'center', elevation: 2 },
  editButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#DC2626', paddingVertical: 14, borderRadius: 8, marginHorizontal: 16, marginBottom: 24, alignItems: 'center', elevation: 2 },
  logoutButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default ProfileScreen;
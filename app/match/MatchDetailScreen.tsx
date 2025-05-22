// app/MatchDetailScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  ActivityIndicator, TouchableOpacity, Platform
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router'; // Import useNavigation
import { useAuth } from '@/context/AuthContext'; // Ajusta la ruta si es necesario
import { MaterialIcons } from '@expo/vector-icons';

const STRAPI_API_URL = process.env.EXPO_PUBLIC_STRAPI_URL || 'https://3c1c-200-127-6-159.ngrok-free.app';

// --- Interfaces Corregidas basadas en tu API Log ---
interface LoggedStrapiUser {
  id: number;
  documentId?: string;
  username?: string;
}

interface LoggedStrapiPopulatedRelation {
  id: number;
  documentId?: string;
  name: string;
  users_permissions_users?: LoggedStrapiUser[];
  level?: number;
  description?: string;
  isActive?: boolean;
  currentRank?: number;
}

interface LoggedStrapiSet {
  id: number;
  team1Score: number;
  team2Score: number;
  setNumber?: number;
}

interface MatchDataFromApi {
  id: number;
  documentId: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  playedDate?: string | null;
  estado?: 'Pending' | 'Scheduled' | 'Played' | 'Canceled' | 'Disputed';
  confirmationTeam1?: boolean;
  confirmationTeam2?: boolean;
  resultTeam1Confirmed?: string | null;
  resultTeam2Confirmed?: string | null;
  scheduledDate?: string | null;
  complex?: string;
  team_1?: LoggedStrapiPopulatedRelation;
  team_2?: LoggedStrapiPopulatedRelation;
  category?: LoggedStrapiPopulatedRelation;
  winner?: LoggedStrapiPopulatedRelation | null;
  sets?: LoggedStrapiSet[];
  loser?: LoggedStrapiPopulatedRelation | null;
}

interface FilteredMatchesApiResponse {
  data: MatchDataFromApi[];
  meta: {
    pagination: { page: number; pageSize: number; pageCount: number; total: number; }
  };
}

const PALETTE = {
  primaryBlue: '#142986',
  cardBackground: '#FFFFFF',
  textDark: '#1F2937',
  textMedium: '#374151',
  textLight: '#6B7280',
  winGreen: '#16A34A',
  lossRed: '#EF4444',
  pendingOrange: '#F59E0B',
  scheduledBlue: '#2563EB',
  canceledGray: '#6B7280',
};

const MatchDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { matchId } = params; // Este es el documentId
  const { token } = useAuth();
  const navigation = useNavigation(); // Para setear el título dinámicamente

  const [matchDetails, setMatchDetails] = useState<MatchDataFromApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { // Efecto para actualizar el título cuando matchDetails cambie
    if (matchDetails) {
      const team1Name = matchDetails.team_1?.name || 'Eq1';
      const team2Name = matchDetails.team_2?.name || 'Eq2';
      navigation.setOptions({ title: `Detalle: ${team1Name} vs ${team2Name}` });
    } else {
      navigation.setOptions({ title: 'Detalles del Partido' });
    }
  }, [matchDetails, navigation]);


  const fetchMatchDetailsFromAPI = useCallback(async () => {
    if (!matchId || typeof matchId !== 'string') {
      setError("ID del partido inválido."); setIsLoading(false); return;
    }
    if (!token) {
      setError("Autenticación requerida."); setIsLoading(false); return;
    }

    setIsLoading(true); setError(null);
    try {
      const populateQueryParts = [
        'populate[team_1][populate][users_permissions_users][fields][0]=id',
        'populate[team_1][populate][users_permissions_users][fields][1]=username',
        'populate[team_2][populate][users_permissions_users][fields][0]=id',
        'populate[team_2][populate][users_permissions_users][fields][1]=username',
        'populate[category][fields][0]=name',
        'populate[winner][fields][0]=name',
        'populate[team_1][fields][0]=name',
        'populate[team_2][fields][0]=name',
        'populate[sets]=*',
        'populate[loser][fields][0]=name'
      ];
      const populateQuery = populateQueryParts.join('&');
      const apiUrl = `${STRAPI_API_URL}/api/matches?filters[documentId][$eq]=${matchId}&${populateQuery}`;

      console.log(`[MatchDetailScreen] Fetching URL: ${apiUrl}`);
      const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const responseBodyText = await response.text();

      if (!response.ok) {
        let errData;
        try { errData = JSON.parse(responseBodyText); }
        catch(e) { throw new Error(`Error en la respuesta (status ${response.status}): ${responseBodyText.substring(0,100)}`); }
        console.error("[MatchDetailScreen] API Error Data:", errData);
        throw new Error(errData.error?.message || `No se pudo cargar el partido (${response.status})`);
      }
      
      const result: FilteredMatchesApiResponse = JSON.parse(responseBodyText);
      
      if (Array.isArray(result.data) && result.data.length > 0) {
        setMatchDetails(result.data[0]);
      } else {
        throw new Error(`Partido con documentId "${matchId}" no encontrado o respuesta inesperada.`);
      }

    } catch (e: any) {
      setError(e.message);
      console.error("[MatchDetailScreen] Error fetching match details:", e);
    } finally {
      setIsLoading(false);
    }
  }, [matchId, token]);

  useEffect(() => {
    fetchMatchDetailsFromAPI();
  }, [fetchMatchDetailsFromAPI]);

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'Played': return { color: PALETTE.winGreen, fontWeight: 'bold' as 'bold' };
      case 'Scheduled': return { color: PALETTE.scheduledBlue, fontWeight: 'bold' as 'bold' };
      case 'Pending': return { color: PALETTE.pendingOrange, fontWeight: 'bold' as 'bold' };
      case 'Canceled': return { color: PALETTE.canceledGray, fontStyle: 'italic' as 'italic' };
      case 'Disputed': return { color: PALETTE.lossRed, fontWeight: 'bold' as 'bold' };
      default: return { color: PALETTE.textMedium };
    }
  };

  const renderPlayers = (teamData?: LoggedStrapiPopulatedRelation) => {
    if (!teamData?.users_permissions_users || teamData.users_permissions_users.length === 0) {
      return <Text style={styles.playerText}>- Jugadores no especificados</Text>;
    }
    return teamData.users_permissions_users.map(player => (
      <Text key={player.id} style={styles.playerText}>
        - {player.username || `Jugador ID: ${player.id}`}
      </Text>
    ));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {/* <Stack.Screen options={{ title: 'Cargando Partido...' }} /> NO SE PUEDE USAR STACK.SCREEN AQUÍ DIRECTAMENTE */}
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={PALETTE.primaryBlue} /><Text style={styles.loadingText}>Cargando Detalles...</Text></View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {/* <Stack.Screen options={{ title: 'Error' }} /> */}
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={PALETTE.lossRed} />
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity onPress={() => fetchMatchDetailsFromAPI()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={[styles.retryButton, {backgroundColor: PALETTE.textLight, marginTop: 10}]}>
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!matchDetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
       {/* <Stack.Screen options={{ title: 'No Encontrado' }} /> */}
        <View style={styles.errorContainer}><Text style={styles.errorText}>No se encontraron detalles del partido.</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.retryButton, {backgroundColor: PALETTE.textLight, marginTop: 10}]}>
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const attr = matchDetails;
  const team1 = attr.team_1;
  const team2 = attr.team_2;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* El título se setea con navigation.setOptions en el useEffect */}
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Información del Partido</Text>

          <View style={styles.teamHeader}>
            <View style={styles.teamNameContainer}>
              <Text style={styles.teamName}>{team1?.name || 'Equipo 1'}</Text>
              {renderPlayers(team1)}
            </View>
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.teamNameContainer}>
              <Text style={styles.teamName}>{team2?.name || 'Equipo 2'}</Text>
              {renderPlayers(team2)}
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Categoría:</Text>
            <Text style={styles.detailValue}>{attr.category?.name || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estado:</Text>
            <Text style={[styles.detailValue, getStatusStyle(attr.estado)]}>{attr.estado || 'N/A'}</Text>
          </View>
          {attr.scheduledDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fecha Programada:</Text>
              <Text style={styles.detailValue}>{new Date(attr.scheduledDate).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })} hs</Text>
            </View>
          )}
          {attr.playedDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fecha Jugado:</Text>
              <Text style={styles.detailValue}>{new Date(attr.playedDate).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })} hs</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Complejo:</Text>
            <Text style={styles.detailValue}>{attr.complex || 'No especificado'}</Text>
          </View>
        </View>

        {attr.estado === 'Played' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Resultado</Text>
            {attr.winner && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ganador:</Text>
                <Text style={[styles.detailValue, {color: PALETTE.winGreen, fontWeight:'bold'}]}>{attr.winner.name}</Text>
              </View>
            )}
             {attr.loser && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Perdedor:</Text>
                <Text style={[styles.detailValue, {color: PALETTE.lossRed}]}>{attr.loser.name}</Text>
              </View>
            )}
            {attr.sets && attr.sets.length > 0 && (
              <>
                <Text style={styles.subHeader}>Sets:</Text>
                {attr.sets.map((set, index) => (
                  <Text key={set.id || index} style={styles.setText}>
                    Set {index + 1}: {set.team1Score} - {set.team2Score}
                  </Text>
                ))}
              </>
            )}
             <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Resultado Equipo 1:</Text>
                <Text style={styles.detailValue}>{attr.resultTeam1Confirmed || (attr.confirmationTeam1 ? '(Confirmado s/score)' : '(Pendiente)')}</Text>
            </View>
            <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Resultado Equipo 2:</Text>
                <Text style={styles.detailValue}>{attr.resultTeam2Confirmed || (attr.confirmationTeam2 ? '(Confirmado s/score)' : '(Pendiente)')}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({ /* ... (Mismos estilos que antes) ... */
  safeArea: { flex: 1, backgroundColor: '#f0f4f8', },
  container: { flex: 1, padding: 16, },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', },
  loadingText: { marginTop: 10, fontSize: 16, color: PALETTE.textMedium, },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
  errorText: { fontSize: 17, color: PALETTE.lossRed, textAlign: 'center', marginBottom: 20, },
  retryButton: { backgroundColor: PALETTE.primaryBlue, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8, elevation: 2, },
  retryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', },
  card: { backgroundColor: PALETTE.cardBackground, borderRadius: 10, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: PALETTE.textDark, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingBottom: 8, },
  teamHeader: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', marginBottom: 16, },
  teamNameContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
  teamName: { fontSize: 18, fontWeight: 'bold', color: PALETTE.primaryBlue, marginBottom: 4, textAlign: 'center' },
  playerText: { fontSize: 13, color: PALETTE.textMedium, textAlign: 'center' },
  vsText: { fontSize: 16, fontWeight: 'bold', color: PALETTE.textLight, marginHorizontal: 10, alignSelf: 'center', },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems:'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', minHeight: 40 },
  detailLabel: { fontSize: 15, color: PALETTE.textLight, fontWeight: '500', },
  detailValue: { fontSize: 15, color: PALETTE.textMedium, fontWeight: '500', flexShrink: 1, textAlign: 'right', paddingLeft: 8 },
  subHeader: { fontSize: 16, fontWeight: '600', color: PALETTE.textDark, marginTop: 12, marginBottom: 8, },
  setText: { fontSize: 15, color: PALETTE.textMedium, paddingLeft: 10, marginBottom: 4, },
});

export default MatchDetailScreen;
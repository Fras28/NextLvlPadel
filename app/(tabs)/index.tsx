// app/(tabs)/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  Platform, TouchableOpacity, ActivityIndicator, RefreshControl, ViewStyle, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth, User } from '../../context/AuthContext';

// --- INTERFACES ---
interface UpcomingMatch {
  id: string;
  documentId: string;
  team1Name?: string; // NUEVO
  team1Id?: number;   // NUEVO
  team2Name?: string; // NUEVO
  team2Id?: number;   // NUEVO
  scheduledDateFull: string;
  displayDate: string;
  complex: string;
  status: 'Por confirmar' | 'Confirmado' | 'Jugado';
  categoryName?: string;
  isUserParticipant?: boolean; // Se mantiene para lógica de botones de acción
}

interface PastMatch {
  id: string;
  documentId: string;
  team1Name?: string; // NUEVO
  team1Id?: number;   // NUEVO
  team2Name?: string; // NUEVO
  team2Id?: number;   // NUEVO
  scheduledDateFull: string;
  playedOrScheduledDate: string;
  displayDate: string;
  complex: string;
  resultText?: string; // Se mostrará de forma neutral
  winningTeamId?: number | null; // NUEVO: para saber quién ganó neutralmente
  categoryName?: string;
  sets?: { team1Score: number; team2Score: number }[];
  estado?: 'Pending' | 'Scheduled' | 'Played' | 'Canceled' | 'Disputed';
  isUserParticipant?: boolean; // Se mantiene para lógica de botones de acción
}

interface PopulatedTeam {
  id: number;
  documentId?: string;
  name?: string;
}

interface PopulatedCategory {
  id: number;
  documentId?: string;
  name?: string;
}

interface StrapiSetData {
    id: number;
    team1Score: number;
    team2Score: number;
}

interface StrapiMatch {
  id: number;
  documentId: string;
  playedDate?: string;
  estado?: 'Pending' | 'Scheduled' | 'Played' | 'Canceled' | 'Disputed';
  scheduledDate?: string;
  complex?: string;
  category?: PopulatedCategory | null;
  team_1?: PopulatedTeam | null;
  team_2?: PopulatedTeam | null;
  sets?: StrapiSetData[] | null;
  winner?: PopulatedTeam | null; // Asumimos que winner/loser son PopulatedTeam
  loser?: PopulatedTeam | null;
  // ...otros campos directos del schema de Match
}

const STRAPI_API_URL = process.env.EXPO_PUBLIC_STRAPI_URL || 'https://a1f3-200-127-6-159.ngrok-free.app';

const DashboardScreen = () => {
  const router = useRouter();
  const { user, token, isLoading: authIsLoading } = useAuth();

  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [pastMatches, setPastMatches] = useState<PastMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = useCallback(async () => {
    // ... (lógica inicial de autenticación y carga sin cambios) ...
    if (authIsLoading) {
        console.log("[DashboardScreen] Auth context is loading, waiting...");
        return;
    }
    if (!token || !user?.id) {
      setError("Usuario no autenticado o datos de usuario incompletos.");
      setIsLoadingMatches(false);
      setRefreshing(false);
      setUpcomingMatches([]);
      setPastMatches([]);
      return;
    }

    console.log("[DashboardScreen] Attempting to fetch ALL matches. User ID (for display logic on actions):", user.id);
    setIsLoadingMatches(true);
    setError(null);

    try {
      const userTeamIds = user.teams?.map(team => team.id).filter(id => typeof id === 'number') || [];
      console.log("[DashboardScreen] User Team IDs (for display purposes on actions):", userTeamIds);

      const allMatchesQuery = `/api/matches?populate=*`;
      console.log("[DashboardScreen] Fetching All Matches Query:", STRAPI_API_URL + allMatchesQuery);
      const response = await fetch(`${STRAPI_API_URL}${allMatchesQuery}`, { headers: { Authorization: `Bearer ${token}` } });
      
      if (!response.ok) { /* ... manejo de error ... */ 
        const errorBody = await response.text();
        console.error(`[DashboardScreen] Error ${response.status} Body All Matches:`, errorBody);
        let detailedErrorMessage = `Error al obtener todos los partidos: ${response.status}`;
        try {
            const parsedError = JSON.parse(errorBody);
            if (parsedError.error && parsedError.error.message) {
                detailedErrorMessage = `Error del servidor: ${parsedError.error.message} (Estado: ${parsedError.error.status || response.status})`;
            } else {
                 detailedErrorMessage += ` - ${errorBody.substring(0, 200)}`;
            }
        } catch (e) {
            detailedErrorMessage += ` - ${errorBody.substring(0, 200)}`;
        }
        throw new Error(detailedErrorMessage);
      }
      
      const result: { data: StrapiMatch[] | null } = await response.json();
      const allFetchedMatches = result.data || [];
      console.log(`[DashboardScreen] Fetched ${allFetchedMatches.length} matches in total.`);

      const localUpcomingMatches: UpcomingMatch[] = [];
      const localPastMatches: PastMatch[] = [];

      allFetchedMatches.forEach(match => {
        if (!match.documentId || !match.estado) { 
            console.warn(`[DashboardScreen] Match with numeric ID ${match.id} (docId: ${match.documentId}) is missing documentId or estado. Skipping. Estado: ${match.estado}`);
            return;
        }
        const estado = match.estado;

        const team1Data = match.team_1;
        const team2Data = match.team_2;
        const team1Name = team1Data?.name || 'Equipo 1 (TBC)';
        const team1Id = team1Data?.id;
        const team2Name = team2Data?.name || 'Equipo 2 (TBC)';
        const team2Id = team2Data?.id;

        const isUserInMatch = (team1Id !== undefined && userTeamIds.includes(team1Id)) ||
                              (team2Id !== undefined && userTeamIds.includes(team2Id));
        
        const categoryName = match.category?.name || 'N/A';
        const complex = match.complex || 'Complejo TBC';
        const scheduledDateFull = match.scheduledDate || new Date(0).toISOString();

        if (estado === 'Pending' || estado === 'Scheduled') {
          let displayDate = 'Fecha TBC';
          if (match.scheduledDate) {
              const schedDate = new Date(match.scheduledDate);
              displayDate = `${schedDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}, ${schedDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs`;
          }
          let statusText: UpcomingMatch['status'] = 'Por confirmar';
          if (match.estado === 'Scheduled') statusText = 'Confirmado';
          
          localUpcomingMatches.push({
            id: String(match.id),
            documentId: match.documentId,
            team1Name: team1Name,
            team1Id: team1Id,
            team2Name: team2Name,
            team2Id: team2Id,
            scheduledDateFull: scheduledDateFull,
            displayDate: displayDate,
            complex: complex,
            status: statusText,
            categoryName: categoryName,
            isUserParticipant: isUserInMatch,
          });
        } else if (estado === 'Played' || estado === 'Canceled' || estado === 'Disputed') {
          const playedOrScheduledDate = match.playedDate || scheduledDateFull;
          let displayDate = 'Fecha Jugado TBC';
          const dateToUseForDisplay = match.playedDate || match.scheduledDate;
          if (dateToUseForDisplay) {
              const d = new Date(dateToUseForDisplay);
              displayDate = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
          }

          const winningTeamId = match.winner?.id || null;
          let neutralResultText = '';

          if (match.estado === 'Played') {
              if (winningTeamId) {
                  const winnerName = winningTeamId === team1Id ? team1Name : (winningTeamId === team2Id ? team2Name : 'Desconocido');
                  neutralResultText = `Ganador: ${winnerName}`;
              } else {
                  neutralResultText = 'Resultado pendiente';
              }
          } else if (match.estado === 'Canceled') {
              neutralResultText = 'Partido Cancelado';
          } else if (match.estado === 'Disputed') {
              neutralResultText = 'Resultado en Disputa';
          }
          
          if (match.estado === 'Played' && match.sets && match.sets.length > 0) {
              const setScores = match.sets.map(s => `${s.team1Score}-${s.team2Score}`).join(', '); // Sets neutrales
              neutralResultText = neutralResultText ? `${neutralResultText} (${setScores})` : `Sets: ${setScores}`;
          }

          localPastMatches.push({
            id: String(match.id),
            documentId: match.documentId,
            team1Name: team1Name,
            team1Id: team1Id,
            team2Name: team2Name,
            team2Id: team2Id,
            scheduledDateFull: scheduledDateFull,
            playedOrScheduledDate: playedOrScheduledDate,
            displayDate: displayDate,
            complex: complex,
            resultText: neutralResultText.trim(),
            winningTeamId: winningTeamId,
            categoryName: categoryName,
            sets: match.sets?.map(s => ({ team1Score: s.team1Score, team2Score: s.team2Score })) || [],
            estado: match.estado,
            isUserParticipant: isUserInMatch,
          });
        }
      });

      localUpcomingMatches.sort((a, b) => new Date(a.scheduledDateFull).getTime() - new Date(b.scheduledDateFull).getTime());
      localPastMatches.sort((a, b) => new Date(b.playedOrScheduledDate).getTime() - new Date(a.playedOrScheduledDate).getTime());

      setUpcomingMatches(localUpcomingMatches);
      setPastMatches(localPastMatches);

    } catch (e: any) { /* ... manejo de error ... */ 
        console.error("[DashboardScreen] Error en fetchMatches catch:", e.message);
        setError(e.message || "No se pudieron cargar los partidos.");
    } finally {
      setIsLoadingMatches(false);
      setRefreshing(false);
    }
  }, [token, user, authIsLoading]);

  useEffect(() => { /* ... */ 
    if (!authIsLoading) {
      fetchMatches();
    } else {
      setIsLoadingMatches(true); 
    }
  }, [authIsLoading, token, user, fetchMatches]);

  const onRefresh = useCallback(() => { /* ... */ 
    console.log("[DashboardScreen] Refreshing...");
    setRefreshing(true);
    fetchMatches();
  }, [fetchMatches]);

  const navigateToCoordinateScreen = (matchDocumentId: string) => { /* ... */ 
    router.push({ pathname: '/CoordinateMatchScreen', params: { matchId: matchDocumentId } });
  };
  const navigateToRecordResultScreen = (matchDocumentId: string) => { /* ... */ 
    router.push({ pathname: '/RecordResultScreen', params: { matchId: matchDocumentId } });
  };
  const navigateToMatchDetailScreen = (matchDocumentId: string) => { /* ... */ 
    console.log("Navegar a detalle de partido con documentId:", matchDocumentId);
    Alert.alert("Navegación", `Detalle de partido (${matchDocumentId}) aún no implementado.`);
  };

  // getCardStyle ya no se basa en userOutcome. Lo eliminamos o lo hacemos neutral.
  // Por simplicidad, lo eliminaremos y las tarjetas no tendrán borde de color específico de resultado.
  // const getCardStyle = (outcome?: PastMatch['userOutcome']): ViewStyle | null => { ... }

  // ... (Lógica de carga y error sin cambios) ...
  if (authIsLoading || (isLoadingMatches && upcomingMatches.length === 0 && pastMatches.length === 0 && !error && !refreshing)) {
    return ( /* ... loading UI ... */ 
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.loadingContainerFull}>
                <ActivityIndicator size="large" color="white" />
                <Text style={styles.loadingTextFull}>Cargando Dashboard...</Text>
            </View>
        </SafeAreaView>
    );
  }
  
  if (error && !refreshing) {
    return ( /* ... error UI ... */ 
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.loadingContainerFull}>
                <MaterialIcons name="error-outline" size={48} color="#ffdddd" style={{marginBottom:10}}/>
                <Text style={styles.errorTextFull}>{error}</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Intentar de Nuevo</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{paddingBottom: 20}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FFF"]} tintColor={"#FFF"} />}
      >
        {/* Sección Próximos Partidos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximos Partidos</Text>
          {isLoadingMatches && upcomingMatches.length === 0 && !refreshing ? (
            <ActivityIndicator color="white" style={{marginTop: 20, marginBottom: 20}}/>
          ) : upcomingMatches.length > 0 ? upcomingMatches.map((match) => (
            <TouchableOpacity key={match.documentId} onPress={() => navigateToMatchDetailScreen(match.documentId)} style={styles.matchCard}>
              {/* Mostrar Team1 vs Team2 */}
              <Text style={styles.matchTeams} numberOfLines={1} ellipsizeMode="tail">
                {match.team1Name} vs {match.team2Name}
              </Text>
              <Text style={styles.matchDetail}>Fecha: {match.displayDate}</Text>
              <Text style={styles.matchDetail}>Lugar: {match.complex}</Text>
              {match.categoryName && match.categoryName !== 'N/A' && <Text style={styles.matchDetail}>Categoría: {match.categoryName}</Text>}
              <View style={styles.statusContainer}>
                <Text style={[
                  styles.matchDetail, 
                  styles.statusText,
                  match.status === 'Confirmado' ? styles.statusConfirmed : styles.statusPending
                ]}>
                  Estado: {match.status}
                </Text>
                {match.status === 'Por confirmar' && match.isUserParticipant && ( // Botón Coordinar sigue siendo específico del usuario
                  <TouchableOpacity 
                    style={styles.actionButtonSmall}
                    onPress={(e) => { e.stopPropagation(); navigateToCoordinateScreen(match.documentId); }}
                  >
                    <Text style={styles.actionButtonTextSmall}>Coordinar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )) : ( /* ... empty state ... */ 
            !isLoadingMatches && !refreshing &&
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyText}>No hay próximos partidos programados en el sistema.</Text>
            </View>
          )}
        </View>

        {/* Sección Partidos Anteriores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partidos Anteriores</Text>
           {isLoadingMatches && pastMatches.length === 0 && !refreshing ? (
            <ActivityIndicator color="white" style={{marginTop: 20, marginBottom:20}} />
          ) : pastMatches.length > 0 ? pastMatches.map((match) => (
            // Se elimina getCardStyle de aquí, o se modifica para no usar userOutcome
            <TouchableOpacity 
              key={match.documentId} 
              onPress={() => navigateToMatchDetailScreen(match.documentId)} 
              style={[styles.matchCard, match.estado === 'Canceled' ? styles.matchCardCanceled : null]} // Ejemplo de estilo neutral
            >
              <View style={styles.cardHeader}>
                 {/* Mostrar Team1 vs Team2 */}
                <Text style={styles.matchTeams} numberOfLines={1} ellipsizeMode="tail">
                  {match.team1Name} vs {match.team2Name}
                </Text>
                {/* Iconos neutrales o basados en estado general del partido */}
                {match.estado === 'Played' && match.winningTeamId && <MaterialIcons name="emoji-events" size={22} color="#f59e0b" />}
                {match.estado === 'Canceled' && <MaterialIcons name="cancel" size={20} color="#6b7280" />}
              </View>
              <Text style={styles.matchDetail}>Fecha: {match.displayDate}</Text>
              {match.categoryName && match.categoryName !== 'N/A' &&<Text style={styles.matchDetail}>Categoría: {match.categoryName}</Text>}
              
              {/* Botón Registrar Resultado sigue siendo específico del usuario si está pendiente y él participa */}
              {match.estado && 
               (match.estado === 'Played' && !match.winningTeamId && !match.resultText?.includes("Ganador")) && // Si se jugó pero no hay ganador claro en el texto (pendiente de registrar)
               match.isUserParticipant ? (
                <TouchableOpacity 
                  style={styles.recordResultButtonSmall}
                  onPress={(e) => { e.stopPropagation(); navigateToRecordResultScreen(match.documentId); }}
                >
                  <Text style={styles.recordResultButtonTextSmall}>Registrar Resultado</Text>
                </TouchableOpacity>
              ) : (
                match.resultText && ( // Mostrar el resultText neutral
                    <Text style={styles.matchDetail}>
                       {match.resultText}
                    </Text>
                )
              )}
              <Text style={styles.matchDetail}>Lugar: {match.complex}</Text>
            </TouchableOpacity>
          )) : ( /* ... empty state ... */ 
            !isLoadingMatches && !refreshing &&
             <View style={styles.emptyStateCard}>
              <Text style={styles.emptyText}>No se han encontrado partidos anteriores en el sistema.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... (otros estilos)
  matchTeams: { // Nuevo estilo para los nombres de los equipos
    fontSize: 18,
    fontWeight: '600',
    color: '#0369a1',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    marginBottom: 8, // Espacio antes de los detalles
  },
  matchCardCanceled: { // Ejemplo de estilo para partidos cancelados
    borderColor: '#6b7280', // Un gris
    backgroundColor: '#f3f4f6', // Un fondo gris muy claro
  },
  // Mantén los demás estilos como estaban, eliminando matchCardWon, matchCardLost, matchCardPending
  // y resultWinText, resultLossText si ya no se usan o se adaptan a un contexto neutral.
  safeArea: {
    flex: 1,
    backgroundColor: '#142986',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 20 : 16,
  },
  loadingContainerFull: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#142986', 
  },
  loadingTextFull: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  errorTextFull: {
    color: '#ffdddd', 
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 17,
    paddingHorizontal: 10, 
    lineHeight: 24, 
  },
  retryButton: {
    backgroundColor: '#0ea5e9', 
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' 
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22, 
    fontWeight: 'bold',
    color: 'white', 
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium', 
  },
  matchCard: {
    backgroundColor: 'white', 
    borderRadius: 10, 
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 6, 
    elevation: 4, 
    borderLeftWidth: 5, 
    borderColor: 'transparent', // Borde por defecto neutral
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // marginBottom: 8, // Eliminado para que matchTeams controle su espacio
  },
  matchDetail: {
    fontSize: 15, 
    color: '#374151', 
    marginBottom: 5, 
    lineHeight: 22, 
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10, 
  },
  statusText: {
    marginBottom: 0, 
    flexShrink: 1, 
    fontSize: 14,
  },
  statusConfirmed: {
    color: '#059669', 
    fontWeight: 'bold',
  },
  statusPending: {
    color: '#d97706', 
    fontWeight: 'bold',
  },
  actionButtonSmall: {
    backgroundColor: '#0ea5e9', 
    paddingVertical: 7, 
    paddingHorizontal: 12, 
    borderRadius: 6, 
    marginLeft: 10, 
  },
  actionButtonTextSmall: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500', 
  },
  recordResultButtonSmall: {
    marginTop: 10,
    marginBottom: 6, 
    backgroundColor: '#f59e0b', 
    paddingVertical: 9, 
    paddingHorizontal: 14, 
    borderRadius: 6,
    alignSelf: 'flex-start', 
  },
  recordResultButtonTextSmall: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600', 
  },
  emptyStateCard: { 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    borderRadius: 8,
    paddingVertical: 25, 
    paddingHorizontal: 20, 
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100, 
    borderStyle: 'dashed', 
    borderColor: 'rgba(255,255,255,0.6)', 
    borderWidth: 1.5,
  },
  emptyText: { 
    fontSize: 16,
    color: '#1f2937', 
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    lineHeight: 23,
  }
});

export default DashboardScreen;
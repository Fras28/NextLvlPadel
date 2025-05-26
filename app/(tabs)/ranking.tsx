// app/(tabs)/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  Platform, TouchableOpacity, ActivityIndicator, RefreshControl, ViewStyle, Alert,
  TextStyle
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth, User } from '../../context/AuthContext'; // Ajusta la ruta si es necesario

// --- INTERFACES ---
interface UpcomingMatch {
  id: string; // Numeric Strapi ID, stringified
  documentId: string; // The ID used for fetching match details and navigation
  team1Name?: string;
  team1Id?: number;
  team2Name?: string;
  team2Id?: number;
  scheduledDateFull: string;
  displayDate: string;
  complex: string;
  status: 'Por confirmar' | 'Confirmado'; // UI display status based on team confirmations (from original file [3])
  categoryName?: string;
  isUserParticipant?: boolean;
  team1Confirmed?: boolean;
  team2Confirmed?: boolean;
  strapiEstado?: 'Pending' | 'Scheduled' | 'Played' | 'Canceled' | 'Disputed'; // Actual backend estado
}

interface PastMatch {
  id: string; // Numeric Strapi ID, stringified
  documentId: string; // The ID used for fetching match details and navigation
  team1Name?: string;
  team1Id?: number;
  team2Name?: string;
  team2Id?: number;
  scheduledDateFull: string;
  playedOrScheduledDate: string;
  displayDate: string;
  complex: string;
  resultText?: string;
  winningTeamId?: number | null;
  categoryName?: string;
  sets?: { team1Score: number; team2Score: number }[];
  estado?: 'Pending' | 'Scheduled' | 'Played' | 'Canceled' | 'Disputed';
  isUserParticipant?: boolean;
}

interface DashboardPopulatedTeam {
  id: number;
  documentId?: string;
  name: string;
}

interface DashboardPopulatedCategory {
  id: number;
  documentId?: string;
  name: string;
}

interface StrapiSetData {
    id: number;
    team1Score: number;
    team2Score: number;
}

interface StrapiMatchDashboard {
  id: number;
  documentId: string;
  playedDate?: string | null;
  estado?: 'Pending' | 'Scheduled' | 'Played' | 'Canceled' | 'Disputed';
  scheduledDate?: string | null;
  complex?: string;
  category?: DashboardPopulatedCategory | null;
  team_1?: DashboardPopulatedTeam | null;
  team_2?: DashboardPopulatedTeam | null;
  sets?: StrapiSetData[] | null;
  winner?: DashboardPopulatedTeam | null;
  loser?: DashboardPopulatedTeam | null;
  confirmationTeam1?: boolean;
  confirmationTeam2?: boolean;
  team_1_confirmed?: boolean;
  team_2_confirmed?: boolean;
}

// From your CoordinateMatchScreen.tsx (file [5]), assumed to be more current.
// PLEASE VERIFY AND USE YOUR CURRENT ACTIVE NGROK URL HERE.
const STRAPI_API_URL = process.env.EXPO_PUBLIC_STRAPI_URL || 'https://1775-200-127-6-159.ngrok-free.app';

const PALETTE = {
  primaryBlue: '#142986',
  cardBackground: '#FFFFFF',
  textDark: '#1F2937',
  textMedium: '#374151',
  textLight: '#6B7280',
  statusPendingBlue: '#2563EB',
  statusPendingBg: '#DBEAFE',
  statusConfirmedGreen: '#059669',
  statusConfirmedBg: '#D1FAE5',
  actionButtonBlue: '#2563EB',
  actionButtonOrange: '#F59E0B',
  winGreen: '#16A34A',
  lossRed: '#EF4444',
  neutralOrange: '#F97316',
  canceledGray: '#6B7280',
  iconYellow: '#F59E0B',
  iconGray: '#6B7280',
  iconOrange: '#F97316',
  textConfirmed: '#059669',
  textAwaitingConfirmation: '#F59E0B',
};

const DashboardScreen = () => {
  const router = useRouter();
  const { user, token, isLoading: authIsLoading } = useAuth();

  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([]);
  const [pastMatches, setPastMatches] = useState<PastMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMatches = useCallback(async () => {
    if (authIsLoading) return;
    if (!token || !user?.id) {
      setError("Usuario no autenticado.");
      setIsLoadingMatches(false); setRefreshing(false);
      setUpcomingMatches([]); setPastMatches([]);
      return;
    }

    setIsLoadingMatches(true); setError(null);
    const userTeamIds = user.teams?.map(team => team.id).filter(id => typeof id === 'number') || [];

    try {
      const response = await fetch(`${STRAPI_API_URL}/api/matches?populate=*`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `Failed to fetch matches (${response.status})`);
      }
      const result: { data: StrapiMatchDashboard[] | null; meta: any } = await response.json();
      const allFetchedMatches = result.data || [];

      const localUpcomingMatches: UpcomingMatch[] = [];
      const localPastMatches: PastMatch[] = [];

      allFetchedMatches.forEach(strapiMatch => {
        if (!strapiMatch.documentId || !strapiMatch.estado) {
            console.warn(`[DashboardScreen] Partido (ID numérico Strapi: ${strapiMatch.id}, DocumentID: ${strapiMatch.documentId}) no tiene documentId válido o estado. Saltando.`);
            return;
        }

        const team1Data = strapiMatch.team_1;
        const team2Data = strapiMatch.team_2;
        const team1Id = team1Data?.id;
        const team2Id = team2Data?.id;

        const isUserParticipant = (team1Id !== undefined && userTeamIds.includes(team1Id)) ||
                                  (team2Id !== undefined && userTeamIds.includes(team2Id));
        
        if (!isUserParticipant) {
          return; 
        }
        
        const commonMatchData = {
          id: String(strapiMatch.id), 
          documentId: strapiMatch.documentId, 
          team1Name: team1Data?.name || 'Equipo 1 (TBC)',
          team1Id: team1Id,
          team2Name: team2Data?.name || 'Equipo 2 (TBC)',
          team2Id: team2Id,
          scheduledDateFull: strapiMatch.scheduledDate || new Date(0).toISOString(),
          complex: strapiMatch.complex || 'Complejo TBC',
          categoryName: strapiMatch.category?.name || 'N/A',
          isUserParticipant: isUserParticipant,
        };

        if (strapiMatch.estado === 'Pending' || strapiMatch.estado === 'Scheduled') {
          let displayDate = 'Fecha TBC';
          if (strapiMatch.scheduledDate) {
            const schedDate = new Date(strapiMatch.scheduledDate);
            displayDate = `${schedDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}, ${schedDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs`;
          }

          const team1Confirmed = strapiMatch.confirmationTeam1 ?? strapiMatch.team_1_confirmed ?? false;
          const team2Confirmed = strapiMatch.confirmationTeam2 ?? strapiMatch.team_2_confirmed ?? false;
          
          // Original logic for UI display status (from file [3])
          const overallStatus: 'Confirmado' | 'Por confirmar' = (team1Confirmed && team2Confirmed) ? 'Confirmado' : 'Por confirmar';

          localUpcomingMatches.push({
            ...commonMatchData,
            displayDate: displayDate,
            status: overallStatus, // Used for "Coordinar" button and badge default
            team1Confirmed: team1Confirmed,
            team2Confirmed: team2Confirmed,
            strapiEstado: strapiMatch.estado, // Store actual backend state for "Registrar Resultado"
          });
        } else if (['Played', 'Canceled', 'Disputed'].includes(strapiMatch.estado)) {
          const playedOrScheduledDate = strapiMatch.playedDate || commonMatchData.scheduledDateFull;
          let displayDate = 'Fecha Jugado TBC';
          const dateToUse = strapiMatch.playedDate || strapiMatch.scheduledDate;
          if (dateToUse) {
            displayDate = new Date(dateToUse).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
          }

          let resultTextCalc = '';
          const setScores = (strapiMatch.sets && strapiMatch.sets.length > 0)
              ? strapiMatch.sets.map(s => `${s.team1Score}-${s.team2Score}`).join(', ')
              : '';
          const winningTeamId = strapiMatch.winner?.id || null;

          if (strapiMatch.estado === 'Played') {
            if (winningTeamId && userTeamIds.includes(winningTeamId)) resultTextCalc = `Ganaste ${setScores}`.trim();
            else if (winningTeamId) resultTextCalc = `Perdiste ${setScores}`.trim();
            else resultTextCalc = `Resultado pendiente ${setScores}`.trim();
          } else if (strapiMatch.estado === 'Canceled') resultTextCalc = 'Partido Cancelado';
          else if (strapiMatch.estado === 'Disputed') resultTextCalc = 'Resultado en Disputa';

          localPastMatches.push({
            ...commonMatchData,
            playedOrScheduledDate: playedOrScheduledDate,
            displayDate: displayDate,
            resultText: resultTextCalc,
            winningTeamId: winningTeamId,
            sets: strapiMatch.sets?.map(s => ({ team1Score: s.team1Score, team2Score: s.team2Score })) || [],
            estado: strapiMatch.estado,
          });
        }
      });

      localUpcomingMatches.sort((a, b) => new Date(a.scheduledDateFull).getTime() - new Date(b.scheduledDateFull).getTime());
      localPastMatches.sort((a, b) => new Date(b.playedOrScheduledDate).getTime() - new Date(a.playedOrScheduledDate).getTime());

      setUpcomingMatches(localUpcomingMatches);
      setPastMatches(localPastMatches);

    } catch (e: any) {
      console.error("[DashboardScreen] Error fetching matches:", e);
      setError(e.message || "No se pudieron cargar los partidos.");
    } finally {
      setIsLoadingMatches(false); setRefreshing(false);
    }
  }, [token, user, authIsLoading]);

  useEffect(() => {
    if (!authIsLoading && token && user?.teams) {
      fetchMatches();
    } else if (!authIsLoading && (!token || !user)) {
      setError("Usuario no autenticado.");
      setIsLoadingMatches(false);
    } else if (!authIsLoading && user && !user.teams) {
        console.warn("[DashboardScreen] User data loaded, but user.teams is missing. Matches might not filter correctly.");
        fetchMatches(); 
    }
  }, [authIsLoading, token, user, fetchMatches]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMatches();
  }, [fetchMatches]);

  // Navigation functions consistently use documentId for the 'matchId' param
  const navigateToCoordinateScreen = (matchDocId: string) => {
    router.push({ pathname: '../match/CoordinateMatchScreen', params: { matchId: matchDocId } });
  };
  const navigateToRecordResultScreen = (matchDocId: string) => { // Takes documentId
    router.push({ pathname: '../match/RecordResultScreen', params: { matchId: matchDocId } });
  };
  const navigateToMatchDetailScreen = (matchDocId: string) => {
    router.push({ pathname: '../match/MatchDetailScreen', params: { matchId: matchDocId } });
  };

  // Styles functions are from your original file [3]
  const getUpcomingMatchCardStyles = (match: UpcomingMatch): ViewStyle[] => { 
    const cardStyles: ViewStyle[] = [styles.matchCardBase];
    // Use strapiEstado for border if 'Scheduled', otherwise fallback to team confirmation status
    if (match.strapiEstado === 'Scheduled') {
        cardStyles.push(styles.matchCardBorderConfirmed);
    } else if (match.status === 'Por confirmar') { 
      cardStyles.push(styles.matchCardBorderPending);
    } else { // match.status === 'Confirmado' (by teams) but strapiEstado is not 'Scheduled' yet
      cardStyles.push(styles.matchCardBorderConfirmed); // Or styles.matchCardBorderPending if preferred
    }
    return cardStyles;
  };

  const getPastMatchCardStyles = (match: PastMatch): ViewStyle[] => { 
    const cardStyles: ViewStyle[] = [styles.matchCardBase];
    const userTeamIds = user?.teams?.map(team => team.id).filter(id => typeof id === 'number') || [];

    if (match.estado === 'Played') {
      if (match.winningTeamId && userTeamIds.includes(match.winningTeamId)) {
        cardStyles.push(styles.matchCardBorderWin); 
      } else if (match.winningTeamId) { 
        cardStyles.push(styles.matchCardBorderLoss); 
      } else { 
        cardStyles.push(styles.matchCardBorderPlayedPending);
      }
    } else if (match.estado === 'Canceled') {
      cardStyles.push(styles.matchCardBorderCanceled);
    } else if (match.estado === 'Disputed') {
      cardStyles.push(styles.matchCardBorderDisputed);
    }
    return cardStyles;
  };
  
  const renderResultText = (match: PastMatch): React.ReactNode => { 
    if (!match.resultText) return null;
    let prefix = match.resultText;
    let scores = "";
    let prefixStyle: TextStyle = styles.resultTextDefault;

    const scoreRegex = /\d+-\d+(,\s*\d+-\d+)*$/;
    const scoreMatch = match.resultText.match(scoreRegex);
    if (scoreMatch) {
        scores = ` ${scoreMatch[0]}`;
        prefix = match.resultText.replace(scoreRegex, '').trim();
    }
    
    if (prefix.startsWith("Ganaste")) {
      prefixStyle = styles.resultTextWin;
    } else if (prefix.startsWith("Perdiste")) {
      prefixStyle = styles.resultTextLoss;
    }
    return (
      <Text style={styles.matchDetailText}>
        <Text style={prefixStyle}>{prefix}</Text>
        {scores && <Text style={styles.resultTextScoresPart}>{scores}</Text>}
      </Text>
    );
  };

  if (authIsLoading || (isLoadingMatches && !refreshing && upcomingMatches.length === 0 && pastMatches.length === 0 && !error)) {
    return ( 
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.loadingContainerFull}>
                <ActivityIndicator size="large" color={PALETTE.cardBackground} />
                <Text style={styles.loadingTextFull}>Cargando Partidos...</Text>
            </View>
        </SafeAreaView>
    );
  }
  
  if (error && !refreshing) {
    return ( 
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.loadingContainerFull}>
                <MaterialIcons name="error-outline" size={48} color="#ffdddd" style={{marginBottom:10}}/>
                <Text style={styles.errorTextFull}>{error}</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Reintentar</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PALETTE.cardBackground]} tintColor={PALETTE.cardBackground} />}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximos Partidos</Text>
          {isLoadingMatches && upcomingMatches.length === 0 && refreshing ? (
            <ActivityIndicator color={PALETTE.cardBackground} style={{marginTop: 20, marginBottom: 20}}/>
          ) : upcomingMatches.length > 0 ? upcomingMatches.map((match) => {
            const userTeamIds = user?.teams?.map(team => team.id).filter(id => typeof id === 'number') || [];
            let showCoordinateButton = false;
            
            // "Coordinar" button logic from your original file [3]
            if (match.status === 'Por confirmar') { 
                const userInTeam1 = match.team1Id !== undefined && userTeamIds.includes(match.team1Id);
                const userInTeam2 = match.team2Id !== undefined && userTeamIds.includes(match.team2Id);

                if (userInTeam1 && !match.team1Confirmed) {
                    showCoordinateButton = true;
                } else if (userInTeam2 && !match.team2Confirmed) {
                    showCoordinateButton = true;
                }
            }
            
            // "Registrar Resultado" button logic (uses match.strapiEstado from backend)
            const showRecordResultButton = match.strapiEstado === 'Scheduled';
            
            return (
            <TouchableOpacity 
                key={match.documentId} 
                onPress={() => navigateToMatchDetailScreen(match.documentId)} 
                style={getUpcomingMatchCardStyles(match)}
            >
              <Text style={styles.matchTeamsText} numberOfLines={1} ellipsizeMode="tail">
                {match.team1Name} vs {match.team2Name}
              </Text>
              <View style={styles.matchDetailItem}><Text style={styles.matchDetailLabel}>Fecha: </Text><Text style={styles.matchDetailValue}>{match.displayDate}</Text></View>
              <View style={styles.matchDetailItem}><Text style={styles.matchDetailLabel}>Lugar: </Text><Text style={styles.matchDetailValue}>{match.complex}</Text></View>
              {match.categoryName && match.categoryName !== 'N/A' && <View style={styles.matchDetailItem}><Text style={styles.matchDetailLabel}>Categoría: </Text><Text style={styles.matchDetailValue}>{match.categoryName}</Text></View>}
              
              <View style={styles.teamConfirmationContainer}>
                <View style={styles.teamConfirmStatus}>
                    <Text style={styles.matchDetailLabelSmall} numberOfLines={1} ellipsizeMode="tail">{match.team1Name}: </Text>
                    <Text style={[styles.matchDetailValueSmall, match.team1Confirmed ? styles.textConfirmed : styles.textAwaitingConfirmation]}>
                        {match.team1Confirmed ? 'Confirmó' : 'Falta Confirmar'}
                    </Text>
                </View>
                <View style={styles.teamConfirmStatus}>
                    <Text style={styles.matchDetailLabelSmall} numberOfLines={1} ellipsizeMode="tail">{match.team2Name}: </Text>
                    <Text style={[styles.matchDetailValueSmall, match.team2Confirmed ? styles.textConfirmed : styles.textAwaitingConfirmation]}>
                        {match.team2Confirmed ? 'Confirmó' : 'Falta Confirmar'}
                    </Text>
                </View>
              </View>

              <View style={styles.statusActionContainer}>
                <View style={[
                    styles.statusBadge, 
                    match.strapiEstado === 'Scheduled' ? styles.statusBadgeConfirmed : 
                    (match.status === 'Confirmado' ? styles.statusBadgeConfirmed : styles.statusBadgePending)
                  ]}
                >
                  <Text style={[
                      styles.statusBadgeText, 
                      match.strapiEstado === 'Scheduled' ? styles.statusBadgeTextConfirmed :
                      (match.status === 'Confirmado' ? styles.statusBadgeTextConfirmed : styles.statusBadgeTextPending)
                    ]}
                  >
                    {match.strapiEstado === 'Scheduled' ? 'Programado' : match.status}
                  </Text>
                </View>
                
                {/* Action Buttons: Only one should appear for upcoming matches */}
                {showCoordinateButton && (
                  <TouchableOpacity 
                    style={[styles.actionButtonBase, styles.actionButtonCoordinate]} 
                    onPress={(e) => { e.stopPropagation(); navigateToCoordinateScreen(match.documentId); }}
                  >
                    <Text style={styles.actionButtonText}>Coordinar</Text>
                  </TouchableOpacity>
                )}

                {/* showRecordResultButton should ideally be mutually exclusive with showCoordinateButton 
                    if (team1Confirmed && team2Confirmed) implies strapiEstado will become 'Scheduled'
                */}
                {showRecordResultButton && !showCoordinateButton && ( // Ensure they don't overlap if logic allows (shouldn't)
                  <TouchableOpacity 
                    style={[styles.actionButtonBase, styles.actionButtonRecordResult]} 
                    onPress={(e) => { 
                        e.stopPropagation(); 
                        navigateToRecordResultScreen(match.documentId); // Pass documentId
                    }}
                  >
                    <Text style={styles.actionButtonText}>Registrar Resultado</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
            );
          }) : ( 
            !refreshing && <View style={styles.emptyStateCard}><Text style={styles.emptyText}>No tienes próximos partidos.</Text></View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partidos Anteriores</Text>
           {isLoadingMatches && pastMatches.length === 0 && refreshing ? (
            <ActivityIndicator color={PALETTE.cardBackground} style={{marginTop: 20, marginBottom:20}} />
          ) : pastMatches.length > 0 ? pastMatches.map((match) => {
            const userTeamIds = user?.teams?.map(team => team.id).filter(id => typeof id === 'number') || [];
            let iconName: keyof typeof MaterialIcons.glyphMap | null = null;
            let iconColor = PALETTE.textMedium;

            if (match.estado === 'Played') { 
                if (match.winningTeamId && userTeamIds.includes(match.winningTeamId)) { iconName = 'emoji-events'; iconColor = PALETTE.iconYellow; }
                else if (match.winningTeamId) { iconName = 'sentiment-very-dissatisfied'; iconColor = PALETTE.lossRed; }
                else { iconName = 'hourglass-empty'; iconColor = PALETTE.iconOrange; }
            } else if (match.estado === 'Canceled') { iconName = 'cancel'; iconColor = PALETTE.iconGray;
            } else if (match.estado === 'Disputed') { iconName = 'report-problem'; iconColor = PALETTE.iconOrange; }

            return (
            <TouchableOpacity 
              key={match.documentId} 
              onPress={() => navigateToMatchDetailScreen(match.documentId)} 
              style={getPastMatchCardStyles(match)}
            >
              <View style={styles.matchCardHeader}>
                <Text style={styles.matchTeamsText} numberOfLines={1} ellipsizeMode="tail">{match.team1Name} vs {match.team2Name}</Text>
                {iconName && <MaterialIcons name={iconName} size={24} color={iconColor} />}
              </View>
              <View style={styles.matchDetailItem}><Text style={styles.matchDetailLabel}>Fecha: </Text><Text style={styles.matchDetailValue}>{match.displayDate}</Text></View>
              {match.categoryName && match.categoryName !== 'N/A' &&<View style={styles.matchDetailItem}><Text style={styles.matchDetailLabel}>Categoría: </Text><Text style={styles.matchDetailValue}>{match.categoryName}</Text></View>}
              {match.resultText && (<View style={styles.matchDetailItem}><Text style={styles.matchDetailLabel}>Resultado: </Text>{renderResultText(match)}</View>)}
              <View style={styles.matchDetailItem}><Text style={styles.matchDetailLabel}>Lugar: </Text><Text style={styles.matchDetailValue}>{match.complex}</Text></View>
              
              {match.estado === 'Played' && !match.winningTeamId && ( 
                <TouchableOpacity 
                    style={[styles.actionButtonBase, styles.actionButtonRecordResult, {marginTop: 10}]} 
                    onPress={(e) => { e.stopPropagation(); navigateToRecordResultScreen(match.documentId); }} // Pass documentId
                >
                  <Text style={styles.actionButtonText}>Registrar Resultado</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            );
          }) : ( 
            !refreshing && <View style={styles.emptyStateCard}><Text style={styles.emptyText}>No has jugado partidos anteriormente.</Text></View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles from your original file [3]
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PALETTE.primaryBlue },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 20 : 16 },
  loadingContainerFull: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: PALETTE.primaryBlue, },
  loadingTextFull: { color: PALETTE.cardBackground, marginTop: 10, fontSize: 16 },
  errorTextFull: { color: '#ffdddd', textAlign: 'center', marginBottom: 20, fontSize: 17, paddingHorizontal: 10, lineHeight: 24, },
  retryButton: { backgroundColor: PALETTE.actionButtonBlue, paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, elevation: 2, },
  retryButtonText: { color: PALETTE.cardBackground, fontSize: 16, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: PALETTE.cardBackground, marginBottom: 16, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium', },
  matchCardBase: { backgroundColor: PALETTE.cardBackground, borderRadius: 8, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 5, elevation: 3, borderLeftWidth: 5, borderColor: 'transparent', },
  matchCardBorderPending: { borderColor: PALETTE.statusPendingBlue },
  matchCardBorderConfirmed: { borderColor: PALETTE.statusConfirmedGreen },
  matchCardBorderWin: { borderColor: PALETTE.winGreen },
  matchCardBorderLoss: { borderColor: PALETTE.lossRed },
  matchCardBorderPlayedPending: { borderColor: PALETTE.actionButtonOrange },
  matchCardBorderCanceled: { borderColor: PALETTE.canceledGray },
  matchCardBorderDisputed: { borderColor: PALETTE.neutralOrange },
  matchCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  matchTeamsText: { fontSize: 17, fontWeight: 'bold', color: PALETTE.textDark, flexShrink: 1, marginRight: 8, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-bold', },
  matchDetailItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  matchDetailLabel: { fontSize: 14, color: PALETTE.textLight, fontWeight: '500', marginRight: 4, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium', },
  matchDetailValue: { fontSize: 14, color: PALETTE.textMedium, flexShrink: 1, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', },
  matchDetailText: { fontSize: 14, color: PALETTE.textMedium, flexShrink: 1, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', },
  statusActionContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, },
  statusBadge: { borderRadius: 16, paddingVertical: 5, paddingHorizontal: 12, alignSelf: 'flex-start', marginRight: 'auto' /* Pushes buttons to the right if space-between */ },
  statusBadgePending: { backgroundColor: PALETTE.statusPendingBg },
  statusBadgeConfirmed: { backgroundColor: PALETTE.statusConfirmedBg },
  statusBadgeText: { fontSize: 13, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-semibold', },
  statusBadgeTextPending: { color: PALETTE.statusPendingBlue },
  statusBadgeTextConfirmed: { color: PALETTE.statusConfirmedGreen },
  actionButtonBase: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 1, },
  actionButtonCoordinate: { backgroundColor: PALETTE.actionButtonBlue, marginLeft: 8 /* Add some space if badge is also present */ },
  actionButtonRecordResult: { backgroundColor: PALETTE.actionButtonOrange, marginLeft: 8 /* Add some space if badge is also present */},
  actionButtonText: { color: PALETTE.cardBackground, fontSize: 13, fontWeight: '600', textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-semibold', },
  resultTextWin: { color: PALETTE.winGreen, fontWeight: 'bold' },
  resultTextLoss: { color: PALETTE.lossRed, fontWeight: 'bold' },
  resultTextDefault: { color: PALETTE.textMedium, fontWeight: 'normal'},
  resultTextScoresPart: { color: PALETTE.textLight, fontWeight: 'normal' },
  emptyStateCard: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, paddingVertical: 25, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', minHeight: 100, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.6)', borderWidth: 1.5, },
  emptyText: { fontSize: 16, color: PALETTE.textDark, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', lineHeight: 23, },
  teamConfirmationContainer: { 
    marginTop: 8, 
    marginBottom: 4,
  },
  teamConfirmStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3, 
    flexShrink: 1,
  },
  matchDetailLabelSmall: { 
    fontSize: 13, 
    color: PALETTE.textLight, 
    fontWeight: '500', 
    marginRight: 4,
    flexShrink: 1, 
  },
  matchDetailValueSmall: { 
    fontSize: 13, 
    color: PALETTE.textMedium,
    fontWeight: '600',
  },
  textConfirmed: {
    color: PALETTE.textConfirmed,
  },
  textAwaitingConfirmation: {
    color: PALETTE.textAwaitingConfirmation, 
  },
});
export default DashboardScreen;
// app/match/MatchDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Tipos para los datos del partido
interface Player {
  id: string;
  name: string;
}

interface Team {
  id: string;
  player1: Player;
  player2?: Player;
  name?: string;
}

type MatchStatus =
  | 'Por Jugar'
  | 'Por Confirmar Sede/Hora'
  | 'Confirmado'
  | 'Jugado - Resultado Pendiente'
  | 'Jugado - Resultado A Cargado'
  | 'Jugado - Resultado B Cargado'
  | 'Finalizado';

interface MatchResult {
  teamAScore: string;
  teamBScore: string;
  winner?: 'teamA' | 'teamB';
}

interface MatchDetails {
  id: string;
  teamA: Team;
  teamB: Team;
  date?: string;
  time?: string;
  complex?: string;
  status: MatchStatus;
  result?: MatchResult;
  category?: string;
  notes?: string;
}

// Datos de ejemplo MOCK
const allMatchesData: MatchDetails[] = [
  {
    id: '1',
    teamA: { id: 't1', player1: { id: 'p1', name: 'Jugador A1' }, player2: { id: 'p2', name: 'Jugador A2' }, name: 'Pareja Alfa (Usuario)' }, // Asumiendo que el usuario es parte de Pareja Alfa
    teamB: { id: 't2', player1: { id: 'p3', name: 'Jugador B1' }, player2: { id: 'p4', name: 'Jugador B2' }, name: 'Pareja Beta' },
    date: '20 Mayo, 2025',
    time: '19:00hs',
    complex: 'Complejo A',
    status: 'Por Confirmar Sede/Hora',
    category: '3ra Categoría',
  },
  {
    id: '2',
    teamA: { id: 't3', player1: { id: 'p5', name: 'Jugador C1' }, player2: { id: 'p6', name: 'Jugador C2' }, name: 'Pareja Gamma (Usuario)' },
    teamB: { id: 't4', player1: { id: 'p7', name: 'Jugador D1' }, player2: { id: 'p8', name: 'Jugador D2' }, name: 'Pareja Delta' },
    date: '25 Mayo, 2025',
    time: '20:30hs',
    complex: 'Complejo B',
    status: 'Confirmado',
    category: '2da Categoría',
  },
  {
    id: '101', // Partido Ganado por el usuario (teamA)
    teamA: { id: 't5', player1: { id: 'p9', name: 'Usuario E1' }, player2: { id: 'p10', name: 'Usuario E2' }, name: 'Mi Pareja (Ganó)' },
    teamB: { id: 't6', player1: { id: 'p11', name: 'Jugador F1' }, player2: { id: 'p12', name: 'Jugador F2' }, name: 'Oponente F' },
    date: '15 Mayo, 2025',
    time: '21:00hs',
    complex: 'Complejo C',
    status: 'Finalizado',
    result: { teamAScore: '6-3, 6-4', teamBScore: '3-6, 4-6', winner: 'teamA' },
    category: '4ta Categoría',
  },
  {
    id: '102', // Partido Perdido por el usuario (teamA)
    teamA: { id: 't7', player1: { id: 'p13', name: 'Usuario G1' }, player2: { id: 'p14', name: 'Usuario G2' }, name: 'Mi Pareja (Perdió)' },
    teamB: { id: 't8', player1: { id: 'p15', name: 'Jugador H1' }, player2: { id: 'p16', name: 'Jugador H2' }, name: 'Oponente H (Ganó)' },
    date: '10 Mayo, 2025',
    time: '18:00hs',
    complex: 'Complejo D',
    status: 'Finalizado',
    result: { teamAScore: '4-6, 6-7', teamBScore: '6-4, 7-6', winner: 'teamB' },
    category: '4ta Categoría',
  },
   {
    id: 'past_1',
    teamA: { id: 't9', player1: { id: 'p17', name: 'Usuario User1' }, player2: { id: 'p18', name: 'Usuario User2' }, name: 'Mi Pareja' },
    teamB: { id: 't10', player1: { id: 'p19', name: 'López A.' }, player2: { id: 'p20', name: 'García B.'}, name: 'Pareja López/García'},
    date: '20 Mayo (Jugado)',
    time: 'Hora no especificada',
    complex: 'Complejo A',
    status: 'Jugado - Resultado Pendiente',
    category: 'Categoría Ejemplo',
  },
];

// Helper function to generate style key from status
const getStatusStyleKey = (status: MatchStatus): keyof typeof styles => {
  const key = `status${status.replace(/\s+/g, '').replace(/-/g, '')}`;
  return key as keyof typeof styles;
};


const MatchDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { matchId } = params;

  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (matchId && typeof matchId === 'string') {
      setLoading(true);
      setTimeout(() => {
        const foundMatch = allMatchesData.find(m => m.id === matchId);
        setMatchDetails(foundMatch || null);
        setLoading(false);
      }, 500);
    } else {
      setLoading(false);
    }
  }, [matchId]);

  const getTeamDisplayName = (team: Team) => {
    if (team.name) return team.name;
    let displayName = team.player1.name;
    if (team.player2) {
      displayName += ` / ${team.player2.name}`;
    }
    return displayName;
  }

  const handleCoordinateMatch = () => {
    if (!matchDetails) return;
     router.push({ pathname: '/CoordinateMatchScreen', params: { matchId: matchDetails.id } });
  };

  const handleRecordResult = () => {
    if (!matchDetails) return;
    router.push({ pathname: '/RecordResultScreen', params: { matchId: matchDetails.id } });
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Cargando detalles del partido...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!matchDetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
           <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#0284c7" />
          </TouchableOpacity>
          <Text style={styles.errorText}>No se encontraron detalles para este partido.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyleKey = getStatusStyleKey(matchDetails.status);
  const { result, teamA, teamB } = matchDetails; // Destructurar para fácil acceso

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollViewContainer}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButtonAbsolute}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalles del Partido</Text>
        </View>

        <View style={styles.container}>
          <View style={styles.matchCard}>
            <View style={styles.teamsContainer}>
              <View style={styles.team}>
                <Text style={styles.teamName}>{getTeamDisplayName(teamA)}</Text>
              </View>
              <Text style={styles.vsText}>VS</Text>
              <View style={styles.team}>
                <Text style={styles.teamName}>{getTeamDisplayName(teamB)}</Text>
              </View>
            </View>

            {matchDetails.category && (
              <View style={styles.detailItem}>
                <MaterialIcons name="category" size={20} color="#4b5563" style={styles.icon} />
                <Text style={styles.detailTextValue}>{matchDetails.category}</Text>
              </View>
            )}

            {matchDetails.date && (
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={20} color="#4b5563" style={styles.icon} />
                <Text style={styles.detailTextValue}>{matchDetails.date}{matchDetails.time ? ` - ${matchDetails.time}` : ''}</Text>
              </View>
            )}

            {matchDetails.complex && (
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={20} color="#4b5563" style={styles.icon} />
                <Text style={styles.detailTextValue}>{matchDetails.complex}</Text>
              </View>
            )}

            <View style={styles.detailItem}>
              <Ionicons name="information-circle-outline" size={20} color="#4b5563" style={styles.icon} />
              <Text style={[styles.detailTextValue, styles.statusText, styles[statusStyleKey]]}>
                {matchDetails.status}
              </Text>
            </View>

            {/* SECCIÓN DE RESULTADO MEJORADA */}
            {matchDetails.status.startsWith('Jugado') && result && (
              <View style={styles.resultSection}>
                <Text style={styles.sectionSubtitle}>Resultado Final</Text>
                <View style={styles.scoreRow}>
                  <Text style={[
                    styles.scoreTeamName,
                    result.winner === 'teamA' && styles.winnerName
                  ]}>
                    {getTeamDisplayName(teamA)}:
                  </Text>
                  <Text style={[
                    styles.scoreValue,
                    result.winner === 'teamA' && styles.winnerScore
                  ]}>
                    {result.teamAScore}
                  </Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={[
                    styles.scoreTeamName,
                    result.winner === 'teamB' && styles.winnerName
                  ]}>
                    {getTeamDisplayName(teamB)}:
                  </Text>
                  <Text style={[
                    styles.scoreValue,
                    result.winner === 'teamB' && styles.winnerScore
                  ]}>
                    {result.teamBScore}
                  </Text>
                </View>
                {result.winner && (
                  <Text style={styles.winnerText}>
                    Ganador: {getTeamDisplayName(result.winner === 'teamA' ? teamA : teamB)}
                  </Text>
                )}
              </View>
            )}
            {/* FIN DE SECCIÓN DE RESULTADO MEJORADA */}


            {matchDetails.status === 'Jugado - Resultado A Cargado' && (
                <Text style={styles.infoText}>El equipo {getTeamDisplayName(teamA)} ya cargó el resultado. Esperando a {getTeamDisplayName(teamB)}.</Text>
            )}
             {matchDetails.status === 'Jugado - Resultado B Cargado' && (
                <Text style={styles.infoText}>El equipo {getTeamDisplayName(teamB)} ya cargó el resultado. Esperando a {getTeamDisplayName(teamA)}.</Text>
            )}


          </View>

          <View style={styles.actionsContainer}>
            {(matchDetails.status === 'Por Confirmar Sede/Hora' || matchDetails.status === 'Por Jugar') && (
              <TouchableOpacity style={[styles.actionButton, styles.coordinateButton]} onPress={handleCoordinateMatch}>
                <Ionicons name="time-outline" size={20} color="white" style={styles.buttonIcon} />
                <Text style={styles.actionButtonText}>Coordinar Partido</Text>
              </TouchableOpacity>
            )}

            {(matchDetails.status === 'Confirmado' || matchDetails.status === 'Jugado - Resultado Pendiente' || matchDetails.status === 'Jugado - Resultado A Cargado' || matchDetails.status === 'Jugado - Resultado B Cargado') && (
              <TouchableOpacity style={[styles.actionButton, styles.recordResultButton]} onPress={handleRecordResult}>
                <Ionicons name="checkmark-circle-outline" size={20} color="white" style={styles.buttonIcon} />
                <Text style={styles.actionButtonText}>Registrar Resultado</Text>
              </TouchableOpacity>
            )}
          </View>

           {matchDetails.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.sectionSubtitle}>Notas Adicionales</Text>
              <Text style={styles.notesText}>{matchDetails.notes}</Text>
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollViewContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4b5563',
  },
  headerContainer: {
    backgroundColor: '#0284c7',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'ios' ? 100 : (StatusBar.currentHeight || 0) + 55,
  },
  backButtonAbsolute: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 50,
    zIndex: 1,
    padding:5
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  container: {
    padding: 16,
  },
  matchCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teamsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  team: {
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0284c7',
    marginHorizontal: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    marginRight: 10,
  },
  detailTextValue: {
    fontSize: 15,
    color: '#374151',
    flexShrink: 1,
  },
  statusText: {
    fontWeight: 'bold',
  },
  statusPorJugar: { color: '#6b7280' },
  statusPorConfirmarSedeHora: { color: '#f59e0b' },
  statusConfirmado: { color: '#10b981' },
  statusJugadoResultadoPendiente: { color: '#ef4444' },
  statusJugadoResultadoACargado: { color: '#f59e0b' },
  statusJugadoResultadoBCargado: { color: '#f59e0b' },
  statusFinalizado: { color: '#059669' },

  resultSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionSubtitle: {
    fontSize: 18, // Aumentado para más énfasis
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 12, // Más espacio
    textAlign: 'center',
  },
  scoreRow: { // Nuevo estilo para cada fila de puntaje
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6, // Espacio vertical
    marginBottom: 4,
  },
  scoreTeamName: { // Nombre del equipo en la fila de puntaje
    fontSize: 16,
    color: '#374151', // text-gray-700
    flex: 2, // Dar más espacio al nombre
  },
  scoreValue: { // Puntaje del equipo
    fontSize: 16,
    color: '#1f2937', // text-gray-800
    fontWeight: '500',
    flex: 1, // Espacio para el puntaje
    textAlign: 'right',
  },
  winnerName: { // Estilo para el nombre del equipo ganador
    fontWeight: 'bold',
    color: '#059669', // green-600
  },
  winnerScore: { // Estilo para el puntaje del equipo ganador
    fontWeight: 'bold',
    color: '#059669', // green-600
  },
  winnerText: { // Texto que indica el ganador general
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669', // green-600
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#0ea5e9',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  actionsContainer: {
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  coordinateButton: {
    backgroundColor: '#0ea5e9',
  },
  recordResultButton: {
    backgroundColor: '#f59e0b',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  notesSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 20,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#ef4444',
    marginTop: 50,
  },
   backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    padding:5
  },
});

export default MatchDetailScreen;

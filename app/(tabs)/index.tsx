// app/(tabs)/index.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons'; // Para iconos en la card

// Interfaz para los datos de los partidos en esta pantalla
interface UpcomingMatch {
  id: string;
  opponent: string;
  date: string;
  complex: string;
  status: 'Por confirmar' | 'Confirmado' | 'Jugado'; // Estado simplificado para la card
}

interface PastMatch {
  id: string;
  opponent: string;
  complex: string;
  date: string;
  resultText?: string; // Texto como "Ganado 6-3, 6-4" o "Perdido 4-6, 6-7"
  userOutcome?: 'win' | 'loss' | 'pending_result'; // Para el feedback visual
}


// Datos de ejemplo actualizados
const upcomingMatchesData: UpcomingMatch[] = [
  { id: '1', opponent: 'Pareja López/García', date: '20 Mayo, 19:00hs', complex: 'Complejo A', status: 'Por confirmar' },
  { id: '2', opponent: 'Pareja Fernandez/Diaz', date: '25 Mayo, 20:30hs', complex: 'Complejo B', status: 'Confirmado' },
];

const pastMatchesData: PastMatch[] = [
  {
    id: '101', 
    opponent: 'Pareja Gomez/Ruiz',
    resultText: 'Ganaste 6-3, 6-4', 
    userOutcome: 'win',
    complex: 'Complejo C',
    date: '15 Mayo'
  },
  {
    id: '102', 
    opponent: 'Pareja Torres/Vega',
    resultText: 'Perdiste 4-6, 6-7',
    userOutcome: 'loss',
    complex: 'Complejo D',
    date: '10 Mayo'
  },
  {
    id: 'past_1', 
    opponent: 'Pareja López/García',
    // resultText: 'Resultado pendiente', // Dejamos resultText vacío o undefined para que aparezca el botón
    userOutcome: 'pending_result', // O simplemente no definir userOutcome si resultText está vacío
    complex: 'Complejo A',
    date: '20 Mayo (Jugado)'
  },
];

const DashboardScreen = () => {
  const router = useRouter();

  const navigateToCoordinateScreen = (matchId: string) => {
    router.push({
      pathname: '/CoordinateMatchScreen',
      params: { matchId: matchId },
    });
  };

  const navigateToRecordResultScreen = (matchId: string) => {
    router.push({
      pathname: '/RecordResultScreen',
      params: { matchId: matchId },
    });
  };

  const navigateToMatchDetailScreen = (matchId: string) => {
    router.push({
      pathname: `/match/MatchDetailScreen`,
      params: { matchId: matchId },
    });
  };

  const getCardStyle = (outcome?: 'win' | 'loss' | 'pending_result') => {
    if (outcome === 'win') {
      return styles.matchCardWon;
    }
    if (outcome === 'loss') {
      return styles.matchCardLost;
    }
    if (outcome === 'pending_result') { // Podrías tener un estilo para pendiente también
        return styles.matchCardPending;
    }
    return {}; 
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximos Partidos</Text>
          {upcomingMatchesData.length > 0 ? upcomingMatchesData.map((match) => (
            <TouchableOpacity key={match.id} onPress={() => navigateToMatchDetailScreen(match.id)} style={styles.matchCard}>
              <Text style={styles.matchOpponent}>{match.opponent}</Text>
              <Text style={styles.matchDetail}>Fecha: {match.date}</Text>
              <Text style={styles.matchDetail}>Lugar: {match.complex}</Text>
              <View style={styles.statusContainer}>
                <Text style={[
                  styles.matchDetail, 
                  styles.statusText,
                  match.status === 'Confirmado' ? styles.statusConfirmed : styles.statusPending
                ]}>
                  Estado: {match.status}
                </Text>
                {match.status === 'Por confirmar' && (
                  <TouchableOpacity 
                    style={styles.actionButtonSmall}
                    onPress={(e) => {
                        e.stopPropagation();
                        navigateToCoordinateScreen(match.id);
                    }}
                  >
                    <Text style={styles.actionButtonTextSmall}>Coordinar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )) : (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateText}>No tienes próximos partidos programados.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partidos Anteriores</Text>
          {pastMatchesData.length > 0 ? pastMatchesData.map((match) => (
            <TouchableOpacity 
              key={match.id} 
              onPress={() => navigateToMatchDetailScreen(match.id)} 
              style={[styles.matchCard, getCardStyle(match.userOutcome)]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.matchOpponent}>{match.opponent}</Text>
                {match.userOutcome === 'win' && <MaterialIcons name="emoji-events" size={22} color={styles.matchCardWon.borderColor || '#16a34a'} />}
                {match.userOutcome === 'loss' && <MaterialIcons name="sentiment-very-dissatisfied" size={22} color={styles.matchCardLost.borderColor || '#ef4444'} />}
                {match.userOutcome === 'pending_result' && <MaterialIcons name="hourglass-empty" size={20} color={styles.matchCardPending.borderColor || '#f59e0b'} />}
              </View>
              <Text style={styles.matchDetail}>Fecha: {match.date}</Text>
              
              {/* LÓGICA CORREGIDA PARA MOSTRAR RESULTADO O BOTÓN */}
              {!match.resultText && match.userOutcome === 'pending_result' ? (
                <TouchableOpacity 
                  style={styles.recordResultButtonSmall}
                  onPress={(e) => {
                    e.stopPropagation(); // Evitar que el TouchableOpacity padre se active
                    navigateToRecordResultScreen(match.id);
                  }}
                >
                  <Text style={styles.recordResultButtonTextSmall}>Registrar Resultado</Text>
                </TouchableOpacity>
              ) : (
                match.resultText && ( // Solo mostrar el texto del resultado si existe
                    <Text style={[
                        styles.matchDetail, 
                        match.userOutcome === 'win' ? styles.resultWinText : {},
                        match.userOutcome === 'loss' ? styles.resultLossText : {},
                        match.userOutcome === 'pending_result' ? styles.resultPendingText : {},
                      ]}
                    >
                        Resultado: {match.resultText}
                    </Text>
                )
              )}
              {/* FIN DE LÓGICA CORREGIDA */}

              <Text style={styles.matchDetail}>Lugar: {match.complex}</Text>
            </TouchableOpacity>
          )) : (
             <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateText}>Aún no has jugado ningún partido.</Text>
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
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16, 
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937', 
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  matchCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3, 
    borderLeftWidth: 5,
    borderColor: 'transparent', 
  },
  matchCardWon: {
    borderColor: '#16a34a', 
  },
  matchCardLost: {
    borderColor: '#ef4444', 
  },
  matchCardPending: { // Nuevo estilo para tarjetas con resultado pendiente
    borderColor: '#f59e0b', // Naranja (amber-500)
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  matchOpponent: {
    fontSize: 17, 
    fontWeight: '600',
    color: '#0369a1', 
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    flex: 1, 
  },
  matchDetail: {
    fontSize: 14,
    color: '#4b5563', 
    marginBottom: 4, 
    lineHeight: 20, 
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  resultWinText: {
    color: '#15803d', 
    fontWeight: '500',
  },
  resultLossText: {
    color: '#b91c1c', 
    fontWeight: '500',
  },
  resultPendingText: { // Estilo para el texto de resultado pendiente
    color: '#b45309', // amber-700
    fontStyle: 'italic',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    marginBottom: 0, 
  },
  statusConfirmed: {
    color: '#059669', 
    fontWeight: 'bold',
  },
  statusPending: {
    color: '#f59e0b', 
    fontWeight: 'bold',
  },
  actionButtonSmall: {
    backgroundColor: '#0ea5e9', 
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  actionButtonTextSmall: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  recordResultButtonSmall: {
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#f59e0b', 
    paddingVertical: 8, // Un poco más de padding para el botón
    paddingHorizontal: 12,
    borderRadius: 6, // Bordes un poco más redondeados
    alignSelf: 'flex-start', 
  },
  recordResultButtonTextSmall: {
    color: 'white',
    fontSize: 13, // Un poco más grande para legibilidad
    fontWeight: '600', // Más bold
  },
  emptyStateCard: { 
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 80,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6b7280', 
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  }
});

export default DashboardScreen;


// app/RecordResultScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

// Interfaz para los detalles del partido que se esperan
interface MatchDetailsForResults {
  id: string;
  team1Name: string;
  team2Name: string;
  date?: string; // Fecha del partido, opcional para mostrar
  complex?: string; // Complejo donde se jugó, opcional para mostrar
}

// Datos de ejemplo del partido (eventualmente vendrán de props o API)
const getMatchDetailsForResults = (matchId: string | string[] | undefined): MatchDetailsForResults | null => {
  // En una app real, harías una llamada a la API con matchId
  // para obtener los nombres de los equipos, fecha, etc.
  if (matchId === '1') { 
    return {
      id: '1',
      team1Name: 'Jugador Propio 1 / Jugador Propio 2',
      team2Name: 'Pareja López / Pareja García',
      date: '20 Mayo, 19:00hs', 
      complex: 'Complejo A'
    };
  }
  if (matchId === '2') { 
    return {
      id: '2',
      team1Name: 'Jugador Propio X / Jugador Propio Y',
      team2Name: 'Pareja Fernandez / Diaz',
      date: '25 Mayo, 20:30hs', 
      complex: 'Complejo B'
    };
  }
  // Añade más casos o una lógica de API real
  // Si no se encuentra, podrías devolver un objeto con nombres genéricos o null
  return { 
    id: String(matchId), 
    team1Name: 'Equipo 1 (Tú)', 
    team2Name: 'Equipo 2 (Oponente)',
    date: 'Fecha Desconocida',
    complex: 'Lugar Desconocido'
  };
};

const RecordResultScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { matchId } = params; // Obtener matchId de los parámetros de la ruta

  const [matchDetails, setMatchDetails] = useState<MatchDetailsForResults | null>(null);

  // Estados para los sets de cada equipo
  const [team1Set1, setTeam1Set1] = useState<string>('');
  const [team1Set2, setTeam1Set2] = useState<string>('');
  const [team1Set3, setTeam1Set3] = useState<string>(''); // Opcional

  const [team2Set1, setTeam2Set1] = useState<string>('');
  const [team2Set2, setTeam2Set2] = useState<string>('');
  const [team2Set3, setTeam2Set3] = useState<string>(''); // Opcional

  const [confirmResult, setConfirmResult] = useState<boolean>(false);


  useEffect(() => {
    const details = getMatchDetailsForResults(matchId);
    setMatchDetails(details);
  }, [matchId]);

  if (!matchDetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Registrar Resultado' }} />
        <View style={styles.loadingContainer}>
          <Text>Cargando detalles del partido...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmitResult = () => {
    // Validaciones básicas
    if ((!team1Set1 && team2Set1) || (team1Set1 && !team2Set1) || (team1Set1 === '' && team2Set1 === '')) {
      Alert.alert('Error Set 1', 'Completa ambos scores para el Set 1, o déjalos vacíos si no se jugó.');
      return;
    }
    if ((!team1Set2 && team2Set2) || (team1Set2 && !team2Set2) || (team1Set2 === '' && team2Set2 === '')) {
      Alert.alert('Error Set 2', 'Completa ambos scores para el Set 2, o déjalos vacíos si no se jugó.');
      return;
    }
    // Validar que al menos se haya jugado un set completo
    if (team1Set1 === '' || team2Set1 === '') {
        Alert.alert('Resultado Incompleto', 'Debes ingresar al menos el resultado del primer set.');
        return;
    }


    if (!confirmResult) {
      Alert.alert('Confirmación Requerida', 'Por favor, marca la casilla para confirmar que el resultado es correcto.');
      return;
    }

    const result = {
      matchId: matchDetails.id,
      team1Scores: [team1Set1, team1Set2, team1Set3].filter(s => s.trim() !== ''),
      team2Scores: [team2Set1, team2Set2, team2Set3].filter(s => s.trim() !== ''),
    };

    // Lógica para enviar el resultado al backend (Strapi)
    console.log('Resultado a enviar:', result);
    Alert.alert(
      'Resultado Registrado (Simulado)',
      `Equipo 1: ${result.team1Scores.join('-')} \nEquipo 2: ${result.team2Scores.join('-')}\n\nEl resultado ha sido enviado.`,
      [
        { text: 'OK', onPress: () => {
            // Navegar atrás o a la pantalla de partidos actualizados
            if(router.canGoBack()) router.back();
          }
        }
      ]
    );
  };

  // Función para renderizar los inputs de cada set
  const renderSetInputs = (setNumber: number) => {
    let team1SetState, setTeam1SetState;
    let team2SetState, setTeam2SetState;

    if (setNumber === 1) {
      [team1SetState, setTeam1SetState] = [team1Set1, setTeam1Set1];
      [team2SetState, setTeam2SetState] = [team2Set1, setTeam2Set1];
    } else if (setNumber === 2) {
      [team1SetState, setTeam1SetState] = [team1Set2, setTeam1Set2];
      [team2SetState, setTeam2SetState] = [team2Set2, setTeam2Set2];
    } else { // setNumber === 3
      [team1SetState, setTeam1SetState] = [team1Set3, setTeam1Set3];
      [team2SetState, setTeam2SetState] = [team2Set3, setTeam2Set3];
    }

    return (
      <View style={styles.setRow}>
        <Text style={styles.setLabel}>Set {setNumber}:</Text>
        <TextInput
          style={styles.scoreInput}
          keyboardType="number-pad"
          maxLength={1} // Usualmente los games son de un dígito (0-7)
          value={team1SetState}
          onChangeText={setTeam1SetState}
          placeholder="Eq1"
          placeholderTextColor="#cbd5e1"
        />
        <Text style={styles.scoreSeparator}>-</Text>
        <TextInput
          style={styles.scoreInput}
          keyboardType="number-pad"
          maxLength={1}
          value={team2SetState}
          onChangeText={setTeam2SetState}
          placeholder="Eq2"
          placeholderTextColor="#cbd5e1"
        />
      </View>
    );
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Registrar Resultado' }} />
      <ScrollView style={styles.container}>
        <Text style={styles.headerTitle}>Registrar Resultado del Partido</Text>
        
        <View style={styles.matchInfoCard}>
          <Text style={styles.matchDetailText}>Partido del: {matchDetails.date}</Text>
          <Text style={styles.matchDetailText}>En: {matchDetails.complex}</Text>
          <Text style={styles.teamNameLabel}>{matchDetails.team1Name} (Equipo 1)</Text>
          <Text style={styles.vsText}>VS</Text>
          <Text style={styles.teamNameLabel}>{matchDetails.team2Name} (Equipo 2)</Text>
        </View>

        <View style={styles.scoreEntryCard}>
          <Text style={styles.sectionTitle}>Ingresar Marcador por Sets</Text>
          {renderSetInputs(1)}
          {renderSetInputs(2)}
          {renderSetInputs(3)} 
          <Text style={styles.infoText}>Dejar en blanco el Set 3 si el partido terminó en 2 sets.</Text>
        </View>

        <View style={styles.confirmationContainer}>
          <TouchableOpacity onPress={() => setConfirmResult(!confirmResult)} style={[styles.checkboxBase, confirmResult && styles.checkboxChecked]}>
            {confirmResult && <Text style={styles.checkboxCheckmark}>✓</Text>}
          </TouchableOpacity>
          <Text style={styles.confirmText}>Confirmo que el resultado ingresado es correcto.</Text>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitResult}>
          <Text style={styles.submitButtonText}>Enviar Resultado</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6', // slate-100
  },
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b', // slate-800
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  matchInfoCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  matchDetailText: {
    fontSize: 15,
    color: '#475569', // slate-600
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  teamNameLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0284c7', // sky-600
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  vsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155', // slate-700
    textAlign: 'center',
    marginVertical: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  scoreEntryCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b', // slate-800
    marginBottom: 16, // Aumentado margen
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16, // Aumentado margen
  },
  setLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155', // slate-700
    marginRight: 10,
    width: 55, // Ancho fijo para alinear
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  scoreInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1', // slate-300
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8, // Ajuste para iOS
    fontSize: 16,
    width: 55, // Ancho fijo para los inputs de score
    textAlign: 'center',
    backgroundColor: '#f8fafc', // slate-50
    color: '#1e293b',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  scoreSeparator: {
    fontSize: 18, // Más grande
    fontWeight: 'bold',
    marginHorizontal: 10, // Más espacio
    color: '#334155',
  },
  infoText: {
    fontSize: 13,
    color: '#64748b', // slate-500
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  confirmationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    elevation: 1,
  },
  checkboxBase: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#94a3b8', // slate-400
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#0284c7', // sky-600
    borderColor: '#0284c7',
  },
  checkboxCheckmark: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  confirmText: {
    flex: 1, 
    fontSize: 15,
    color: '#334155', // slate-700
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  submitButton: {
    backgroundColor: '#16a34a', // green-600 (Cambiado de #059669)
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});

export default RecordResultScreen;

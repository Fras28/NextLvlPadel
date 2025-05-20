// app/RecordResultScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

// --- PLACEHOLDERS - REPLACE THESE ---
const STRAPI_API_URL = 'https://a1f3-200-127-6-159.ngrok-free.app';
// TODO: Determine which team the current user belongs to (team1 or team2 for this match)
// This is crucial for sending the correct 'resultTeamXConfirmed' and 'confirmationTeamX'
const USER_IS_TEAM1 = true; // Example: Assume user is part of Team 1 for this match

interface StrapiTeamSimple {
  id: number;
  name: string;
}
interface StrapiMatchAttributesResults {
  team1?: { data?: StrapiTeamSimple };
  team2?: { data?: StrapiTeamSimple };
  scheduledDate?: string;
  complex?: string; // From Strapi if available
  // other relevant fields
}

interface FetchedMatchForResults {
  id: string;
  attributes: StrapiMatchAttributesResults;
}

// Interfaz para los detalles del partido que se esperan en el estado local
interface MatchDisplayDetailsForResults {
  id: string;
  team1Name: string;
  team2Name: string;
  date?: string;
  complex?: string;
}

interface SetScore {
  scoreTeam1: number;
  scoreTeam2: number;
  setNumber: number;
}

const RecordResultScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { matchId } = params;
  const { token, user } = useAuth();

  const [matchDetails, setMatchDetails] = useState<MatchDisplayDetailsForResults | null>(null);

  const [team1Set1, setTeam1Set1] = useState<string>('');
  const [team1Set2, setTeam1Set2] = useState<string>('');
  const [team1Set3, setTeam1Set3] = useState<string>('');

  const [team2Set1, setTeam2Set1] = useState<string>('');
  const [team2Set2, setTeam2Set2] = useState<string>('');
  const [team2Set3, setTeam2Set3] = useState<string>('');

  const [confirmResult, setConfirmResult] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatchDataForResultsAPI = useCallback(async () => {
    if (!matchId) {
      setError("Match ID is missing.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${STRAPI_API_URL}/api/matches/${matchId}?populate=team1,team2`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `Failed to fetch match (status ${response.status})`);
      }
      const result: { data: FetchedMatchForResults } = await response.json();
      const fetchedData = result.data;

      const displayDetails: MatchDisplayDetailsForResults = {
        id: fetchedData.id,
        team1Name: fetchedData.attributes.team1?.data?.name || 'Equipo 1',
        team2Name: fetchedData.attributes.team2?.data?.name || 'Equipo 2',
        date: fetchedData.attributes.scheduledDate ? new Date(fetchedData.attributes.scheduledDate).toLocaleDateString() : 'Fecha no disponible',
        complex: fetchedData.attributes.complex || 'Complejo no disponible', // Assuming 'complex' is on match
      };
      setMatchDetails(displayDetails);

    } catch (e: any) {
      setError(e.message);
      console.error("Error fetching match details for results:", e);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);


  useEffect(() => {
    fetchMatchDataForResultsAPI();
  }, [fetchMatchDataForResultsAPI]);


  if (isLoading && !matchDetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Registrar Resultado' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Cargando detalles del partido...</Text>
        </View>
      </SafeAreaView>
    );
  }

   if (error && !matchDetails) {
     return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!matchDetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Registrar Resultado' }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Partido no encontrado o ID inválido.</Text>
           <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  const handleSubmitResult = async () => {
    const scoresRaw = [
        { s1: team1Set1, s2: team2Set1, num: 1 },
        { s1: team1Set2, s2: team2Set2, num: 2 },
        { s1: team1Set3, s2: team2Set3, num: 3 },
    ];

    const setsPayload: SetScore[] = [];
    let resultStringParts: string[] = [];

    for (const set of scoresRaw) {
        const sc1 = parseInt(set.s1);
        const sc2 = parseInt(set.s2);

        if (!isNaN(sc1) && !isNaN(sc2) && set.s1.trim() !== '' && set.s2.trim() !== '') {
          setsPayload.push({ scoreTeam1: sc1, scoreTeam2: sc2, setNumber: set.num }); // Uses scoreTeam1, scoreTeam2
          resultStringParts.push(`${sc1}-${sc2}`);
      } else if (set.s1.trim() !== '' || set.s2.trim() !== '') { // One is filled, other is not or not a number
            Alert.alert(`Error Set ${set.num}`, `Completa ambos scores para el Set ${set.num} con números válidos, o déjalos vacíos si no se jugó.`);
            return;
        }
        // If both are empty, it's fine, just not added to payload
    }


    if (setsPayload.length === 0) {
      Alert.alert('Resultado Incompleto', 'Debes ingresar al menos el resultado del primer set.');
      return;
    }

    if (!confirmResult) {
      Alert.alert('Confirmación Requerida', 'Por favor, marca la casilla para confirmar que el resultado es correcto.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const finalResultString = resultStringParts.join(', '); // e.g., "6-3, 6-4"

    // This data structure should align with what your Strapi backend expects
    // for the 'sets' component and result confirmation fields.
    const payload: any = {
        data: {
            sets: setsPayload,
            // Determine if user is team1 or team2 and set confirmation accordingly
            // This is a simplified assumption. You need robust logic to identify the user's team.
        }
    };

    if (USER_IS_TEAM1) { // This needs to be determined dynamically
        payload.data.resultTeam1Confirmed = finalResultString;
        payload.data.confirmationTeam1 = true;
    } else {
        payload.data.resultTeam2Confirmed = finalResultString;
        payload.data.confirmationTeam2 = true;
    }
    // Potentially, also update 'estado' to something like 'PendingApproval' or let lifecycle handle it.
    // payload.data.estado = 'Played'; // Or another status that indicates result submitted

    console.log('Enviando resultado a Strapi:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(`${STRAPI_API_URL}/api/matches/${matchId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || `Error al enviar resultado (status ${response.status})`);
        }
        
        Alert.alert(
            'Resultado Registrado',
            `Resultado: ${finalResultString}\n\nEl resultado ha sido enviado para confirmación.`,
            [{ text: 'OK', onPress: () => { if(router.canGoBack()) router.back(); } }]
        );

    } catch (e: any) {
        setError(e.message);
        Alert.alert('Error de Envío', e.message);
        console.error("Error sending result to Strapi:", e);
    } finally {
        setIsLoading(false);
    }
  };

  const renderSetInputs = (setNumber: number) => {
    let team1SetState: string, setTeam1SetState: (val: string) => void;
    let team2SetState: string, setTeam2SetState: (val: string) => void;

    if (setNumber === 1) { [team1SetState, setTeam1SetState] = [team1Set1, setTeam1Set1]; [team2SetState, setTeam2SetState] = [team2Set1, setTeam2Set1]; }
    else if (setNumber === 2) { [team1SetState, setTeam1SetState] = [team1Set2, setTeam1Set2]; [team2SetState, setTeam2SetState] = [team2Set2, setTeam2Set2]; }
    else { [team1SetState, setTeam1SetState] = [team1Set3, setTeam1Set3]; [team2SetState, setTeam2SetState] = [team2Set3, setTeam2Set3]; }

    return (
      <View style={styles.setRow}>
        <Text style={styles.setLabel}>Set {setNumber}:</Text>
        <TextInput style={styles.scoreInput} keyboardType="number-pad" maxLength={2} value={team1SetState} onChangeText={setTeam1SetState} placeholder="Eq1" placeholderTextColor="#cbd5e1" />
        <Text style={styles.scoreSeparator}>-</Text>
        <TextInput style={styles.scoreInput} keyboardType="number-pad" maxLength={2} value={team2SetState} onChangeText={setTeam2SetState} placeholder="Eq2" placeholderTextColor="#cbd5e1" />
      </View>
    );
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Registrar Resultado' }} />
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>Registrar Resultado del Partido</Text>
        
        {error && <Text style={styles.inlineErrorText}>{error}</Text>}

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

        <TouchableOpacity style={[styles.submitButton, isLoading && styles.disabledButton]} onPress={handleSubmitResult} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Enviar Resultado</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

// Styles (Copied from your provided file, ensure they are complete)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding:20,
  },
  loadingText: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginTop: 10,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
   inlineErrorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
    padding: 5,
    backgroundColor: '#ffe0e0'
  },
  backButton: { // Added for error state
    marginTop: 20,
    backgroundColor: '#0ea5e9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: { // Added for error state
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
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
    color: '#475569',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  teamNameLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0284c7',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  vsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
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
    color: '#1e293b',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  setLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    marginRight: 10,
    width: 55,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  scoreInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 16,
    width: 55, // Adjusted for potential 2-digit scores (tie-breaks)
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  scoreSeparator: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 10,
    color: '#334155',
  },
  infoText: {
    fontSize: 13,
    color: '#64748b',
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
    borderColor: '#94a3b8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#0284c7',
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
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  submitButton: {
    backgroundColor: '#16a34a',
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
  disabledButton: {
    backgroundColor: '#9ca3af',
  }
});

export default RecordResultScreen;
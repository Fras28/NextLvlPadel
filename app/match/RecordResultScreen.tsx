// app/match/RecordResultScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
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
  ActivityIndicator,
} from "react-native";
import {
  Stack,
  useLocalSearchParams,
  useRouter,
  useNavigation,
} from "expo-router";
import { useAuth } from "@/context/AuthContext";

const STRAPI_API_URL =
  process.env.EXPO_PUBLIC_STRAPI_URL ||
  "https://04dc-200-127-6-159.ngrok-free.app";

// --- Interfaces para RecordResultScreen (AJUSTADAS AL LOG) ---
interface RR_StrapiUserSimple {
  // RR for RecordResult
  id: number;
  documentId?: string; // From your log for users
}

interface RR_TeamPopulated {
  // Represents the structure of team_1 or team_2 from your log
  id: number;
  documentId?: string;
  name: string;
  isActive?: boolean;
  currentRank?: number;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  users_permissions_users?: RR_StrapiUserSimple[]; // Direct array, as per your log
}

// Interface for the data object returned by /api/matches/:id (as per your log)
interface SingleMatchDataFromLog {
  id: number; // Numeric ID of the match (from log)
  documentId?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  playedDate?: string | null;
  estado?: string;
  confirmationTeam1?: boolean;
  confirmationTeam2?: boolean;
  resultTeam1Confirmed?: string | null;
  resultTeam2Confirmed?: string | null;
  scheduledDate?: string | null;
  complex?: string | null; // Added from your DashboardScreen context
  team_1?: RR_TeamPopulated | null; // Directly the team object
  team_2?: RR_TeamPopulated | null; // Directly the team object
}

interface MatchDisplayDetailsForResults {
  id: string; // ID numérico del partido (para el PUT), stringified
  team1Name: string;
  team2Name: string;
  date?: string;
  complex?: string;
}

interface SetScorePayload {
  team1Score: number;
  team2Score: number;
  setNumber: number;
}

const RecordResultScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { matchId } = params; // Este es el ID numérico del partido (string from params)
  const { token, user } = useAuth();
  const navigation = useNavigation();

  const [matchDetails, setMatchDetails] =
    useState<MatchDisplayDetailsForResults | null>(null);
  const [userTeamNumber, setUserTeamNumber] = useState<1 | 2 | null>(null);

  const [team1Set1, setTeam1Set1] = useState<string>("");
  const [team1Set2, setTeam1Set2] = useState<string>("");
  const [team1Set3, setTeam1Set3] = useState<string>("");
  const [team2Set1, setTeam2Set1] = useState<string>("");
  const [team2Set2, setTeam2Set2] = useState<string>("");
  const [team2Set3, setTeam2Set3] = useState<string>("");

  const [confirmResult, setConfirmResult] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (matchDetails) {
      navigation.setOptions({
        title: `Resultado: ${matchDetails.team1Name} vs ${matchDetails.team2Name}`,
      });
    } else if (!isLoading) {
      navigation.setOptions({ title: "Registrar Resultado" });
    }
  }, [matchDetails, navigation, isLoading]);

  const fetchMatchDataForResultsAPI = useCallback(async () => {
    if (!matchId || typeof matchId !== "string") {
      setError("ID del partido es inválido o falta.");
      setIsLoading(false);
      return;
    }
    if (!token) {
      setError("Autenticación requerida.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log(
      `[RecordResultScreen] Fetching match details for numeric ID: ${matchId}`
    );
    try {
      // This populate query, based on your log, correctly returns team names directly
      const populateQuery =
        "populate[team_1][populate][users_permissions_users][fields][0]=id&populate[team_1][populate][users_permissions_users][fields][1]=documentId&populate[team_2][populate][users_permissions_users][fields][0]=id&populate[team_2][populate][users_permissions_users][fields][1]=documentId&populate[team_1][fields]=name,documentId,isActive,currentRank,createdAt,updatedAt,publishedAt&populate[team_2][fields]=name,documentId,isActive,currentRank,createdAt,updatedAt,publishedAt";
      const apiUrl = `${STRAPI_API_URL}/api/matches/${matchId}?${populateQuery}`;
      console.log(`[RecordResultScreen] Fetch URL: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const responseBodyText = await response.text();

      if (!response.ok) {
        let errData;
        try {
          errData = JSON.parse(responseBodyText);
        } catch (e) {
          throw new Error(
            `Error en la respuesta (status ${
              response.status
            }): ${responseBodyText.substring(0, 150)}`
          );
        }
        console.error("[RecordResultScreen] API Error Data:", errData);
        throw new Error(
          errData.error?.message ||
            `Error al obtener el partido (${response.status})`
        );
      }

      // The API returns { data: { id: ..., attributes: { field1: ..., team_1: { id: ..., name: ... } } } }
      // OR based on your log, it's { data: { id: ..., field1: ..., team_1: { id: ..., name: ... } } }
      // Your log shows: result.data IS the object with all fields including team_1, team_2 directly.
      const result: { data: SingleMatchDataFromLog } =
        JSON.parse(responseBodyText);
      console.log(
        "[RecordResultScreen] Raw result.data from API (this is SingleMatchDataFromLog):",
        JSON.stringify(result.data, null, 2)
      );
      const fetchedStrapiMatchData = result.data; // This is SingleMatchDataFromLog

      if (!fetchedStrapiMatchData) {
        throw new Error(
          "Los datos del partido recibidos no son válidos o están vacíos."
        );
      }

      const team1Data = fetchedStrapiMatchData.team_1; // team1Data is RR_TeamPopulated or null
      const team2Data = fetchedStrapiMatchData.team_2; // team2Data is RR_TeamPopulated or null

      let identifiedTeam: 1 | 2 | null = null;
      // users_permissions_users is a direct array on teamXData
      if (user && team1Data?.users_permissions_users) {
        if (
          team1Data.users_permissions_users.some(
            (player: RR_StrapiUserSimple) => player.id === user.id
          )
        ) {
          identifiedTeam = 1;
        }
      }
      if (!identifiedTeam && user && team2Data?.users_permissions_users) {
        if (
          team2Data.users_permissions_users.some(
            (player: RR_StrapiUserSimple) => player.id === user.id
          )
        ) {
          identifiedTeam = 2;
        }
      }
      setUserTeamNumber(identifiedTeam);
      console.log(
        "[RecordResultScreen] Usuario identificado como parte del Equipo:",
        identifiedTeam
      );

      const displayDetails: MatchDisplayDetailsForResults = {
        id: String(fetchedStrapiMatchData.id), // Ensure ID is string for the state
        team1Name: team1Data?.name || "Equipo 1", // Direct name access
        team2Name: team2Data?.name || "Equipo 2", // Direct name access
        date: fetchedStrapiMatchData.scheduledDate
          ? new Date(fetchedStrapiMatchData.scheduledDate).toLocaleDateString(
              "es-AR"
            )
          : "N/A",
        complex: fetchedStrapiMatchData.complex || "N/A",
      };
      setMatchDetails(displayDetails);
    } catch (e: any) {
      setError(e.message);
      console.error(
        "[RecordResultScreen] Error detallado al obtener datos del partido:",
        e
      );
    } finally {
      setIsLoading(false);
    }
  }, [matchId, token, user]);

  useEffect(() => {
    fetchMatchDataForResultsAPI();
  }, [fetchMatchDataForResultsAPI]);

  const handleSubmitResult = async () => {
    if (!userTeamNumber) {
      Alert.alert(
        "Error",
        "No se pudo identificar tu equipo en este partido. No se puede registrar el resultado."
      );
      return;
    }
    if (!matchDetails) {
      Alert.alert(
        "Error",
        "No hay detalles del partido cargados para enviar el resultado."
      );
      return;
    }

    const scoresRaw = [
      { s1: team1Set1, s2: team2Set1, num: 1 },
      { s1: team1Set2, s2: team2Set2, num: 2 },
      { s1: team1Set3, s2: team2Set3, num: 3 },
    ];
    const setsPayload: SetScorePayload[] = [];
    let resultStringParts: string[] = [];

    for (const set of scoresRaw) {
      const sc1 = parseInt(set.s1);
      const sc2 = parseInt(set.s2);
      if (
        !isNaN(sc1) &&
        !isNaN(sc2) &&
        set.s1.trim() !== "" &&
        set.s2.trim() !== ""
      ) {
        setsPayload.push({
          team1Score: sc1,
          team2Score: sc2,
          setNumber: set.num,
        });
        resultStringParts.push(`${sc1}-${sc2}`);
      } else if (set.s1.trim() !== "" || set.s2.trim() !== "") {
        Alert.alert(
          `Error Set ${set.num}`,
          `Completa ambos scores para el Set ${set.num} o déjalos vacíos si no se jugó.`
        );
        return;
      }
    }
    if (setsPayload.length === 0) {
      Alert.alert(
        "Resultado Incompleto",
        "Debes ingresar al menos el resultado del primer set."
      );
      return;
    }
    if (!confirmResult) {
      Alert.alert(
        "Confirmación Requerida",
        "Por favor, marca la casilla para confirmar que el resultado ingresado es correcto."
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    const finalResultString = resultStringParts.join(", ");
    const payload: any = { data: { sets: setsPayload } };

    if (userTeamNumber === 1) {
      payload.data.resultTeam1Confirmed = finalResultString;
      payload.data.confirmationTeam1 = true;
    } else if (userTeamNumber === 2) {
      payload.data.resultTeam2Confirmed = finalResultString;
      payload.data.confirmationTeam2 = true;
    }

    console.log(
      "[RecordResultScreen] Enviando resultado:",
      JSON.stringify(payload, null, 2)
    );
    try {
      const putUrl = `${STRAPI_API_URL}/api/matches/${matchDetails.id}`; // Uses numeric matchId
      console.log(`[RecordResultScreen] URL para PUT: ${putUrl}`);

      const response = await fetch(putUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errData = await response.json();
        console.error(
          "[RecordResultScreen] Error response from Strapi (PUT):",
          errData
        );
        throw new Error(
          errData.error?.message ||
            `Error al enviar el resultado (${response.status})`
        );
      }
      Alert.alert(
        "Resultado Registrado",
        `Tu resultado (${finalResultString}) ha sido enviado.`,
        [
          {
            text: "OK",
            onPress: () => {
              if (router.canGoBack()) router.back();
            },
          },
        ]
      );
    } catch (e: any) {
      setError(e.message);
      Alert.alert("Error de Envío", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSetInputs = (setNumber: number) => {
    let team1SetState: string, setTeam1SetState: (val: string) => void;
    let team2SetState: string, setTeam2SetState: (val: string) => void;

    if (setNumber === 1) {
      [team1SetState, setTeam1SetState] = [team1Set1, setTeam1Set1];
      [team2SetState, setTeam2SetState] = [team2Set1, setTeam2Set1];
    } else if (setNumber === 2) {
      [team1SetState, setTeam1SetState] = [team1Set2, setTeam1Set2];
      [team2SetState, setTeam2SetState] = [team2Set2, setTeam2Set2];
    } else {
      [team1SetState, setTeam1SetState] = [team1Set3, setTeam1Set3];
      [team2SetState, setTeam2SetState] = [team2Set3, setTeam2Set3];
    }

    return (
      <View style={styles.setRow}>
        <Text style={styles.setLabel}>Set {setNumber}:</Text>
        <TextInput
          style={styles.scoreInput}
          keyboardType="number-pad"
          maxLength={2}
          value={team1SetState}
          onChangeText={setTeam1SetState}
          placeholder="Eq1"
          placeholderTextColor="#cbd5e1"
        />
        <Text style={styles.scoreSeparator}>-</Text>
        <TextInput
          style={styles.scoreInput}
          keyboardType="number-pad"
          maxLength={2}
          value={team2SetState}
          onChangeText={setTeam2SetState}
          placeholder="Eq2"
          placeholderTextColor="#cbd5e1"
        />
      </View>
    );
  };

  if (isLoading && !matchDetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (error && !matchDetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>
            Error al cargar el partido: {error}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  if (!matchDetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Partido no encontrado o ID inválido.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>Registrar Resultado del Partido</Text>
        {error && !isLoading && (
          <Text style={styles.inlineErrorText}>{error}</Text>
        )}
        {!userTeamNumber && !isLoading && (
          <Text style={styles.inlineWarningText}>
            No estás asignado a un equipo en este partido. No podrás registrar
            el resultado.
          </Text>
        )}

        <View style={styles.matchInfoCard}>
          <Text style={styles.matchDetailTextBold}>Partido:</Text>
          <Text style={styles.teamNameLabel}>Eq1: {matchDetails.team1Name}</Text>
          <Text style={styles.vsText}>VS</Text>
          <Text style={styles.teamNameLabel}>Eq2: {matchDetails.team2Name}</Text>
          <Text style={styles.matchDetailText}>
            Fecha programada: {matchDetails.date}
          </Text>
          <Text style={styles.matchDetailText}>
            Complejo: {matchDetails.complex}
          </Text>
        </View>

        <View style={styles.scoreEntryCard}>
          <Text style={styles.sectionTitle}>Ingresar Marcador por Sets</Text>
          {renderSetInputs(1)}
          {renderSetInputs(2)}
          {renderSetInputs(3)}
          <Text style={styles.infoText}>
            Deja en blanco los scores del Set 3 si no se jugó.
          </Text>
        </View>

        <View style={styles.confirmationContainer}>
          <TouchableOpacity
            onPress={() => setConfirmResult(!confirmResult)}
            style={[
              styles.checkboxBase,
              confirmResult && styles.checkboxChecked,
            ]}
          >
            {confirmResult && <Text style={styles.checkboxCheckmark}>✓</Text>}
          </TouchableOpacity>
          <Text style={styles.confirmText}>
            Confirmo que el resultado ingresado es correcto.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (isLoading || !userTeamNumber) && styles.disabledButton,
          ]}
          onPress={handleSubmitResult}
          disabled={isLoading || !userTeamNumber}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Enviar Resultado</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f0f4f8" },
  container: { flex: 1, padding: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginTop: 10,
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    marginBottom: 10,
  },
  inlineErrorText: {
    color: "red",
    textAlign: "center",
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#ffe0e0",
    borderRadius: 6,
  },
  inlineWarningText: {
    color: "#856404",
    backgroundColor: "#fff3cd",
    borderColor: "#ffeeba",
    borderWidth: 1,
    textAlign: "center",
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  backButton: {
    marginTop: 20,
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 20,
  },
  matchInfoCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    alignItems: "center",
  },
  matchDetailText: {
    fontSize: 15,
    color: "#495057",
    marginBottom: 6,
    textAlign: "center",
  },
  matchDetailTextBold: {
    fontSize: 16,
    color: "#343a40",
    marginBottom: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  teamNameLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#007bff",
    marginTop: 4,
    marginBottom: 4,
    textAlign: "center",
  },
  vsText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#343a40",
    marginVertical: 4,
    textAlign: "center",
  },
  scoreEntryCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#343a40",
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    paddingBottom: 8,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    justifyContent: "center",
  },
  setLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#495057",
    marginRight: 12,
    width: 60,
  },
  scoreInput: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    width: 60,
    textAlign: "center",
    backgroundColor: "#f8f9fa",
    color: "#212529",
  },
  scoreSeparator: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 12,
    color: "#495057",
  },
  infoText: {
    fontSize: 13,
    color: "#6c757d",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },
  confirmationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  checkboxBase: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#adb5bd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxChecked: { backgroundColor: "#007bff", borderColor: "#007bff" },
  checkboxCheckmark: { color: "white", fontWeight: "bold", fontSize: 16 },
  confirmText: { flex: 1, fontSize: 15, color: "#495057", lineHeight: 22 },
  submitButton: {
    backgroundColor: "#28a745",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    elevation: 2,
  },
  submitButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  disabledButton: { backgroundColor: "#adb5bd" },
});

export default RecordResultScreen;

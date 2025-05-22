// app/match/CoordinateMatchScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  KeyboardAvoidingView,
  StatusBar, // <--- IMPORTADO StatusBar
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useHeaderHeight } from "@react-navigation/elements";

const STRAPI_API_URL =
  process.env.EXPO_PUBLIC_STRAPI_URL ||
  "https://3c1c-200-127-6-159.ngrok-free.app";

// --- Interfaces (Asegúrate que estas definiciones coincidan con las que causan error) ---
interface ChatMessage {
  sender: string;
  message: string;
  timestamp: string;
}

interface StrapiUserSimple {
  id: number;
  // username?: string; // Podrías necesitarlo si lo usas
}

interface StrapiTeamPopulated {
  id: number;
  name: string;
  users_permissions_users?: {
    data: StrapiUserSimple[]; // Asegúrate que StrapiUserSimple está definido si lo usas aquí
  };
}

interface SingleMatchDataFromApi {
  id: string;
  documentId?: string;
  team_1?: { data?: StrapiTeamPopulated | null };
  team_2?: { data?: StrapiTeamPopulated | null };
  scheduledDate?: string | null;
  complex?: string | null;
  estado?: string | null;
  // category?: { data?: { id: number, name: string } | null };
  // winner?: { data?: { id: number, name: string } | null };
}

interface MatchDisplayDetails {
  numericId: string;
  documentId: string;
  team1Name: string;
  team2Name: string;
  currentProposedDate: string;
  currentProposedTime: string;
  currentProposedComplex: string;
  currentStatus: string;
  chat: ChatMessage[];
}

const CoordinateMatchScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { matchId: matchDocumentIdFromParams } = params;
  const { token, user } = useAuth();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();

  const [matchDetails, setMatchDetails] = useState<MatchDisplayDetails | null>(
    null
  );
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [complex, setComplex] = useState<string>("");
  const [chatMessage, setChatMessage] = useState<string>("");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userTeamNumber, setUserTeamNumber] = useState<1 | 2 | null>(null);

  const chatLogScrollViewRef = useRef<ScrollView>(null);
  const mainScrollViewRef = useRef<ScrollView>(null);
  const chatInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (matchDetails) {
      navigation.setOptions({
        title: `Coordinar: ${matchDetails.team1Name} vs ${matchDetails.team2Name}`,
      });
    } else if (!isLoading) {
      navigation.setOptions({ title: "Coordinar Partido" });
    }
  }, [matchDetails, navigation, isLoading]);

  const fetchMatchDataFromAPI = useCallback(async () => {
    if (
      !matchDocumentIdFromParams ||
      typeof matchDocumentIdFromParams !== "string"
    ) {
      setError("ID de documento del partido es inválido o falta.");
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
      `[CoordinateMatchScreen] Fetching match details for documentId: ${matchDocumentIdFromParams}`
    );

    try {
      const populateQuery =
        "populate[team_1][populate][users_permissions_users][fields][0]=id&populate[team_2][populate][users_permissions_users][fields][0]=id&populate=team_1.name&populate=team_2.name";
      const apiUrl = `${STRAPI_API_URL}/api/matches/${matchDocumentIdFromParams}?${populateQuery}`;

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
        throw new Error(
          errData.error?.message ||
            `Error al obtener el partido (${response.status})`
        );
      }
      const result: { data: SingleMatchDataFromApi } =
        JSON.parse(responseBodyText);
      const fetchedStrapiMatchData = result.data;
      if (!fetchedStrapiMatchData) {
        throw new Error(
          "Los datos del partido recibidos no son válidos o están vacíos."
        );
      }

      const team1Data = fetchedStrapiMatchData.team_1?.data;
      const team2Data = fetchedStrapiMatchData.team_2?.data;

      let identifiedTeam: 1 | 2 | null = null;
      if (user && team1Data?.users_permissions_users?.data) {
        // Proporcionar tipo explícito para 'player'
        if (
          team1Data.users_permissions_users.data.some(
            (player: StrapiUserSimple) => player.id === user.id
          )
        )
          identifiedTeam = 1;
      }
      if (!identifiedTeam && user && team2Data?.users_permissions_users?.data) {
        // Proporcionar tipo explícito para 'player'
        if (
          team2Data.users_permissions_users.data.some(
            (player: StrapiUserSimple) => player.id === user.id
          )
        )
          identifiedTeam = 2;
      }
      setUserTeamNumber(identifiedTeam);

      let initialDate = "";
      let initialTime = "";
      if (fetchedStrapiMatchData.scheduledDate) {
        const schedDate = new Date(fetchedStrapiMatchData.scheduledDate);
        if (!isNaN(schedDate.getTime())) {
          initialDate = schedDate.toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
          initialTime = schedDate.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
        }
      }
      const displayDetails: MatchDisplayDetails = {
        numericId: fetchedStrapiMatchData.id, // Asumiendo que 'id' existe en fetchedStrapiMatchData
        documentId: matchDocumentIdFromParams as string,
        team1Name: team1Data?.name || "Equipo 1",
        team2Name: team2Data?.name || "Equipo 2",
        currentProposedDate: initialDate,
        currentProposedTime: initialTime,
        currentProposedComplex: fetchedStrapiMatchData.complex || "",
        currentStatus: fetchedStrapiMatchData.estado || "Por coordinar",
        chat: [],
      };
      setMatchDetails(displayDetails);
      setDate(initialDate);
      setTime(initialTime);
      setComplex(displayDetails.currentProposedComplex); // Usar el campo correcto
      setChatLog([]);
    } catch (e: any) {
      setError(e.message);
      console.error("[CoordinateMatchScreen] Error detallado:", e);
    } finally {
      setIsLoading(false);
    }
  }, [matchDocumentIdFromParams, token, user]);

  useEffect(() => {
    fetchMatchDataFromAPI();
  }, [fetchMatchDataFromAPI]);

  const handleSendChatMessage = () => {
    if (chatMessage.trim() === "") return;
    const newMessage: ChatMessage = {
      sender: user?.username || "Tú",
      message: chatMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setChatLog((prevLog) => [...prevLog, newMessage]);
    setChatMessage("");
    setTimeout(() => {
      chatLogScrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleChatInputFocus = () => {
    setTimeout(() => {
      mainScrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const handleConfirmDetails = async () => {
    if (!date || !time || !complex) {
      Alert.alert(
        "Campos incompletos",
        "Por favor, completa fecha, hora y complejo."
      );
      return;
    }
    if (!token || !matchDetails) {
      Alert.alert("Error", "Autenticación o detalles del partido faltantes.");
      return;
    }
    const dateParts = date.split("/");
    const timeParts = time.split(":");
    if (dateParts.length !== 3 || timeParts.length !== 2) {
      Alert.alert("Formato Inválido", "Usa DD/MM/YYYY y HH:MM.");
      return;
    }
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    if (
      isNaN(day) ||
      isNaN(month) ||
      isNaN(year) ||
      isNaN(hour) ||
      isNaN(minute) ||
      year < 2000 ||
      year > 2100
    ) {
      Alert.alert("Valores Inválidos", "Fecha/hora no válidas.");
      return;
    }
    const scheduledDateTime = new Date(year, month, day, hour, minute);
    if (isNaN(scheduledDateTime.getTime())) {
      Alert.alert("Fecha Inválida", "La fecha/hora ingresada no es válida.");
      return;
    }

    Alert.alert(
      "Confirmar Detalles",
      `Fecha: ${date}\nHora: ${time}\nComplejo: ${complex}\n\n¿Enviar?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setIsLoading(true);
            setError(null);
            try {
              const payload = {
                data: {
                  scheduledDate: scheduledDateTime.toISOString(),
                  complex: complex,
                },
              };
              // Usar matchDetails.documentId que SÍ está en la interfaz MatchDisplayDetails
              const putUrl = `${STRAPI_API_URL}/api/matches/${matchDetails.documentId}`;
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
                throw new Error(
                  errData.error?.message ||
                    `Error al actualizar (${response.status})`
                );
              }
              Alert.alert(
                "Detalles Actualizados",
                "Propuesta enviada/confirmada."
              );
              fetchMatchDataFromAPI();
            } catch (e: any) {
              setError(e.message);
              Alert.alert("Error de Envío", e.message);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
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
          {/* Este botón de volver no estaba definido en tus estilos originales, usando uno genérico */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              marginTop: 20,
              backgroundColor: "#007bff",
              padding: 10,
              borderRadius: 5,
            }}
          >
            <Text style={{ color: "white" }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  // Si matchDetails es null después de cargar y sin error, es un estado problemático.
  if (!matchDetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            No se encontraron los detalles del partido o ID inválido.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              marginTop: 20,
              backgroundColor: "#007bff",
              padding: 10,
              borderRadius: 5,
            }}
          >
            <Text style={{ color: "white" }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Si llegamos aquí, matchDetails no es null.
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        // Acceder a StatusBar.currentHeight solo si StatusBar está importado y es relevante para Android
        keyboardVerticalOffset={
          headerHeight +
          (Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0)
        }
      >
        <ScrollView
          ref={mainScrollViewRef}
          style={styles.container}
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.headerTitle}>Coordinación de Partido</Text>
          {error && !isLoading && (
            <Text style={styles.inlineErrorText}>Error: {error}</Text>
          )}

          <View style={styles.matchInfoCard}>
            <Text style={styles.teamsText}>{matchDetails.team1Name}</Text>
            <Text style={styles.vsText}>VS</Text>
            <Text style={styles.teamsText}>{matchDetails.team2Name}</Text>
            <Text style={styles.currentStatusText}>
              Estado Actual: {matchDetails.currentStatus}
            </Text>
            {matchDetails.currentProposedDate &&
              matchDetails.currentProposedTime && (
                <Text style={styles.currentProposalText}>
                  Propuesta Actual: {matchDetails.currentProposedDate} a las{" "}
                  {matchDetails.currentProposedTime} en{" "}
                  {matchDetails.currentProposedComplex || "N/A"}
                </Text>
              )}
          </View>

          <Text style={styles.sectionTitle}>Proponer/Confirmar Detalles</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Fecha (DD/MM/YYYY)"
              value={date}
              onChangeText={setDate}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.textInput}
              placeholder="Hora (HH:MM)"
              value={time}
              onChangeText={setTime}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.textInput}
              placeholder="Nombre del Complejo"
              value={complex}
              onChangeText={setComplex}
            />
            <TouchableOpacity
              style={[styles.confirmButton, isLoading && styles.disabledButton]}
              onPress={handleConfirmDetails}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Enviar Propuesta / Confirmar
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Chat de Coordinación (Local)</Text>
          <View style={styles.chatContainer}>
            <ScrollView
              style={styles.chatLogScrollView}
              ref={chatLogScrollViewRef}
              onContentSizeChange={() =>
                chatLogScrollViewRef.current?.scrollToEnd({ animated: true })
              }
            >
              {chatLog.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.chatMessage,
                    msg.sender === (user?.username || "Tú")
                      ? styles.myMessage
                      : styles.theirMessage,
                  ]}
                >
                  <Text style={styles.messageSender}>{msg.sender}</Text>
                  <Text
                    style={[
                      styles.messageText,
                      msg.sender === (user?.username || "Tú")
                        ? styles.myMessageText
                        : styles.theirMessageText,
                    ]}
                  >
                    {msg.message}
                  </Text>
                  <Text
                    style={[
                      styles.messageTimestamp,
                      msg.sender === (user?.username || "Tú")
                        ? styles.myTimestamp
                        : styles.theirTimestamp,
                    ]}
                  >
                    {msg.timestamp}
                  </Text>
                </View>
              ))}
              {chatLog.length === 0 && (
                <Text style={styles.emptyChatText}>Aún no hay mensajes.</Text>
              )}
            </ScrollView>
            <View style={styles.chatInputContainer}>
              <TextInput
                ref={chatInputRef}
                style={styles.chatTextInput}
                placeholder="Escribe un mensaje..."
                value={chatMessage}
                onChangeText={setChatMessage}
                multiline
                onFocus={handleChatInputFocus}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !chatMessage.trim() && styles.disabledButton,
                ]}
                onPress={handleSendChatMessage}
                disabled={!chatMessage.trim()}
              >
                <Text style={styles.sendButtonText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ... (tus estilos sin cambios, asegúrate que keyboardAvoidingContainer y scrollContentContainer estén definidos como en la respuesta anterior)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f0f4f8" },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContentContainer: {
    paddingBottom: 20,
    flexGrow: 1,
  },
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
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#ffe0e0",
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 20,
    marginTop: Platform.OS === "ios" ? 0 : 30,
  },
  matchInfoCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  teamsText: { fontSize: 18, fontWeight: "600", color: "#34495e" },
  vsText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#7f8c8d",
    marginVertical: 5,
  },
  currentStatusText: {
    fontSize: 15,
    color: "#2980b9",
    marginTop: 10,
    fontStyle: "italic",
  },
  currentProposalText: {
    fontSize: 14,
    color: "#555",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34495e",
    marginTop: 20,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 5,
  },
  inputContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  textInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
    color: "#333",
  },
  confirmButton: {
    backgroundColor: "#28a745",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  disabledButton: { backgroundColor: "#adb5bd" },
  chatContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    minHeight: 250,
    maxHeight: 400,
    // flex: Platform.OS === 'android' ? 1 : 0, // Ajuste opcional para Android
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  chatLogScrollView: { flex: 1, padding: 10 },
  chatMessage: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 10,
    maxWidth: "85%",
  },
  myMessage: { backgroundColor: "#007bff", alignSelf: "flex-end" },
  theirMessage: { backgroundColor: "#e9ecef", alignSelf: "flex-start" },
  myMessageText: { color: "white" },
  theirMessageText: { color: "#212529" },
  messageSender: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 3,
    color: "#555",
  },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTimestamp: {
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 5,
    opacity: 0.7,
  },
  myTimestamp: { color: "#f0f0f0" },
  theirTimestamp: { color: "#6c757d" },
  emptyChatText: {
    textAlign: "center",
    color: "#6c757d",
    padding: 20,
    fontStyle: "italic",
  },
  chatInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    padding: 10,
    backgroundColor: "#f8f9fa",
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 16,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  sendButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
});

export default CoordinateMatchScreen;

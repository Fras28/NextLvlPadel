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
  StatusBar,
  Modal,
  Image
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useAuth } from "@/context/AuthContext"; // Asegúrate que la ruta sea correcta
import { useHeaderHeight } from "@react-navigation/elements";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';

const STRAPI_API_URL =
  process.env.EXPO_PUBLIC_STRAPI_URL ||
  "https://04dc-200-127-6-159.ngrok-free.app";

// --- Definiciones de Interfaces ---
interface ChatMessage {
  sender: string;
  message: string;
  timestamp: string;
}

interface CS_StrapiUser {
  id: number;
  documentId?: string;
  username?: string;
}

interface CS_TeamPopulated {
  id: number;
  documentId?: string;
  name: string;
  isActive?: boolean;
  currentRank?: number;
  users_permissions_users?: CS_StrapiUser[];
}

interface CS_MatchData { // Para la respuesta de la API al filtrar por documentId
  id: number; // ID numérico de Strapi
  documentId: string;
  team_1?: CS_TeamPopulated | null; // Directamente el objeto del equipo
  team_2?: CS_TeamPopulated | null; // Directamente el objeto del equipo
  scheduledDate?: string | null;
  complex?: string | null;
  estado?: string | null;
}

interface CS_FilteredMatchesApiResponse { // Para la respuesta de la API al filtrar (lista)
  data: CS_MatchData[];
  meta?: {
    pagination: { page: number; pageSize: number; pageCount: number; total: number; }
  };
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

// Lista de horas para el selector
const hourlyTimes: string[] = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

// Lista de complejos
interface ComplexInfo {
  name: string;
  logoIconName?: keyof typeof MaterialIcons.glyphMap; // Para íconos de MaterialIcons
  // logoUrl?: string; // Alternativa: si tienes URLs de imágenes para los logos
}

const complexList: ComplexInfo[] = [
  { name: "X3Padel", logoIconName: "sports-tennis" },
  { name: "Osaka", logoIconName: "sports-kabaddi" },
  { name: "Septem", logoIconName: "stadium" },
  { name: "Los Pinos", logoIconName: "nature-people" },
  { name: "Nova", logoIconName: "star-border" },
  { name: "Otro", logoIconName: "add-location-alt"},
];


const CoordinateMatchScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { matchId: matchDocumentIdFromParams } = params; // Este es el documentId (string)
  const { token, user } = useAuth();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();

  const [matchDetails, setMatchDetails] = useState<MatchDisplayDetails | null>(null);
  
  // Estados para los selectores
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>("12:00");
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [selectedComplexName, setSelectedComplexName] = useState<string>("");
  const [customComplexName, setCustomComplexName] = useState<string>(""); // Para la opción "Otro"
  const [showComplexPickerModal, setShowComplexPickerModal] = useState(false);
  
  const [chatMessage, setChatMessage] = useState<string>("");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Iniciar en true
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
    } else if (isLoading) {
      navigation.setOptions({ title: "Cargando Partido..." });
    } else if (error) {
      navigation.setOptions({ title: "Error al Cargar" });
    } else {
      navigation.setOptions({ title: "Coordinar Partido" });
    }
  }, [matchDetails, navigation, isLoading, error]);

  const fetchMatchDataFromAPI = useCallback(async () => {
    if (!matchDocumentIdFromParams || typeof matchDocumentIdFromParams !== "string") {
      setError("ID de documento del partido es inválido o falta.");
      setIsLoading(false); return;
    }
    if (!token) { setError("Autenticación requerida."); setIsLoading(false); return; }

    setIsLoading(true); setError(null);
    
    try {
      // Usar la query de populate que funcionó para MatchDetailScreen (asumiendo que es la correcta para obtener nombres de equipo)
      const populateQueryParts = [
        'populate[team_1][populate][users_permissions_users][fields][0]=id',
        'populate[team_1][populate][users_permissions_users][fields][1]=username',
        // 'populate[team_1][populate][users_permissions_users][fields][2]=documentId', // Quitar si User no tiene documentId
        'populate[team_2][populate][users_permissions_users][fields][0]=id',
        'populate[team_2][populate][users_permissions_users][fields][1]=username',
        // 'populate[team_2][populate][users_permissions_users][fields][2]=documentId', // Quitar si User no tiene documentId
        'populate[team_1][fields]=id,documentId,name,isActive,currentRank', // Campos de Team
        'populate[team_2][fields]=id,documentId,name,isActive,currentRank', // Campos de Team
      ];
      const populateQuery = populateQueryParts.join('&');
      // API URL para filtrar por documentId (espera una lista)
      const apiUrl = `${STRAPI_API_URL}/api/matches?filters[documentId][$eq]=${matchDocumentIdFromParams}&${populateQuery}`;
      console.log(`[CoordinateMatchScreen] Fetching URL: ${apiUrl}`);

      const response = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
      const responseBodyText = await response.text();

      if (!response.ok) {
        let errData;
        try { errData = JSON.parse(responseBodyText); }
        catch (e) { throw new Error(`Error en la respuesta (status ${response.status}): ${responseBodyText.substring(0, 150)}`);}
        console.error("[CoordinateMatchScreen] API Error Data:", errData);
        throw new Error(errData.error?.message || `Error al obtener el partido (${response.status})`);
      }
      
      const result: CS_FilteredMatchesApiResponse = JSON.parse(responseBodyText);

      if (!result.data || result.data.length === 0) {
        throw new Error("Partido no encontrado o datos vacíos.");
      }
      const fetchedMatchData = result.data[0]; // Tomar el primer (y único) elemento de la lista

      const team1Data = fetchedMatchData.team_1; // Acceso directo, como en MatchDetailScreen
      const team2Data = fetchedMatchData.team_2; // Acceso directo

      let identifiedTeam: 1 | 2 | null = null;
      if (user && team1Data?.users_permissions_users) { // Asumiendo users_permissions_users es un array directo
        if (team1Data.users_permissions_users.some((player: CS_StrapiUser) => player.id === user.id)) {
          identifiedTeam = 1;
        }
      }
      if (!identifiedTeam && user && team2Data?.users_permissions_users) {  // Asumiendo users_permissions_users es un array directo
        if (team2Data.users_permissions_users.some((player: CS_StrapiUser) => player.id === user.id)) {
          identifiedTeam = 2;
        }
      }
      setUserTeamNumber(identifiedTeam);

      let initialDateObj = new Date();
      let initialTimeStr = "12:00"; 
      if (fetchedMatchData.scheduledDate) {
        const schedDate = new Date(fetchedMatchData.scheduledDate);
        if (!isNaN(schedDate.getTime())) {
          initialDateObj = schedDate;
          initialTimeStr = `${schedDate.getHours().toString().padStart(2, '0')}:00`; 
        }
      }
      setSelectedDate(initialDateObj);
      setSelectedTime(initialTimeStr);

      const fetchedComplex = fetchedMatchData.complex || "";
      const isKnownComplex = complexList.some(c => c.name === fetchedComplex);
      if (isKnownComplex) {
        setSelectedComplexName(fetchedComplex);
        setCustomComplexName("");
      } else if (fetchedComplex) {
        setSelectedComplexName("Otro");
        setCustomComplexName(fetchedComplex);
      } else {
        setSelectedComplexName("");
        setCustomComplexName("");
      }

      const displayDetails: MatchDisplayDetails = {
        numericId: String(fetchedMatchData.id), 
        documentId: fetchedMatchData.documentId,
        team1Name: team1Data?.name || "Equipo 1",
        team2Name: team2Data?.name || "Equipo 2",
        currentProposedDate: initialDateObj.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }),
        currentProposedTime: initialTimeStr,
        currentProposedComplex: fetchedComplex,
        currentStatus: fetchedMatchData.estado || "Por coordinar",
        chat: [],
      };
      setMatchDetails(displayDetails);
      setChatLog([]);
    } catch (e: any) {
      setError(e.message || "Ocurrió un error desconocido al cargar los datos.");
      setMatchDetails(null); 
    } finally {
      setIsLoading(false);
    }
  }, [matchDocumentIdFromParams, token, user]);

  useEffect(() => {
    fetchMatchDataFromAPI();
  }, [fetchMatchDataFromAPI]);

  const onChangeDate = (event: DateTimePickerEvent, date?: Date) => {
    const currentDate = date || selectedDate;
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(currentDate);
    if (Platform.OS !== 'ios') { setShowDatePicker(false); }
  };
  const handleIOSTimePickerDone = () => setShowDatePicker(false);

  const handleTimeSlotPress = (time: string) => {
    setSelectedTime(time);
    setShowTimePickerModal(false);
  };
  
  const handleComplexSelect = (complex: ComplexInfo) => {
    setSelectedComplexName(complex.name);
    if (complex.name !== "Otro") {
        setCustomComplexName("");
    }
    setShowComplexPickerModal(false);
  };

  const handleSendChatMessage = () => {
    if (chatMessage.trim() === "") return;
    const newMessage: ChatMessage = {
      sender: user?.username || "Tú",
      message: chatMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatLog((prevLog) => [...prevLog, newMessage]);
    setChatMessage("");
    setTimeout(() => { chatLogScrollViewRef.current?.scrollToEnd({ animated: true }); }, 100);
  };

  const handleChatInputFocus = () => {
    setTimeout(() => { mainScrollViewRef.current?.scrollToEnd({ animated: true }); }, 300);
  };

  const handleConfirmDetails = async () => {
    if (!matchDetails) { 
      Alert.alert("Error", "Los detalles del partido no están cargados. Intenta de nuevo."); 
      return; 
    }

    const complexToSubmit = selectedComplexName === "Otro" ? customComplexName.trim() : selectedComplexName;
    if (!complexToSubmit) {
      Alert.alert("Campo incompleto", "Por favor, selecciona o ingresa el nombre del complejo."); return;
    }
    if (!token) { 
      Alert.alert("Error", "Autenticación requerida."); return; 
    }
    
    const [hour, minute] = selectedTime.split(":").map(Number);
    const finalDateTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour, minute);

    if (isNaN(finalDateTime.getTime())) { 
      Alert.alert("Fecha/Hora Inválida", "La fecha/hora seleccionada no es válida."); return; 
    }

    Alert.alert("Confirmar Detalles", 
      `Fecha: ${finalDateTime.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}\nHora: ${selectedTime}\nComplejo: ${complexToSubmit}\n\n¿Enviar?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setIsLoading(true); setError(null);
            try {
              const payload = { data: { scheduledDate: finalDateTime.toISOString(), complex: complexToSubmit } };
              // Usar documentId para el PUT, asumiendo que la API lo soporta o se usa un endpoint específico para ello.
              // Si el PUT requiere el ID numérico, se usaría matchDetails.numericId
              const putUrl = `${STRAPI_API_URL}/api/matches/${matchDetails.documentId}`; 

              const response = await fetch(putUrl, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
              });
              if (!response.ok) { 
                const errDataText = await response.text();
                let errData;
                try { errData = JSON.parse(errDataText); } catch(parseError){ throw new Error(`Error al actualizar (${response.status}) - ${errDataText.substring(0,100)}`)}
                throw new Error( errData.error?.message || `Error al actualizar (${response.status})`); 
              }
              Alert.alert("Detalles Actualizados", "Propuesta enviada/confirmada.");
              fetchMatchDataFromAPI(); 
            } catch (e: any) { setError(e.message); Alert.alert("Error de Envío", e.message); }
            finally { setIsLoading(false); }
          },
        },
      ]
    );
  };

  if (isLoading) { 
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#0ea5e9" /><Text style={styles.loadingText}>Cargando Detalles del Partido...</Text></View>
      </SafeAreaView>
    );
  }

  if (error) { 
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorTextHeadline}>Error al Cargar</Text>
          <Text style={styles.errorTextDetail}>{error}</Text>
          <TouchableOpacity onPress={fetchMatchDataFromAPI} style={styles.genericButton}><Text style={styles.genericButtonText}>Reintentar</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={[styles.genericButton, styles.backButton]}><Text style={styles.genericButtonText}>Volver</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!matchDetails) { 
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No se pudieron cargar los detalles del partido o el partido no fue encontrado.</Text>
           <TouchableOpacity onPress={() => router.back()} style={styles.genericButton}><Text style={styles.genericButtonText}>Volver</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // A partir de aquí, matchDetails no es null.
  const currentMatch = matchDetails; 

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={ headerHeight + (Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0) }
      >
        <ScrollView
          ref={mainScrollViewRef}
          style={styles.container}
          contentContainerStyle={styles.scrollContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.headerTitle}>Coordinación de Partido</Text> 

          <View style={styles.matchInfoCard}> 
            <Text style={styles.teamsText}>{currentMatch.team1Name}</Text> 
            <Text style={styles.vsText}>VS</Text> 
            <Text style={styles.teamsText}>{currentMatch.team2Name}</Text> 
            <Text style={styles.currentStatusText}> Estado Actual: {currentMatch.currentStatus} </Text> 
            {currentMatch.currentProposedDate && currentMatch.currentProposedTime && ( 
                <Text style={styles.currentProposalText}>
                  Propuesta Actual: {currentMatch.currentProposedDate} a las{" "}
                  {currentMatch.currentProposedTime} en{" "}
                  {currentMatch.currentProposedComplex || "N/A"}
                </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Proponer/Confirmar Detalles</Text> 
          <View style={styles.inputContainer}> 
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.pickerButton}>
              <Text style={styles.pickerButtonText}>
                Fecha: {selectedDate.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onChangeDate}
                minimumDate={new Date()} 
                locale="es-ES" 
              />
            )}
             {Platform.OS === 'ios' && showDatePicker && (
                <TouchableOpacity onPress={handleIOSTimePickerDone} style={styles.iosPickerDoneButton}>
                    <Text style={styles.iosPickerDoneButtonText}>Confirmar Fecha</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setShowTimePickerModal(true)} style={styles.pickerButton}>
              <Text style={styles.pickerButtonText}>Hora: {selectedTime}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setShowComplexPickerModal(true)} style={styles.pickerButton}>
              <Text style={styles.pickerButtonText}>
                Complejo: {selectedComplexName || "Seleccionar Complejo"}
              </Text>
            </TouchableOpacity>
            
            {selectedComplexName === "Otro" && (
                <TextInput
                    style={styles.textInput}
                    placeholder="Nombre del Otro Complejo"
                    value={customComplexName}
                    onChangeText={setCustomComplexName}
                />
            )}
            
            <TouchableOpacity 
              style={[styles.confirmButton, isLoading && styles.disabledButton]} 
              onPress={handleConfirmDetails} 
              disabled={isLoading} 
            >
              {isLoading ? (<ActivityIndicator color="#fff" /> ) : ( <Text style={styles.confirmButtonText}> Enviar Propuesta / Confirmar </Text>)}
            </TouchableOpacity>
          </View>

          {/* Time Picker Modal */}
          <Modal
            transparent={true}
            visible={showTimePickerModal}
            animationType="fade"
            onRequestClose={() => setShowTimePickerModal(false)}
          >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setShowTimePickerModal(false)}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Seleccionar Hora</Text>
                <ScrollView style={styles.timeListScrollView}>
                  {hourlyTimes.map(timeSlot => (
                    <TouchableOpacity 
                      key={timeSlot} 
                      style={styles.timeSlotButton}
                      onPress={() => handleTimeSlotPress(timeSlot)}
                    >
                      <Text style={styles.timeSlotText}>{timeSlot}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                 <TouchableOpacity onPress={() => setShowTimePickerModal(false)} style={styles.modalCloseButton}>
                    <Text style={styles.modalCloseButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Complex Picker Modal */}
          <Modal
            transparent={true}
            visible={showComplexPickerModal}
            animationType="fade"
            onRequestClose={() => setShowComplexPickerModal(false)}
          >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setShowComplexPickerModal(false)}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Seleccionar Complejo</Text>
                <ScrollView style={styles.complexListScrollView}>
                  {complexList.map(complex => (
                    <TouchableOpacity 
                      key={complex.name} 
                      style={styles.complexSlotButton}
                      onPress={() => handleComplexSelect(complex)}
                    >
                      <Text style={styles.complexSlotText}>{complex.name}</Text>
                      {complex.logoIconName && (
                        <MaterialIcons name={complex.logoIconName} size={24} color="#007bff" style={styles.complexIcon} />
                      )}
                      {/* Para logos de imagen:
                       {complex.logoUrl && <Image source={{uri: complex.logoUrl}} style={styles.complexLogoImage} />}
                      */}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                 <TouchableOpacity onPress={() => setShowComplexPickerModal(false)} style={styles.modalCloseButton}>
                    <Text style={styles.modalCloseButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          <Text style={styles.sectionTitle}>Chat de Coordinación (Local)</Text> 
          <View style={styles.chatContainer}> 
             <ScrollView style={styles.chatLogScrollView} ref={chatLogScrollViewRef} onContentSizeChange={() => chatLogScrollViewRef.current?.scrollToEnd({ animated: true })} > 
              {chatLog.map((msg, index) => ( 
                <View key={index} style={[ styles.chatMessage, msg.sender === (user?.username || "Tú") ? styles.myMessage : styles.theirMessage, ]} >
                  <Text style={styles.messageSender}>{msg.sender}</Text> 
                  <Text style={[ styles.messageText, msg.sender === (user?.username || "Tú") ? styles.myMessageText : styles.theirMessageText, ]} > {msg.message} </Text> 
                  <Text style={[ styles.messageTimestamp, msg.sender === (user?.username || "Tú") ? styles.myTimestamp : styles.theirTimestamp, ]} > {msg.timestamp} </Text> 
                </View>
              ))}
              {chatLog.length === 0 && ( <Text style={styles.emptyChatText}>Aún no hay mensajes.</Text> )} 
            </ScrollView>
            <View style={styles.chatInputContainer}> 
              <TextInput ref={chatInputRef} style={styles.chatTextInput} placeholder="Escribe un mensaje..." value={chatMessage} onChangeText={setChatMessage} multiline onFocus={handleChatInputFocus} /> 
              <TouchableOpacity style={[ styles.sendButton, !chatMessage.trim() && styles.disabledButton, ]} onPress={handleSendChatMessage} disabled={!chatMessage.trim()} > 
                <Text style={styles.sendButtonText}>Enviar</Text> 
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f0f4f8" },
  keyboardAvoidingContainer: { flex: 1, },
  container: { flex: 1, paddingHorizontal: 16, },
  scrollContentContainer: { paddingBottom: 20, flexGrow: 1, },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, },
  loadingText: { fontSize: 16, color: "#555", textAlign: "center", marginTop: 10, },
  errorTextHeadline: { fontSize: 18, fontWeight: 'bold', color: "red", textAlign: "center", marginBottom: 8, },
  errorTextDetail: { fontSize: 15, color: "red", textAlign: "center", marginBottom: 20, },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#2c3e50", textAlign: "center", marginBottom: 20, marginTop: Platform.OS === "ios" ? 0 : 30, },
  matchInfoCard: { backgroundColor: "white", borderRadius: 10, padding: 16, marginBottom: 20, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3, },
  teamsText: { fontSize: 18, fontWeight: "600", color: "#34495e" },
  vsText: { fontSize: 16, fontWeight: "bold", color: "#7f8c8d", marginVertical: 5, },
  currentStatusText: { fontSize: 15, color: "#2980b9", marginTop: 10, fontStyle: "italic", },
  currentProposalText: { fontSize: 14, color: "#555", marginTop: 8, textAlign: "center", paddingHorizontal: 10, },
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#34495e", marginTop: 20, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: "#e0e0e0", paddingBottom: 5, },
  inputContainer: { backgroundColor: "white", borderRadius: 10, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, },
  textInput: { backgroundColor: "#f8f9fa", borderWidth: 1, borderColor: "#ced4da", borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, marginBottom: 15, color: "#333", },
  confirmButton: { backgroundColor: "#28a745", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 10 },
  confirmButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  disabledButton: { backgroundColor: "#adb5bd" },
  pickerButton: { backgroundColor: "#f8f9fa", borderWidth: 1, borderColor: "#ced4da", borderRadius: 8, paddingHorizontal: 15, paddingVertical: 15, marginBottom: 15, alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  pickerButtonText: { fontSize: 16, color: "#333", },
  iosPickerDoneButton: { backgroundColor: '#007bff', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 15, marginTop: 5},
  iosPickerDoneButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold',},
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',},
  modalContent: { backgroundColor: 'white', borderRadius: 10, padding: 20, width: '80%', maxHeight: '70%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333',},
  timeListScrollView: { maxHeight: 250, }, 
  complexListScrollView: { maxHeight: 300, }, 
  timeSlotButton: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center',},
  timeSlotText: { fontSize: 17, color: '#007bff',},
  complexSlotButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee',},
  complexSlotText: { fontSize: 17, color: '#007bff', flex: 1 }, // Allow text to take space
  complexIcon: { marginLeft: 10,},
  complexLogoImage: { width: 24, height: 24, marginLeft: 10, resizeMode: 'contain',},
  modalCloseButton: { marginTop: 15, backgroundColor: '#6c757d', borderRadius: 8, paddingVertical: 10, alignItems: 'center',},
  modalCloseButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold',},
  chatContainer: { backgroundColor: "white", borderRadius: 10, minHeight: 250, maxHeight: 400, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, overflow: "hidden", display: "flex", flexDirection: "column", },
  chatLogScrollView: { flex: 1, padding: 10 },
  chatMessage: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, marginBottom: 10, maxWidth: "85%", },
  myMessage: { backgroundColor: "#007bff", alignSelf: "flex-end" },
  theirMessage: { backgroundColor: "#e9ecef", alignSelf: "flex-start" },
  myMessageText: { color: "white" },
  theirMessageText: { color: "#212529" },
  messageSender: { fontSize: 12, fontWeight: "bold", marginBottom: 3, color: "#555", },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTimestamp: { fontSize: 10, alignSelf: "flex-end", marginTop: 5, opacity: 0.7, },
  myTimestamp: { color: "#f0f0f0" },
  theirTimestamp: { color: "#6c757d" },
  emptyChatText: { textAlign: "center", color: "#6c757d", padding: 20, fontStyle: "italic", },
  chatInputContainer: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#e0e0e0", padding: 10, backgroundColor: "#f8f9fa", },
  chatTextInput: { flex: 1, backgroundColor: "white", borderWidth: 1, borderColor: "#ced4da", borderRadius: 20, paddingHorizontal: 15, paddingVertical: Platform.OS === "ios" ? 12 : 8, fontSize: 16, marginRight: 10, maxHeight: 100, },
  sendButton: { backgroundColor: "#007bff", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 20, },
  sendButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  genericButton: { marginTop: 10, backgroundColor: "#007bff", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, elevation: 2, minWidth: 120, alignItems: 'center' },
  backButton: { backgroundColor: '#6c757d'},
  genericButtonText: { color: "white", fontSize: 16, fontWeight: "bold", },
});

export default CoordinateMatchScreen;
// app/match/CoordinateMatchScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TextInput,
  TouchableOpacity, Alert, Platform, ActivityIndicator
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

const STRAPI_API_URL = process.env.EXPO_PUBLIC_STRAPI_URL || 'https://3c1c-200-127-6-159.ngrok-free.app';

// --- Interfaces para CoordinateMatchScreen ---
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
    data: StrapiUserSimple[];
  };
}

// Interfaz para los datos del partido como se esperan de /api/matches/:id (estructura aplanada)
interface SingleMatchDataFromApi {
  id: string; // ID numérico del partido
  documentId?: string; // Strapi podría no incluir documentId aquí si ya se usó en la URL de solicitud
  team_1?: { data?: StrapiTeamPopulated | null };
  team_2?: { data?: StrapiTeamPopulated | null };
  scheduledDate?: string | null;
  complex?: string | null;
  estado?: string | null;
  // Añade otros campos que esperas directamente en este nivel, ej: category, winner, etc.
  // category?: { data?: { id: number, name: string } | null };
  // winner?: { data?: { id: number, name: string } | null };
}

interface MatchDisplayDetails {
  numericId: string;
  documentId: string; // El Document ID que se usa para fetch y PUT
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
  const { matchId: matchDocumentIdFromParams } = params; // matchId es el documentId
  const { token, user } = useAuth();
  const navigation = useNavigation(); // Para el título

  const [matchDetails, setMatchDetails] = useState<MatchDisplayDetails | null>(null);
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [complex, setComplex] = useState<string>('');
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userTeamNumber, setUserTeamNumber] = useState<1 | 2 | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (matchDetails) {
      navigation.setOptions({ title: `Coordinar: ${matchDetails.team1Name} vs ${matchDetails.team2Name}` });
    } else if (!isLoading) {
      navigation.setOptions({ title: 'Coordinar Partido' });
    }
  }, [matchDetails, navigation, isLoading]);


  const fetchMatchDataFromAPI = useCallback(async () => {
    if (!matchDocumentIdFromParams || typeof matchDocumentIdFromParams !== 'string') {
      setError("ID de documento del partido es inválido o falta.");
      setIsLoading(false);
      return;
    }
    if (!token) { setError("Autenticación requerida."); setIsLoading(false); return; }

    setIsLoading(true); setError(null);
    console.log(`[CoordinateMatchScreen] Fetching match details for documentId: ${matchDocumentIdFromParams}`);

    try {
      const populateQuery = 'populate[team_1][populate][users_permissions_users][fields][0]=id&populate[team_2][populate][users_permissions_users][fields][0]=id&populate=team_1.name&populate=team_2.name';
      const apiUrl = `${STRAPI_API_URL}/api/matches/${matchDocumentIdFromParams}?${populateQuery}`;
      console.log(`[CoordinateMatchScreen] Fetch URL: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const responseBodyText = await response.text(); // Obtener texto para depurar en caso de error de parseo

      if (!response.ok) {
        let errData;
        try { errData = JSON.parse(responseBodyText); }
        catch(e) { throw new Error(`Error en la respuesta (status ${response.status}): ${responseBodyText.substring(0,150)}`); }
        console.error("[CoordinateMatchScreen] API Error Data:", errData);
        throw new Error(errData.error?.message || `Error al obtener el partido (${response.status})`);
      }
      
      const result: { data: SingleMatchDataFromApi } = JSON.parse(responseBodyText); // Espera un solo objeto en .data
      console.log("[CoordinateMatchScreen] Raw result.data from API:", JSON.stringify(result.data, null, 2));
      
      const fetchedStrapiMatchData = result.data;

      if (!fetchedStrapiMatchData) { // Si result.data es null o undefined
        throw new Error("Los datos del partido recibidos no son válidos o están vacíos.");
      }
      
      // Acceso directo a los campos, ya no se usa .attributes
      const team1Data = fetchedStrapiMatchData.team_1?.data;
      const team2Data = fetchedStrapiMatchData.team_2?.data;

      let identifiedTeam: 1 | 2 | null = null;
      if (user && team1Data?.users_permissions_users?.data) {
        if (team1Data.users_permissions_users.data.some(player => player.id === user.id)) {
          identifiedTeam = 1;
        }
      }
      if (!identifiedTeam && user && team2Data?.users_permissions_users?.data) {
        if (team2Data.users_permissions_users.data.some(player => player.id === user.id)) {
          identifiedTeam = 2;
        }
      }
      setUserTeamNumber(identifiedTeam);
      console.log('[CoordinateMatchScreen] Usuario identificado como parte del Equipo:', identifiedTeam);

      let initialDate = '';
      let initialTime = '';
      if (fetchedStrapiMatchData.scheduledDate) {
        const schedDate = new Date(fetchedStrapiMatchData.scheduledDate);
        if (!isNaN(schedDate.getTime())) {
            initialDate = schedDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            initialTime = schedDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
        } else {
            console.warn("[CoordinateMatchScreen] Invalid scheduledDate received:", fetchedStrapiMatchData.scheduledDate);
        }
      }

      const displayDetails: MatchDisplayDetails = {
        numericId: fetchedStrapiMatchData.id,
        documentId: matchDocumentIdFromParams as string,
        team1Name: team1Data?.name || 'Equipo 1',
        team2Name: team2Data?.name || 'Equipo 2',
        currentProposedDate: initialDate,
        currentProposedTime: initialTime,
        currentProposedComplex: fetchedStrapiMatchData.complex || '',
        currentStatus: fetchedStrapiMatchData.estado || 'Por coordinar',
        chat: [],
      };
      setMatchDetails(displayDetails);
      setDate(initialDate);
      setTime(initialTime);
      setComplex(displayDetails.currentProposedComplex);
      setChatLog([]);

    } catch (e: any) {
      setError(e.message);
      console.error("[CoordinateMatchScreen] Error detallado al obtener datos del partido:", e);
    } finally {
      setIsLoading(false);
    }
  }, [matchDocumentIdFromParams, token, user]);

  useEffect(() => {
    fetchMatchDataFromAPI();
  }, [fetchMatchDataFromAPI]);

  const handleSendChatMessage = () => {
    if (chatMessage.trim() === '') return;
    const newMessage: ChatMessage = { 
        sender: user?.username || 'Tú', 
        message: chatMessage, 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}) 
    };
    setChatLog((prevLog: ChatMessage[]) => [...prevLog, newMessage]);
    setChatMessage('');
    setTimeout(() => { scrollViewRef.current?.scrollToEnd({ animated: true }); }, 100);
  };

  const handleConfirmDetails = async () => {
    if (!date || !time || !complex) {
      Alert.alert('Campos incompletos', 'Por favor, completa fecha, hora y complejo.');
      return;
    }
    if (!token) { Alert.alert("Error", "Autenticación requerida."); return; }
    if (!matchDetails) { Alert.alert("Error", "No hay detalles del partido cargados."); return;}

    const dateParts = date.split('/');
    const timeParts = time.split(':');
    if (dateParts.length !== 3 || timeParts.length !== 2) {
        Alert.alert("Formato Inválido", "Usa el formato DD/MM/YYYY para la fecha y HH:MM para la hora.");
        return;
    }
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(minute) || year < 2000 || year > 2100) {
        Alert.alert("Valores Inválidos", "Fecha y hora deben contener números válidos y realistas.");
        return;
    }
    const scheduledDateTime = new Date(year, month, day, hour, minute);
    if (isNaN(scheduledDateTime.getTime())) {
        Alert.alert("Fecha Inválida", "La fecha/hora ingresada no es válida. Verifica el formato DD/MM/YYYY.");
        return;
    }

    Alert.alert(
      'Confirmar Detalles',
      `Fecha: ${date}\nHora: ${time}\nComplejo: ${complex}\n\n¿Enviar esta propuesta/confirmación?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: async () => {
            setIsLoading(true); setError(null);
            try {
                const payload = {
                    data: {
                        scheduledDate: scheduledDateTime.toISOString(),
                        complex: complex,
                        // Aquí podrías agregar lógica para actualizar team_1_confirmed o team_2_confirmed
                        // basado en userTeamNumber si es parte de la coordinación.
                        // Ejemplo:
                        // ...(userTeamNumber === 1 && { team_1_confirmed: true }),
                        // ...(userTeamNumber === 2 && { team_2_confirmed: true }),
                        // Y potencialmente cambiar el 'estado' del partido si ambas confirmaciones están.
                    }
                };
                console.log('[CoordinateMatchScreen] Enviando a Strapi (PUT):', JSON.stringify(payload, null, 2));
                const putUrl = `${STRAPI_API_URL}/api/matches/${matchDetails.documentId}`; // Usa documentId
                console.log(`[CoordinateMatchScreen] URL para PUT: ${putUrl}`);

                const response = await fetch(putUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                    body: JSON.stringify(payload),
                });
                if (!response.ok) {
                    const errData = await response.json();
                    console.error("[CoordinateMatchScreen] Error response from Strapi (PUT):", errData);
                    throw new Error(errData.error?.message || `Error al actualizar el partido (${response.status})`);
                }
                Alert.alert('Detalles Actualizados', 'Los detalles del partido han sido actualizados.');
                fetchMatchDataFromAPI(); 
            } catch (e: any) {
                setError(e.message); Alert.alert('Error de Envío', e.message);
            } finally {
                setIsLoading(false);
            }
          }
        }
      ]
    );
  };
  
  if (isLoading && !matchDetails) { 
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#0ea5e9" /><Text style={styles.loadingText}>Cargando...</Text></View>
      </SafeAreaView>
    );
  }
  if (error && !matchDetails) { 
     return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Error al cargar el partido: {error}</Text>
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
        <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>No se encontraron los detalles del partido o ID inválido.</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* El título se actualiza mediante navigation.setOptions en useEffect */}
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>Coordinación de Partido</Text>
        {error && !isLoading && <Text style={styles.inlineErrorText}>Error: {error}</Text>}

        <View style={styles.matchInfoCard}>
          <Text style={styles.teamsText}>{matchDetails.team1Name}</Text>
          <Text style={styles.vsText}>VS</Text>
          <Text style={styles.teamsText}>{matchDetails.team2Name}</Text>
          <Text style={styles.currentStatusText}>Estado Actual: {matchDetails.currentStatus}</Text>
          {matchDetails.currentProposedDate && matchDetails.currentProposedTime && (
            <Text style={styles.currentProposalText}>
              Propuesta Actual: {matchDetails.currentProposedDate} a las {matchDetails.currentProposedTime} en {matchDetails.currentProposedComplex || "N/A"}
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Proponer/Confirmar Detalles</Text>
        <View style={styles.inputContainer}>
          <TextInput style={styles.textInput} placeholder="Fecha (DD/MM/YYYY)" value={date} onChangeText={setDate} keyboardType="numeric" />
          <TextInput style={styles.textInput} placeholder="Hora (HH:MM)" value={time} onChangeText={setTime} keyboardType="numeric" />
          <TextInput style={styles.textInput} placeholder="Nombre del Complejo" value={complex} onChangeText={setComplex} />
          <TouchableOpacity style={[styles.confirmButton, (isLoading) && styles.disabledButton]} onPress={handleConfirmDetails} disabled={isLoading}>
            { (isLoading) ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Enviar Propuesta / Confirmar</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Chat de Coordinación (Local)</Text>
        <View style={styles.chatContainer}>
          <ScrollView style={styles.chatLogScrollView} ref={scrollViewRef} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
            {chatLog.map((msg, index) => (
              <View key={index} style={[styles.chatMessage, msg.sender === (user?.username || 'Tú') ? styles.myMessage : styles.theirMessage]}>
                <Text style={styles.messageSender}>{msg.sender}</Text>
                <Text style={[styles.messageText, msg.sender === (user?.username || 'Tú') ? styles.myMessageText : styles.theirMessageText]}>{msg.message}</Text>
                <Text style={[styles.messageTimestamp, msg.sender === (user?.username || 'Tú') ? styles.myTimestamp : styles.theirTimestamp]}>{msg.timestamp}</Text>
              </View>
            ))}
            {chatLog.length === 0 && (<Text style={styles.emptyChatText}>Aún no hay mensajes.</Text>)}
          </ScrollView>
          <View style={styles.chatInputContainer}>
            <TextInput style={styles.chatTextInput} placeholder="Escribe un mensaje..." value={chatMessage} onChangeText={setChatMessage} multiline />
            <TouchableOpacity style={[styles.sendButton, !chatMessage.trim() && styles.disabledButton]} onPress={handleSendChatMessage} disabled={!chatMessage.trim()}>
              <Text style={styles.sendButtonText}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({ 
  safeArea: { flex: 1, backgroundColor: '#f0f4f8' },
  container: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 16, color: '#555', textAlign: 'center', marginTop: 10 },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center', marginBottom: 10 },
  inlineErrorText: { color: 'red', textAlign: 'center', marginBottom: 10, paddingVertical: 8, paddingHorizontal:10, backgroundColor: '#ffe0e0', borderRadius: 6 },
  backButton: { marginTop: 20, backgroundColor: '#007bff', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  backButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', marginBottom: 20 },
  matchInfoCard: { backgroundColor: 'white', borderRadius: 10, padding: 16, marginBottom: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3, },
  teamsText: { fontSize: 18, fontWeight: '600', color: '#34495e' },
  vsText: { fontSize: 16, fontWeight: 'bold', color: '#7f8c8d', marginVertical: 5 },
  currentStatusText: { fontSize: 15, color: '#2980b9', marginTop: 10, fontStyle: 'italic' },
  currentProposalText: { fontSize: 14, color: '#555', marginTop: 8, textAlign: 'center', paddingHorizontal: 10 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#34495e', marginTop: 20, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingBottom: 5},
  inputContainer: { backgroundColor: 'white', borderRadius: 10, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, },
  textInput: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, marginBottom: 15, color: '#333'},
  confirmButton: { backgroundColor: '#28a745', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  confirmButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  disabledButton: { backgroundColor: '#adb5bd' },
  chatContainer: { backgroundColor: 'white', borderRadius: 10, height: 350, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, overflow: 'hidden', display:'flex', flexDirection:'column' },
  chatLogScrollView: { flex: 1, padding:10 },
  chatMessage: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, marginBottom: 10, maxWidth: '85%', },
  myMessage: { backgroundColor: '#007bff', alignSelf: 'flex-end' },
  theirMessage: { backgroundColor: '#e9ecef', alignSelf: 'flex-start' },
  myMessageText: { color: 'white' },
  theirMessageText: { color: '#212529' },
  messageSender: { fontSize: 12, fontWeight: 'bold', marginBottom: 3, color: '#555' },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTimestamp: { fontSize: 10, alignSelf: 'flex-end', marginTop: 5, opacity: 0.7 },
  myTimestamp: { color: '#f0f0f0'},
  theirTimestamp: { color: '#6c757d'},
  emptyChatText: { textAlign: 'center', color: '#6c757d', padding: 20, fontStyle: 'italic' },
  chatInputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e0e0e0', padding: 10, backgroundColor: '#f8f9fa'},
  chatTextInput: { flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#ced4da', borderRadius: 20, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 16, marginRight: 10, maxHeight: 100 },
  sendButton: { backgroundColor: '#007bff', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 20 },
  sendButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default CoordinateMatchScreen;
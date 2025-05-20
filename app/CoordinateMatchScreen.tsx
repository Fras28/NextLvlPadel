// app/CoordinateMatchScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, TextInput,
  TouchableOpacity, Alert, Platform, ActivityIndicator
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext'; // Ajusta la ruta si es necesario

const STRAPI_API_URL = process.env.EXPO_PUBLIC_STRAPI_URL || 'https://a1f3-200-127-6-159.ngrok-free.app';

interface ChatMessage {
  sender: string;
  message: string;
  timestamp: string;
}

interface StrapiUserSimple {
  id: number;
}

interface StrapiTeam {
  id: number;
  name: string; // Direct property
  users_permissions_users?: { // Direct property
    data: StrapiUserSimple[];
  };
}
interface StrapiMatchAttributes {
  team_1?: { data?: StrapiTeam };
  team_2?: { data?: StrapiTeam };
  scheduledDate?: string;
  complex?: string;
  estado?: string;
}
interface FetchedMatchDetails {
  id: string;
  attributes: StrapiMatchAttributes;
}

interface MatchDisplayDetails {
  id: string;
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
  const { matchId } = params;
  const { token, user } = useAuth();

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

  const fetchMatchDataFromAPI = useCallback(async () => {
    if (!matchId) { setError("Match ID is missing."); return; }
    if (!token) { setError("Autenticación requerida."); setIsLoading(false); return; }

    setIsLoading(true); setError(null);
    try {
      const populateQuery = 'populate[team_1][populate][users_permissions_users][fields][0]=id&populate[team_2][populate][users_permissions_users][fields][0]=id&populate=team_1.name&populate=team_2.name';
      const response = await fetch(`${STRAPI_API_URL}/api/matches/${matchId}?${populateQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `Failed to fetch match (${response.status})`);
      }
      const result: { data: FetchedMatchDetails } = await response.json();
      const fetchedStrapiData = result.data;

      let identifiedTeam: 1 | 2 | null = null;
      const team1Strapi = fetchedStrapiData.attributes.team_1?.data; // This is StrapiTeam | undefined
      const team2Strapi = fetchedStrapiData.attributes.team_2?.data; // This is StrapiTeam | undefined

      // CORRECTED ACCESS: No .attributes on team1Strapi or team2Strapi here
      if (user && team1Strapi?.users_permissions_users?.data) {
        if (team1Strapi.users_permissions_users.data.some((player: StrapiUserSimple) => player.id === user.id)) {
          identifiedTeam = 1;
        }
      }
      if (!identifiedTeam && user && team2Strapi?.users_permissions_users?.data) {
        if (team2Strapi.users_permissions_users.data.some((player: StrapiUserSimple) => player.id === user.id)) {
          identifiedTeam = 2;
        }
      }
      setUserTeamNumber(identifiedTeam);
      console.log('[CoordinateMatchScreen] User identified as part of Team:', identifiedTeam);

      let initialDate = '';
      let initialTime = '';
      if (fetchedStrapiData.attributes.scheduledDate) {
        const schedDate = new Date(fetchedStrapiData.attributes.scheduledDate);
        initialDate = schedDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        initialTime = schedDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
      }

      const displayDetails: MatchDisplayDetails = {
        id: fetchedStrapiData.id,
        // CORRECTED ACCESS: No .attributes on team1Strapi or team2Strapi here
        team1Name: team1Strapi?.name || 'Equipo 1',
        team2Name: team2Strapi?.name || 'Equipo 2',
        currentProposedDate: initialDate,
        currentProposedTime: initialTime,
        currentProposedComplex: fetchedStrapiData.attributes.complex || '',
        currentStatus: fetchedStrapiData.attributes.estado || 'Por coordinar',
        chat: [],
      };
      setMatchDetails(displayDetails);
      setDate(initialDate);
      setTime(initialTime);
      setComplex(displayDetails.currentProposedComplex);
      setChatLog([]);

    } catch (e: any) {
      setError(e.message); console.error("[CoordinateMatchScreen] Error fetching match details:", e);
    } finally {
      setIsLoading(false);
    }
  }, [matchId, token, user]);

  useEffect(() => {
    fetchMatchDataFromAPI();
  }, [fetchMatchDataFromAPI]);

  const handleSendChatMessage = () => {
    if (chatMessage.trim() === '') return;
    const newMessage: ChatMessage = { sender: user?.username || 'Tú', message: chatMessage, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}) };
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

    const dateParts = date.split('/');
    const timeParts = time.split(':');

    if (dateParts.length !== 3 || timeParts.length !== 2) {
        Alert.alert("Formato Inválido", "Fecha como DD/MM/YYYY y Hora como HH:MM.");
        return;
    }
    
    const day = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const year = parseInt(dateParts[2]);
    const hour = parseInt(timeParts[0]);
    const minute = parseInt(timeParts[1]);

    if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(minute)) {
        Alert.alert("Valores Inválidos", "Fecha y hora deben contener números válidos.");
        return;
    }
    
    const scheduledDateTime = new Date(year, month, day, hour, minute);
    if (isNaN(scheduledDateTime.getTime())) {
        Alert.alert("Fecha Inválida", "La fecha/hora ingresada no es válida.");
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
                        estado: 'Scheduled', 
                    }
                };
                console.log('[CoordinateMatchScreen] Enviando a Strapi:', JSON.stringify(payload, null, 2));
                const response = await fetch(`${STRAPI_API_URL}/api/matches/${matchId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                    body: JSON.stringify(payload),
                });
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error?.message || `Error al actualizar (${response.status})`);
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
        <Stack.Screen options={{ title: 'Coordinar Partido' }} />
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#0ea5e9" /><Text style={styles.loadingText}>Cargando...</Text></View>
      </SafeAreaView>
    );
  }
  if (error && !matchDetails) { 
     return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.loadingContainer}><Text style={styles.errorText}>Error: {error}</Text><TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={styles.backButtonText}>Volver</Text></TouchableOpacity></View>
      </SafeAreaView>
    );
  }
  if (!matchDetails) { 
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Coordinar Partido' }} />
        <View style={styles.loadingContainer}><Text style={styles.loadingText}>Partido no encontrado.</Text><TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={styles.backButtonText}>Volver</Text></TouchableOpacity></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: `Coordinar: ${matchDetails.team1Name} vs ${matchDetails.team2Name}` }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>Coordinación de Partido</Text>
        {error && <Text style={styles.inlineErrorText}>{error}</Text>}

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
          <TouchableOpacity style={[styles.confirmButton, isLoading && styles.disabledButton]} onPress={handleConfirmDetails} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Enviar Propuesta / Confirmar</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Chat de Coordinación</Text>
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
            <TouchableOpacity style={styles.sendButton} onPress={handleSendChatMessage} disabled={!chatMessage.trim()}>
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
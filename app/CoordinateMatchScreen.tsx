// app/CoordinateMatchScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// Interfaz para los mensajes del chat
interface ChatMessage {
  sender: string;
  message: string;
  timestamp: string;
}

// Interfaz para los detalles del partido (fetched from Strapi)
interface StrapiTeam {
  id: number;
  name: string;
  // other team attributes if needed
}
interface StrapiMatchAttributes {
  team1?: { data?: StrapiTeam };
  team2?: { data?: StrapiTeam };
  scheduledDate?: string;
  complex?: string; // Assuming 'complex' is a field in your Strapi 'match'
  estado?: string;
  // any other relevant fields
}
interface FetchedMatchDetails {
  id: string;
  attributes: StrapiMatchAttributes;
}

// Interfaz para el estado local
interface MatchDisplayDetails {
  id: string;
  team1Names: string[];
  team2Names: string[];
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
  const [complex, setComplex] = useState<string>(''); // User input for complex

  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const fetchMatchDataFromAPI = useCallback(async () => {
    if (!matchId) {
      setError("Match ID is missing.");
      return;
    }
    if (!token) { // Check if token exists
      setError("Authentication token is missing. Please log in.");
      setIsLoading(false); // Ensure loading is stopped
      // Optionally, navigate to login: router.replace('/login');
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
      const result: { data: FetchedMatchDetails } = await response.json();
      const fetchedData = result.data;

      const team1Name = fetchedData.attributes.team1?.data?.name || 'Equipo 1';
      const team2Name = fetchedData.attributes.team2?.data?.name || 'Equipo 2';

      let initialDate = '';
      let initialTime = '';
      if (fetchedData.attributes.scheduledDate) {
        const schedDate = new Date(fetchedData.attributes.scheduledDate);
        initialDate = schedDate.toLocaleDateString([], { day: '2-digit', month: 'short' }); // e.g., 25 Mayo
        initialTime = schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) + 'hs'; // e.g., 19:30hs
      }

      const displayDetails: MatchDisplayDetails = {
        id: fetchedData.id,
        // Assuming team names are sufficient for now, adjust if you need player lists
        team1Names: [team1Name],
        team2Names: [team2Name],
        currentProposedDate: initialDate,
        currentProposedTime: initialTime,
        currentProposedComplex: fetchedData.attributes.complex || '', // Assuming 'complex' is a direct attribute
        currentStatus: fetchedData.attributes.estado || 'Por coordinar',
        chat: [], // Chat is local, not fetched in this version
      };
      setMatchDetails(displayDetails);
      setDate(displayDetails.currentProposedDate);
      setTime(displayDetails.currentProposedTime);
      setComplex(displayDetails.currentProposedComplex);
      setChatLog([]); // Reset local chat on fetch

    } catch (e: any) {
      setError(e.message);
      console.error("Error fetching match details:", e);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMatchDataFromAPI();
  }, [fetchMatchDataFromAPI]);


  if (isLoading && !matchDetails) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Coordinar Partido' }} />
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
        <Stack.Screen options={{ title: 'Coordinar Partido' }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Partido no encontrado o ID inválido.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleSendChatMessage = () => {
    if (chatMessage.trim() === '') return;
    const newMessage: ChatMessage = { sender: 'Tú', message: chatMessage, timestamp: 'Ahora' };
    setChatLog((prevLog: ChatMessage[]) => [...prevLog, newMessage]);
    setChatMessage('');
    setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleConfirmDetails = async () => {
    if (!date || !time || !complex) {
      Alert.alert('Campos incompletos', 'Por favor, completa fecha, hora y complejo para confirmar.');
      return;
      
    }
    if (!token) { // Check for token before making the PUT request
      Alert.alert("Error", "Authentication token is missing. Please log in again.");
      return;
    }

    // Basic parsing for date and time (improve as needed for robustness)
    // This is a simplified example. For production, use a date/time picker and proper date objects.
    const dateParts = date.match(/(\d+)\s*(\w+)/); // "25 Mayo" -> ["25 Mayo", "25", "Mayo"]
    const timeParts = time.match(/(\d+):(\d+)/); // "19:30" -> ["19:30", "19", "30"]

    if (!dateParts || !timeParts) {
        Alert.alert("Formato Inválido", "Por favor, usa formatos como '25 Mayo' para fecha y '19:30hs' para hora.");
        return;
    }
    
    const day = parseInt(dateParts[1]);
    const monthStr = dateParts[2];
    const hour = parseInt(timeParts[1]);
    const minute = parseInt(timeParts[2]);

    const monthMap: { [key: string]: number } = {
        "enero": 0, "febrero": 1, "marzo": 2, "abril": 3, "mayo": 4, "junio": 5,
        "julio": 6, "agosto": 7, "septiembre": 8, "octubre": 9, "noviembre": 10, "diciembre": 11
    };
    const month = monthMap[monthStr.toLowerCase()];

    if (month === undefined) {
        Alert.alert("Mes Inválido", `El mes '${monthStr}' no es reconocido.`);
        return;
    }
    
    const currentYear = new Date().getFullYear();
    // Note: Date objects are timezone-sensitive. Strapi expects ISO strings, usually in UTC.
    const scheduledDateTime = new Date(currentYear, month, day, hour, minute);


    Alert.alert(
      'Confirmar Detalles',
      `Fecha: ${date}\nHora: ${time}\nComplejo: ${complex}\n\n¿Enviar esta propuesta/confirmación a Strapi?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar y Enviar', onPress: async () => {
            setIsLoading(true);
            setError(null);
            try {
                const payload = {
                    data: {
                        scheduledDate: scheduledDateTime.toISOString(),
                        // IMPORTANT: 'complex' must be a field in your Strapi 'match' content type schema.
                        // If it's not, remove the next line or add it to Strapi.
                        complex: complex,
                        estado: 'Scheduled', // Or 'PendingConfirmation' depending on your workflow
                    }
                };
                console.log('Enviando a Strapi:', JSON.stringify(payload, null, 2));

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
                    throw new Error(errData.error?.message || `Error al actualizar partido (status ${response.status})`);
                }

                Alert.alert('Propuesta Enviada', 'Los detalles del partido han sido actualizados en el servidor.');
                fetchMatchDataFromAPI(); // Re-fetch to show updated data
                // if(router.canGoBack()) router.back(); // Optionally navigate back
            } catch (e: any) {
                setError(e.message);
                Alert.alert('Error de Envío', e.message);
                console.error("Error sending details to Strapi:", e);
            } finally {
                setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: `Coordinar vs ${matchDetails.team2Names.join(' / ')}` }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>Coordinación de Partido</Text>

        {error && <Text style={styles.inlineErrorText}>{error}</Text>}

        <View style={styles.matchInfoCard}>
          <Text style={styles.teamsText}>{matchDetails.team1Names.join(' / ')}</Text>
          <Text style={styles.vsText}>VS</Text>
          <Text style={styles.teamsText}>{matchDetails.team2Names.join(' / ')}</Text>
          <Text style={styles.currentStatusText}>Estado Actual: {matchDetails.currentStatus}</Text>
        </View>

        <Text style={styles.sectionTitle}>Proponer/Confirmar Detalles</Text>
        <View style={styles.inputContainer}>
          <TextInput style={styles.textInput} placeholder="Fecha (Ej: 25 Mayo)" value={date} onChangeText={setDate} />
          <TextInput style={styles.textInput} placeholder="Hora (Ej: 19:30hs)" value={time} onChangeText={setTime} />
          <TextInput style={styles.textInput} placeholder="Nombre del Complejo" value={complex} onChangeText={setComplex} />
          <TouchableOpacity style={[styles.confirmButton, isLoading && styles.disabledButton]} onPress={handleConfirmDetails} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Proponer / Confirmar Detalles</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Chat de Coordinación (Local)</Text>
        <View style={styles.chatContainer}>
          <ScrollView
            style={styles.chatLogScrollView}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {chatLog.map((msg, index) => (
              <View key={index} style={[styles.chatMessage, msg.sender === 'Tú' ? styles.myMessage : styles.theirMessage]}>
                <Text style={styles.messageSender}>{msg.sender}</Text>
                <Text style={styles.messageText}>{msg.message}</Text>
                <Text style={styles.messageTimestamp}>{msg.timestamp}</Text>
              </View>
            ))}
            {chatLog.length === 0 && (
              <Text style={styles.emptyChatText}>Aún no hay mensajes. ¡Inicia la coordinación!</Text>
            )}
          </ScrollView>
          <View style={styles.chatInputContainer}>
            <TextInput style={styles.chatTextInput} placeholder="Escribe un mensaje..." value={chatMessage} onChangeText={setChatMessage} multiline />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendChatMessage}>
              <Text style={styles.sendButtonText}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    padding: 20,
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
  backButton: {
    marginTop: 20,
    backgroundColor: '#0ea5e9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  matchInfoCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  teamsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  vsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginVertical: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  currentStatusText: {
      fontSize: 14,
      color: '#4b5563',
      marginTop: 8,
      fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  inputContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    elevation: 1,
     shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  confirmButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  chatContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 0,
    height: 300,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    marginBottom: 20,
  },
  chatLogScrollView: {
    flex: 1,
    marginBottom: 8,
  },
  chatMessage: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: '#0284c7',
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: '#e5e7eb',
    alignSelf: 'flex-start',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4b5563', // Their message sender color
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  messageText: { // Default text color for both messages
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#1f2937',
  },
  messageTimestamp: {
    fontSize: 10,
    // color: '#6b7280', // Their message timestamp color
    alignSelf: 'flex-end',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  emptyChatText: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    marginRight: 8,
    maxHeight: 100,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  sendButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});

export default CoordinateMatchScreen;
// app/CoordinateMatchScreen.tsx
import React, { useState, useEffect, useRef } from 'react'; // Import useRef
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

// Interfaz para los mensajes del chat
interface ChatMessage {
  sender: string;
  message: string;
  timestamp: string;
}

// Interfaz para los detalles del partido
interface MatchDetails {
  id: string;
  team1: string[];
  team2: string[];
  proposedDate: string;
  proposedTime: string;
  proposedComplex: string;
  status: string;
  chat: ChatMessage[];
}

// Datos de ejemplo del partido
const getMatchDetails = (matchId: string | string[] | undefined): MatchDetails | null => {
  if (matchId === '1') {
    return {
      id: '1',
      team1: ['Jugador Propio 1', 'Jugador Propio 2 (Tú)'],
      team2: ['Pareja López', 'Pareja García'],
      proposedDate: '',
      proposedTime: '',
      proposedComplex: '',
      status: 'Por coordinar',
      chat: [
        // { sender: 'Pareja López', message: 'Hola! ¿Qué tal el Miércoles a las 19hs en Complejo A?', timestamp: 'Hace 1 hora' },
      ]
    };
  }
  if (matchId === '3') { // Ejemplo para otro partido
     return {
      id: '3',
      team1: ['Jugador Propio 1', 'Jugador Propio 2 (Tú)'],
      team2: ['Pareja Rodriguez', 'Pareja Sosa'],
      proposedDate: '28 Mayo',
      proposedTime: '21:00hs',
      proposedComplex: 'Complejo A',
      status: 'Por coordinar',
      chat: []
    };
  }
  return null;
};

const CoordinateMatchScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  const { matchId } = params;

  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [complex, setComplex] = useState<string>('');
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]); // Inicializar como array vacío tipado

  const scrollViewRef = useRef<ScrollView>(null); // Referencia para el ScrollView del chat

  useEffect(() => {
    const currentMatchDetails = getMatchDetails(matchId);
    setMatch(currentMatchDetails);
    if (currentMatchDetails) {
      setChatLog(currentMatchDetails.chat || []); 
      setDate(currentMatchDetails.proposedDate || '');
      setTime(currentMatchDetails.proposedTime || '');
      setComplex(currentMatchDetails.proposedComplex || '');
    } else {
      setChatLog([]);
      setDate('');
      setTime('');
      setComplex('');
    }
  }, [matchId]);

  if (!match) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Coordinar Partido' }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando detalles del partido o partido no encontrado...</Text>
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
    // Tipar explícitamente prevLog aquí
    setChatLog((prevLog: ChatMessage[]) => [...prevLog, newMessage]);
    setChatMessage('');
    console.log('Mensaje enviado:', newMessage);
    // Scroll al final después de enviar un mensaje
    setTimeout(() => { // setTimeout para asegurar que el render haya ocurrido
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleConfirmDetails = () => {
    if (!date || !time || !complex) {
      Alert.alert('Campos incompletos', 'Por favor, completa fecha, hora y complejo para confirmar.');
      return;
    }
    Alert.alert(
      'Confirmar Detalles', 
      `Fecha: ${date}\nHora: ${time}\nComplejo: ${complex}\n\n¿Enviar esta propuesta/confirmación?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => {
            console.log('Detalles confirmados/propuestos:', { matchId: match.id, date, time, complex });
            Alert.alert('Propuesta Enviada', 'Se ha notificado a la otra pareja. Espera su confirmación.');
            if(router.canGoBack()) router.back();
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: `Coordinar vs ${match.team2 ? match.team2.join(' / ') : 'Oponente'}` }} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>Coordinación de Partido</Text>
        
        <View style={styles.matchInfoCard}>
          <Text style={styles.teamsText}>{match.team1.join(' / ')}</Text>
          <Text style={styles.vsText}>VS</Text>
          <Text style={styles.teamsText}>{match.team2.join(' / ')}</Text>
        </View>

        <Text style={styles.sectionTitle}>Proponer/Confirmar Detalles</Text>
        <View style={styles.inputContainer}>
          <TextInput style={styles.textInput} placeholder="Fecha (Ej: 25 Mayo)" value={date} onChangeText={setDate} />
          <TextInput style={styles.textInput} placeholder="Hora (Ej: 19:30hs)" value={time} onChangeText={setTime} />
          <TextInput style={styles.textInput} placeholder="Nombre del Complejo" value={complex} onChangeText={setComplex} />
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmDetails}>
            <Text style={styles.confirmButtonText}>Proponer / Confirmar Detalles</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Chat de Coordinación</Text>
        <View style={styles.chatContainer}>
          <ScrollView 
            style={styles.chatLogScrollView} 
            ref={scrollViewRef} // Usar la referencia
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

// Los estilos deben permanecer igual que en la versión anterior del Canvas expo_router_coordinate_match_screen
// Asegúrate de que la definición completa de 'styles' esté aquí.
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
  loadingText: { // Estilo para el texto de carga
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
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
    color: '#4b5563', 
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', 
  },
  messageText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#1f2937', 
  },
  messageTimestamp: {
    fontSize: 10,
    color: '#6b7280', 
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

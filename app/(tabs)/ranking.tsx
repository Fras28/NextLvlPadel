// app/(tabs)/ranking.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, Platform,
    ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
// Asegúrate de importar PlayerStat, Category y Team si no lo hiciste ya en AuthContext
import { useAuth, User, PlayerStat, Category, Team as TeamInterface } from '../../context/AuthContext';

const STRAPI_BACKEND_URL = process.env.EXPO_PUBLIC_STRAPI_URL || 'https://6544-200-127-6-159.ngrok-free.app ';

export interface RankingEntry {
  id: number | string;
  position: number;
  name: string;
  points: number;
  wins?: number; // <--- NUEVO CAMPO: Partidos Ganados
  players?: string[];
  categoryName?: string;
}

export interface RankingData {
  [categoryName: string]: RankingEntry[];
}

type RankingViewType = 'team' | 'individual';

const RankingScreen = () => {
  const { token, user: loggedInUser } = useAuth();
  const [currentView, setCurrentView] = useState<RankingViewType>('individual');
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const processFetchedData = (
    allUsers: User[],
    viewType: RankingViewType
  ): RankingData => {
    const groupedData: RankingData = {};

    if (viewType === 'individual') {
      const validPlayerStats = allUsers
        .filter(u => u.player_stat && typeof u.player_stat.categoryPoints === 'number' && u.category)
        .map(u => ({
          user: u,
          playerStat: u.player_stat!,
          category: u.category!,
        }));
      
      validPlayerStats.forEach(item => {
        const categoryName = item.category.name || 'Sin Categoría';
        if (!groupedData[categoryName]) {
          groupedData[categoryName] = [];
        }
        groupedData[categoryName].push({
          id: item.user.id,
          name: item.user.name || item.user.username,
          points: item.playerStat.categoryPoints!,
          wins: item.playerStat.wins || 0, // <--- AÑADIR WINS PARA INDIVIDUAL
          position: 0,
          categoryName: categoryName,
        });
      });

    } else { // viewType === 'team'
      const teamsMap = new Map<number, RankingEntry & { originalCategoryName?: string }>();

      allUsers.forEach(u => {
        if (u.teams && Array.isArray(u.teams)) {
          u.teams.forEach((team: TeamInterface) => {
            const teamId = team.id;
            const teamCategory = team.category;
            const teamStat = team.team_stats;

            if (team.name && teamCategory?.name && teamStat && typeof teamStat.categoryPoints === 'number') {
              if (!teamsMap.has(teamId)) {
                teamsMap.set(teamId, {
                  id: teamId,
                  name: team.name,
                  points: teamStat.categoryPoints,
                  wins: teamStat.wins || 0, // <--- AÑADIR WINS PARA EQUIPO
                  players: [],
                  position: 0,
                  categoryName: teamCategory.name,
                  originalCategoryName: teamCategory.name,
                });
              }
              const teamEntry = teamsMap.get(teamId)!;
              const playerName = u.name || u.username;
              if (teamEntry.players && !teamEntry.players.includes(playerName)) {
                teamEntry.players.push(playerName);
              }
            }
          });
        }
      });

      teamsMap.forEach(teamEntry => {
        const categoryName = teamEntry.originalCategoryName || 'Sin Categoría';
        if (!groupedData[categoryName]) {
          groupedData[categoryName] = [];
        }
        const { originalCategoryName: _o, ...teamDataForRanking } = teamEntry;
        groupedData[categoryName].push(teamDataForRanking);
      });
    }

    for (const categoryName in groupedData) {
      groupedData[categoryName].sort((a, b) => b.points - a.points);
      groupedData[categoryName].forEach((entry, index) => {
        entry.position = index + 1;
      });
    }
    return groupedData;
  };

  const fetchData = useCallback(async () => {
    if (!loggedInUser?.category?.name && currentView === 'team') {
        // console.warn("[RankingScreen] Categoría del usuario no disponible...");
    }
    setIsLoading(true);
    setError(null);
    setRankingData(null); 

    const populateUserFields = `fields[0]=username&fields[1]=name&fields[2]=email`;
    // Asegúrate que player_stat y team_stats populan el campo 'wins'
    const populatePlayerStat = `populate[player_stat]=*`; 
    const populateUserCategory = `populate[category][fields][0]=name`;
    const populateTeams = `populate[teams][populate][team_stats]=*&populate[teams][populate][category][fields][0]=name&populate[teams][populate][users_permissions_users][fields][0]=username&populate[teams][populate][users_permissions_users][fields][1]=name`;
    
    const endpoint = `/api/users?${populateUserFields}&${populatePlayerStat}&${populateUserCategory}&${populateTeams}`;
    const fullUrl = `${STRAPI_BACKEND_URL}${endpoint}`;
    // console.log(`[RankingScreen] Fetching ALL users data from: ${fullUrl}`);

    try {
      const response = await fetch(fullUrl, {
        headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) },
      });
      const allUsersData = await response.json();

      if (!response.ok) {
        throw new Error(allUsersData.error?.message || `Error al cargar datos para el ranking.`);
      }
      if (!Array.isArray(allUsersData)) {
        throw new Error("Formato de datos de usuarios inesperado del servidor.");
      }
      
      const processedData = processFetchedData(allUsersData as User[], currentView);
      setRankingData(processedData);
    } catch (e: any) {
      setError(e.message || 'No se pudo conectar al servidor.');
      setRankingData(null);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token, currentView, loggedInUser?.category?.name]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const nameHeaderText = currentView === 'team' ? 'Equipo' : 'Jugador';

  const renderContent = () => {
    if (isLoading && !refreshing && !rankingData) {
      return <ActivityIndicator size="large" color="#0284c7" style={styles.loader} />;
    }
    if (error) {
      return <Text style={styles.errorText}>Error: {error}</Text>;
    }
    if (!rankingData || Object.keys(rankingData).length === 0) {
      return <Text style={styles.emptyRankingText}>No hay datos de ranking disponibles.</Text>;
    }

    const sortedCategories = Object.keys(rankingData).sort((a, b) => {
        const levelA = parseInt(a.match(/\d+/)?.[0] || '99');
        const levelB = parseInt(b.match(/\d+/)?.[0] || '99');
        return levelA - levelB;
    });

    return sortedCategories.map((category) => (
      <View key={category} style={styles.categorySection}>
        <Text style={styles.categoryTitle}>{category}</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.positionCell]}>Pos.</Text>
          <Text style={[styles.headerCell, styles.nameCell]}>{nameHeaderText}</Text>
          <Text style={[styles.headerCell, styles.winsCell]}>PG</Text> {/* <--- NUEVA CABECERA */}
          <Text style={[styles.headerCell, styles.pointsCell]}>Puntos</Text>
        </View>
        {rankingData[category] && rankingData[category].length > 0 ? (
          rankingData[category].map((entry) => (
            <View key={entry.id} style={styles.tableRow}>
              <Text style={[styles.rowCell, styles.positionCell]}>{entry.position}</Text>
              <View style={styles.nameContainerCell}>
                <Text style={[styles.rowCell, styles.nameText]} numberOfLines={1} ellipsizeMode="tail">{entry.name}</Text>
                {currentView === 'team' && entry.players && entry.players.length > 0 && (
                  <Text style={styles.teamPlayersText} numberOfLines={1} ellipsizeMode="tail">({entry.players.join(' / ')})</Text>
                )}
              </View>
              <Text style={[styles.rowCell, styles.winsCell]}>{entry.wins}</Text> {/* <--- NUEVA CELDA DE DATOS */}
              <Text style={[styles.rowCell, styles.pointsCell]}>{entry.points}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyRankingText}>No hay {currentView === 'team' ? 'equipos' : 'jugadores'} rankeados en esta categoría.</Text>
        )}
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollViewContainer}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0284c7"]} tintColor={"#0284c7"}/> }
      >
        <View style={styles.viewSwitcherContainer}>
          <TouchableOpacity
            style={[styles.switcherButton, currentView === 'individual' ? styles.switcherButtonActive : {}]}
            onPress={() => setCurrentView('individual')}
            disabled={isLoading}
          >
            <Text style={[styles.switcherButtonText, currentView === 'individual' ? styles.switcherButtonTextActive : {}]}>Individual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switcherButton, currentView === 'team' ? styles.switcherButtonActive : {}]}
            onPress={() => setCurrentView('team')}
            disabled={isLoading}
          >
            <Text style={[styles.switcherButtonText, currentView === 'team' ? styles.switcherButtonTextActive : {}]}>Equipos</Text>
          </TouchableOpacity>
        </View>
        {renderContent()}
        <Text style={styles.footerText}>El ranking se actualiza según los partidos registrados.</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  scrollViewContainer: { flex: 1 },
  container: { paddingVertical: 20, paddingHorizontal: Platform.OS === 'web' ? 32 : 16 },
  loader: { marginTop: 50, alignSelf: 'center' },
  errorText: { textAlign: 'center', paddingVertical: 20, color: '#ef4444', fontSize: 16 },
  viewSwitcherContainer: {
    flexDirection: 'row', justifyContent: 'center', marginBottom: 24,
    backgroundColor: 'rgba(229, 231, 235, 0.8)', borderRadius: 8, padding: 4,
    alignSelf: 'center', maxWidth: 350,
  },
  switcherButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center', marginHorizontal: 2 },
  switcherButtonActive: {
    backgroundColor: 'white', shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 3,
  },
  switcherButtonText: { fontSize: 14, fontWeight: '600', color: '#4b5563' },
  switcherButtonTextActive: { color: '#0284c7' },
  categorySection: {
    marginBottom: 28, backgroundColor: 'rgba(255,255,255,0.92)', 
    borderRadius: 12, padding: Platform.OS === 'web' ? 20 : 16, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  categoryTitle: {
    fontSize: 20, fontWeight: '600', color: '#0284c7', marginBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(229, 231, 235, 0.7)', paddingBottom: 10,
  },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: 'rgba(209, 213, 219, 0.7)', paddingBottom: 10, marginBottom: 8 },
  headerCell: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(243, 244, 246, 0.7)', alignItems: 'center' },
  rowCell: { fontSize: 15, color: '#1f2937' },
  
  // Ajuste de Flex para las columnas
  positionCell: { flex: 0.12, textAlign: 'center', fontWeight: '500' }, // Pos.
  nameContainerCell: { flex: 0.48, flexDirection: 'column' },             // Nombre/Equipo (contenedor)
  nameCell: { flex: 0.48 },                                              // Nombre (solo para cabecera si es individual)
  winsCell: { flex: 0.15, textAlign: 'center', fontWeight: '500' },    // PG (Partidos Ganados)
  pointsCell: { flex: 0.25, textAlign: 'right', fontWeight: '600' },   // Puntos

  nameText: {},
  teamPlayersText: { fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginTop: 2 },
  emptyRankingText: { textAlign: 'center', paddingVertical: 20, color: '#4b5563', fontStyle: 'italic', fontSize: 15 },
  footerText: {
    fontSize: 13, color: Platform.OS === 'web' ? '#6b7280' : '#E0E0E0', textAlign: 'center',
    marginTop: 24, paddingBottom: Platform.OS === 'web' ? 20 : 30, // Ajuste para web
    textShadowColor: Platform.OS === 'web' ? undefined :'rgba(0, 0, 0, 0.5)',
    textShadowOffset: Platform.OS === 'web' ? undefined : {width: 0, height: 1},
    textShadowRadius: Platform.OS === 'web' ? undefined : 1,
  }
});

export default RankingScreen;
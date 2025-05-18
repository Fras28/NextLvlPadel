// app/(tabs)/rules.tsx (o la ruta que prefieras para tu nueva pantalla)
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, ScrollView } from 'react-native';

const RulesScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollViewContainer}>
        <View style={styles.container}>
          <Text style={styles.mainTitle}>Sistema de Juego y Ranking</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sistema de Puntos</Text>
            <Text style={styles.paragraph}>
              El ranking se actualiza en tiempo real después de cada partido registrado en la aplicación.
            </Text>
            <Text style={styles.paragraph}>
              El sistema de puntos se basa en los resultados de los partidos y el diferencial de juegos obtenidos. Cada victoria suma puntos, y la cantidad puede variar según la categoría y la diferencia de nivel con el oponente (aunque los detalles específicos de la fórmula de puntos no están en el documento, esta es la base general).
            </Text>
            <Text style={styles.listItem}>
              • <Text style={styles.bold}>Registro de Resultados:</Text> Ambos equipos deben registrar el resultado en la app. Si solo un equipo lo hace y no hay reclamo en 3 días, el resultado se valida automáticamente.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sistema de Ascensos y Descensos</Text>
            <Text style={styles.paragraph}>
              Los ascensos y descensos de categoría se definen cada 3 meses mediante un sistema de playoffs.
            </Text>
            <Text style={styles.subHeader}>Playoffs Trimestrales:</Text>
            <Text style={styles.listItem}>
              • Las <Text style={styles.bold}>dos mejores parejas</Text> de cada categoría (excepto la 1ra) se enfrentan a las <Text style={styles.bold}>dos últimas parejas</Text> de la categoría inmediatamente superior.
            </Text>
            <Text style={styles.listItem}>
              • Estos enfrentamientos son partidos a <Text style={styles.bold}>eliminación directa</Text>.
            </Text>
            <Text style={styles.listItem}>
              • Los ganadores de estos partidos de playoff ascienden a la categoría superior, mientras que los perdedores permanecen o descienden (según corresponda).
            </Text>
            <Text style={styles.paragraph}>
              Este sistema busca asegurar una competencia equilibrada y motivar a los jugadores a mejorar constantemente para ascender de categoría.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <Text style={styles.paragraph}>
              Existen 7 categorías en la liga:
            </Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>1ra Categoría:</Text> Nivel élite.</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>2da a 6ta Categoría:</Text> Niveles intermedios.</Text>
            <Text style={styles.listItem}>• <Text style={styles.bold}>7ma Categoría:</Text> Nivel principiantes.</Text>
            <Text style={styles.paragraph}>
              Al registrarse, se realiza una asignación inicial de categoría basada en el nivel aproximado del jugador/pareja.
            </Text>
          </View>

           <View style={styles.section}>
            <Text style={styles.sectionTitle}>Partidos</Text>
            <Text style={styles.listItem}>
              • <Text style={styles.bold}>Emparejamientos:</Text> El sistema asigna rivales del mismo nivel quincenalmente. Los jugadores son notificados vía app.
            </Text>
            <Text style={styles.listItem}>
              • <Text style={styles.bold}>Coordinación:</Text> Los jugadores tienen un plazo de 3 días para acordar día, hora y sede del partido.
            </Text>
            <Text style={styles.listItem}>
              • <Text style={styles.bold}>Flexibilidad:</Text> Libertad para elegir cualquier complejo que cumpla con los estándares básicos.
            </Text>
          </View>

          <Text style={styles.footerText}>
            Esta información está basada en el sistema de la Liga de Pádel Bahiense. Para detalles más específicos o actualizaciones, consulta los comunicados oficiales en la app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6', // bg-gray-100
  },
  scrollViewContainer: {
    flex: 1,
  },
  container: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 28,
    color: '#1f2937', // text-gray-800
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0284c7', // text-sky-600 (tu azul principal)
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb', // border-gray-200
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  subHeader: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937', // text-gray-800
    marginTop: 8,
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151', // text-gray-700
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  listItem: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151', // text-gray-700
    marginBottom: 8,
    paddingLeft: 4, // Para alinear con el bullet imaginario
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  bold: {
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 13,
    color: '#6b7280', // text-gray-500
    textAlign: 'center',
    marginTop: 16,
    paddingBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  }
});

export default RulesScreen;
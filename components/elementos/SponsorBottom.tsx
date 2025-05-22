// components\elementos\SponsorBottom.tsx
import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ImageSourcePropType,
  Platform, // Platform puede no ser necesario aquí si no hay estilos específicos de plataforma
} from 'react-native';

// Constante para el color, similar al que usas en tus otras pantallas
const FLUORESCENT_YELLOW = '#DFFF00';

// Dimensiones por defecto para las imágenes de los sponsors
const DEFAULT_SPONSOR_IMAGE_HEIGHT = 30;
const DEFAULT_SPONSOR_IMAGE_WIDTH = 100;

// Interfaz para definir la estructura de un objeto Sponsor
// Esta interfaz es utilizada internamente por el componente
export interface Sponsor {
  id: string;
  image: ImageSourcePropType;
  name?: string;
}

// LISTA INTERNA DE SPONSORS
// Estos son los patrocinadores que se mostrarán siempre.
// Asegúrate de que las rutas 'require' sean correctas desde la ubicación de este archivo.
// Si SponsorBottom.tsx está en 'app/components/', y tus imágenes en 'assets/images/' (en la raíz del proyecto),
// la ruta '../../assets/images/' debería ser correcta.
const INTERNAL_SPONSOR_LOGOS: Sponsor[] = [
  { id: 'sponsor1', image: require('../../assets/images/VairoSponsor.png'), name: 'Vairo' },
  { id: 'sponsor2', image: require('../../assets/images/3M.png'), name: '3M' },
  { id: 'sponsor3', image: require('../../assets/images/HeadLogo.png'), name: 'Head' },
  { id: 'sponsor4', image: require('../../assets/images/AsicsLogo.png'), name: 'Asics' },
  { id: 'sponsor5', image: require('../../assets/images/PumaLogo.png'), name: 'Puma' },
  { id: 'sponsor6', image: require('../../assets/images/Joma.png'), name: 'Joma' },
  { id: 'sponsor7', image: require('../../assets/images/RedBull.png'), name: 'Red Bull' },
  // Añade o quita sponsors aquí según sea necesario
];

// Interfaz para definir las props que aceptará el componente SponsorBottom
// La prop 'sponsors' ha sido eliminada.
interface SponsorBottomProps {
  imageHeight?: number;
  imageWidth?: number;
  backgroundColor?: string;
  borderColor?: string;
  title?: string; // Prop opcional para personalizar el título
}

const SponsorBottom: React.FC<SponsorBottomProps> = ({
  imageHeight = DEFAULT_SPONSOR_IMAGE_HEIGHT,
  imageWidth = DEFAULT_SPONSOR_IMAGE_WIDTH,
  backgroundColor = 'rgba(0,0,0,0.6)',
  borderColor = FLUORESCENT_YELLOW,
  title = 'Nuestros Sponsors', // Título por defecto
}) => {
  // Usamos la lista interna de sponsors
  const sponsorsToDisplay = INTERNAL_SPONSOR_LOGOS;

  // Si no hay sponsors (aunque ahora están definidos internamente, es una buena práctica mantener la verificación)
  if (!sponsorsToDisplay || sponsorsToDisplay.length === 0) {
    // Podrías mostrar un mensaje o simplemente no renderizar nada
    return <Text style={styles.errorText}>No hay sponsors para mostrar.</Text>;
  }

  const sponsorImageStyle = {
    height: imageHeight,
    width: imageWidth,
    resizeMode: 'contain' as 'contain',
    margin: 5,
  };

  return (
    <View style={[styles.sponsorGridOuterContainer, { backgroundColor: backgroundColor, borderTopColor: borderColor }]}>
      <Text style={styles.sponsorTitle}>{title}</Text>
      <View style={styles.sponsorGridInnerContainer}>
        {sponsorsToDisplay.map((sponsor) => (
          <View key={sponsor.id} style={styles.sponsorGridItem}>
            <Image source={sponsor.image} style={sponsorImageStyle} />
            {/* Opcionalmente, podrías mostrar sponsor.name si lo deseas */}
            {/* <Text style={styles.sponsorNameText}>{sponsor.name}</Text> */}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sponsorGridOuterContainer: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderTopWidth: 2,
    borderRadius: 10,
  },
  sponsorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 3,
  },
  sponsorGridInnerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sponsorGridItem: {
    // alignItems: 'center', // Si decides mostrar nombres debajo de las imágenes
  },
  // sponsorNameText: { // Estilo para el nombre del sponsor si decides mostrarlo
  //   color: 'white',
  //   fontSize: 10,
  //   marginTop: 2,
  // },
  errorText: { // Estilo para un mensaje de error o si no hay sponsors
    color: 'yellow',
    textAlign: 'center',
    padding: 10,
  }
});

export default SponsorBottom;
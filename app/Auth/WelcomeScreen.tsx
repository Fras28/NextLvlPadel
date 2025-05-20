import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Platform,
  Image,
  Animated,
  Easing,
  Dimensions,
  ImageSourcePropType,
  AppState,
  ImageBackground,
} from "react-native";
import { Link } from "expo-router";

interface Player {
  id: string;
  name: string;
  image?: ImageSourcePropType;
}
const FIRST_CATEGORY_PLAYERS: Player[] = [
  { id: "1", name: "Selvarolo" },
  { id: "2", name: "Tanoni" },
  { id: "3", name: "Caspanelo" },
  { id: "4", name: "Padin" },
  { id: "5", name: "Schmidt" },
  { id: "6", name: "Figueroa" },
  { id: "7", name: "Bustos" },
  { id: "8", name: "Gamio" },
  { id: "9", name: "Jacob" },
  { id: "10", name: "Rivas" },
];
const FLUORESCENT_YELLOW = "#DFFF00";
interface Sponsor {
  id: string;
  image: ImageSourcePropType;
  name?: string;
}
const SPONSOR_LOGOS: Sponsor[] = [
  {
    id: "sponsor1",
    image: require("../../assets/images/VairoSponsor.png"),
    name: "Sponsor 1",
  },
  {
    id: "sponsor2",
    image: require("../../assets/images/3M.png"),
    name: "Sponsor 2",
  },
  {
    id: "sponsor3",
    image: require("../../assets/images/HeadLogo.png"),
    name: "Sponsor 3",
  },
  {
    id: "sponsor4",
    image: require("../../assets/images/AsicsLogo.png"),
    name: "Sponsor 4",
  },
  {
    id: "sponsor5",
    image: require("../../assets/images/PumaLogo.png"),
    name: "Sponsor 5",
  },
  {
    id: "sponsor6",
    image: require("../../assets/images/Joma.png"),
    name: "Sponsor 6",
  },
];
const SPONSOR_IMAGE_HEIGHT = 30;
const SPONSOR_IMAGE_WIDTH = 100;

const LogoPlaceholder = () => (
  <View>
    {" "}
    <Image
      source={require("../../assets/images/LogoPadel.png")}
      style={styles.logoImage}
      resizeMode="contain"
    />{" "}
  </View>
);

interface PlayerMarqueeProps {
  players: Player[];
  speed?: number;
}

const PlayerMarquee: React.FC<PlayerMarqueeProps> = ({
  players,
  speed = 40,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [actualContentWidth, setActualContentWidth] = useState(0);
  const [isMeasured, setIsMeasured] = useState(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      animationRef.current?.stop();
    };
  }, []);

  const playerDisplayItems = useMemo(
    () =>
      players.map((player: Player) => {
        const originalPlayerIndex = FIRST_CATEGORY_PLAYERS.findIndex(
          (p: Player) => p.id === player.id
        );
        const displayIndex =
          originalPlayerIndex !== -1
            ? originalPlayerIndex
            : players.findIndex((p: Player) => p.id === player.id);
        return `${displayIndex + 1}#${player.name}`;
      }),
    [players]
  );
  const itemsToMeasure: string[] = playerDisplayItems;
  const itemsToAnimate: string[] = useMemo(
    () =>
      isMeasured && actualContentWidth > 0
        ? [...playerDisplayItems, ...playerDisplayItems]
        : [],
    [isMeasured, playerDisplayItems, actualContentWidth]
  );

  useEffect(() => {
    animationRef.current?.stop();
    if (isMeasured && actualContentWidth > 0 && itemsToAnimate.length > 0) {
      animatedValue.setValue(0);
      const duration = (actualContentWidth / speed) * 1000;
      animationRef.current = Animated.loop(
        Animated.timing(animatedValue, {
          toValue: -actualContentWidth,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      animationRef.current.start();
    }
    return () => animationRef.current?.stop();
  }, [isMeasured, actualContentWidth, speed, animatedValue, itemsToAnimate]);
  const handleLayoutMeasure = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      if (!isMountedRef.current) return;
      const measuredWidth = event.nativeEvent.layout.width;
      if (!isMeasured && measuredWidth > 0) {
        setActualContentWidth(measuredWidth);
        setIsMeasured(true);
      }
    },
    [isMeasured]
  );
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (!isMountedRef.current || !animationRef.current) return;
      if (
        nextAppState === "active" &&
        isMeasured &&
        actualContentWidth > 0 &&
        itemsToAnimate.length > 0
      ) {
        animationRef.current.start();
      } else {
        animationRef.current.stop();
      }
    };
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [isMeasured, actualContentWidth, animatedValue, itemsToAnimate]);

  if (!players || players.length === 0) return null;

  return (
    <View style={styles.carouselOuterContainer}>
      {" "}
      {!isMeasured && (
        <View style={styles.measureContainer} onLayout={handleLayoutMeasure}>
          {" "}
          {itemsToMeasure.map((text: string, index: number) => (
            <Text
              key={`measure-player-${index}`}
              style={styles.carouselItemText}
              numberOfLines={1}
            >
              {" "}
              {text}{" "}
              {index < itemsToMeasure.length - 1 ? (
                <Text style={styles.separator}> | </Text>
              ) : null}{" "}
            </Text>
          ))}{" "}
        </View>
      )}{" "}
      {isMeasured && actualContentWidth > 0 && itemsToAnimate.length > 0 && (
        <Animated.View
          style={[
            styles.marqueeContainer,
            { transform: [{ translateX: animatedValue }] },
          ]}
        >
          {" "}
          {itemsToAnimate.map((text: string, index: number) => (
            <Text
              key={`marquee-player-${index}`}
              style={styles.carouselItemText}
              numberOfLines={1}
            >
              {" "}
              {text}{" "}
              {index < itemsToAnimate.length - 1 &&
              playerDisplayItems.length > 0 ? (
                <Text style={styles.separator}> | </Text>
              ) : null}{" "}
            </Text>
          ))}{" "}
        </Animated.View>
      )}{" "}
      {isMeasured && actualContentWidth === 0 && itemsToMeasure.length > 0 && (
        <Text style={styles.errorText}>Error al medir contenido.</Text>
      )}{" "}
    </View>
  );
};

interface SponsorGridProps {
  sponsors: Sponsor[];
  imageHeight?: number;
  imageWidth?: number;
}
const SponsorGrid: React.FC<SponsorGridProps> = ({
  sponsors,
  imageHeight = SPONSOR_IMAGE_HEIGHT,
  imageWidth = SPONSOR_IMAGE_WIDTH,
}) => {
  if (!sponsors || sponsors.length === 0) {
    return null;
  }
  const sponsorImageStyle = {
    height: imageHeight,
    width: imageWidth,
    resizeMode: "contain" as "contain",
    margin: 5,
  };
  return (
    <View style={styles.sponsorGridContainer}>
      {" "}
      {sponsors.map((sponsor: Sponsor) => (
        <View key={sponsor.id} style={styles.sponsorGridItem}>
          {" "}
          <Image source={sponsor.image} style={sponsorImageStyle} />{" "}
        </View>
      ))}{" "}
    </View>
  );
};

const WelcomeScreen = () => {
  return (
    <SafeAreaView style={styles.safeAreaOuter}>
      <ImageBackground
        source={require("../../assets/images/BackApp.jpg")}
        style={styles.backgroundImageContainer}
        resizeMode="cover"
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <PlayerMarquee players={FIRST_CATEGORY_PLAYERS} speed={50} />

        <View style={styles.mainContentContainer}>
          <LogoPlaceholder />
          <Text style={styles.title}>Liga de Pádel Bahiense</Text>
          <Text style={styles.subtitle}>
            Organiza, compite y conecta con la comunidad de pádel.
          </Text>

   
          <Link href="/Auth/RegisterScreen" asChild>
            <TouchableOpacity style={styles.buttonTouchable}>
              <Text style={styles.buttonTextRegister}>Registrarse</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/Auth/LoginScreen" asChild>
            <TouchableOpacity style={styles.buttonTouchable}>
              <Text style={styles.buttonTextLogin}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </Link>
          <Text style={styles.versionText}>Versión MVP 0.1</Text>
        </View>

        <SponsorGrid sponsors={SPONSOR_LOGOS} />
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaOuter: { flex: 1 },
  backgroundImageContainer: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  carouselOuterContainer: {
    height: 60,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    borderTopWidth: 2.5,
    borderBottomWidth: 2.5,
    borderTopColor: FLUORESCENT_YELLOW,
    borderBottomColor: FLUORESCENT_YELLOW,
    overflow: "hidden",
  },
  carouselItemText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    paddingHorizontal: 8,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 3,
  },
  separator: {
    color: FLUORESCENT_YELLOW,
    fontSize: 16,
    fontWeight: "bold",
    paddingHorizontal: 4,
  },
  measureContainer: {
    flexDirection: "row",
    alignItems: "center",
    opacity: 0,
    position: "absolute",
  },
  marqueeContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
  },
  sponsorGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderTopWidth: 2,
    borderTopColor: FLUORESCENT_YELLOW,
  },
  sponsorGridItem: {

  },
  mainContentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  logoImage: { width: 150, height: 150, marginBottom: 20 },
  title: {
    fontSize: Platform.OS === "ios" ? 36 : 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 18,
    color: "#e0f2fe",
    marginBottom: 48,
    textAlign: "center",
    paddingHorizontal: 16,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 3,
  },


  buttonTouchable: {
    marginBottom: 16, 
    alignItems: "center", 
  },


  buttonTextRegister: {
    color: "#075985",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
    backgroundColor: "#facc15",
    padding: 8, 
    borderRadius: 8,
    borderColor: "#0369A1",
    borderWidth: 1,
    width: 150, 
    overflow: "hidden", 
  },
  buttonTextLogin: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
    backgroundColor: "#0369A1",
    padding: 8,
    borderRadius: 8,
    borderColor: "#facc15",
    borderWidth: 1,
    width: 150, 
    overflow: "hidden", 
  },
  versionText: {
    color: "#bae6fd",
    fontSize: 12,
    position: "absolute",
    bottom: 20,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    alignSelf: "center",
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 4,
  },
});

export default WelcomeScreen;

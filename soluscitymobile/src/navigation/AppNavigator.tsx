import React, { useEffect, useRef, useState } from "react";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, Crosshair, Swords, Dumbbell, MoreHorizontal, ShoppingBag, Trophy, User, ChevronRight } from "lucide-react-native";

import { TOKEN_KEY, setNavigateToLogin } from "../api/client";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import ShopScreen from "../screens/ShopScreen";
import TargetsScreen from "../screens/TargetsScreen";
import BattleResultScreen from "../screens/BattleResultScreen";
import LeaderboardScreen from "../screens/LeaderboardScreen";
import GymScreen from "../screens/GymScreen";
import CrimesScreen from "../screens/CrimesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AttackLogsScreen from "../screens/AttackLogsScreen";
import SyndicatesScreen from "../screens/SyndicatesScreen";
import LoadingSpinner from "../components/LoadingSpinner";

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  BattleResult: { result: BattleResult };
};

export type MainTabParamList = {
  Home: undefined;
  Crimes: undefined;
  Targets: undefined;
  Gym: undefined;
  More: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Shop: undefined;
  Leaderboard: undefined;
  Profile: undefined;
  AttackLogs: undefined;
  Syndicates: undefined;
};

export interface BattleResult {
  battleId: string;
  result: "win" | "loss";
  outcomeType?: "win" | "loss" | "evaded";
  opponent: {
    id: string;
    type: "player" | "npc";
    name: string;
    level: number;
  };
  win: boolean;
  loot: number;
  rpChange: number;
  xpGained: number;
  attackerAP: number;
  defenderDP: number;
  pWin: number;
  roll: number;
  criticalHit?: boolean;
  evadeChance?: number;
  evadeRoll?: number;
  critChance?: number;
  critRoll?: number;
  damageDealt: number;
  damageTaken: number;
  hospitalizedTarget?: boolean;
  hospitalizedSelf?: boolean;
  eventTimestamp?: string;
  attackerHospitalized: boolean;
  defenderHospitalized: boolean;
  updatedProfile: {
    cash: number;
    rp: number;
    energy: number;
    health: number;
    maxHealth: number;
    level: number;
    xp: number;
    ap: number;
    dp: number;
  };
}

export interface Profile {
  wallet: string;
  name: string;
  cash: number;
  rp: number;
  level: number;
  xp: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  nerve: number;
  maxNerve: number;
  happiness: number;
  maxHappiness: number;
  ap: number;
  dp: number;
  strength: number;
  speed: number;
  defense: number;
  dexterity: number;
  shieldUntil: string;
  hospitalUntil: string;
  inHospital: boolean;
  incomePerHour: number;
  nextEnergyAt: string;
  nextNerveAt: string;
  statBreakdown?: {
    baseStats: { strength: number; speed: number; defense: number; dexterity: number; ap: number; dp: number };
    itemBonuses: { atk: number; def: number; speed: number; dex: number; ap: number; dp: number };
    totalStats: { strength: number; speed: number; defense: number; dexterity: number; ap: number; dp: number };
  };
  syndicate?: {
    id: string;
    name: string;
    role: string;
    buffType: string;
    buffValue: number;
  } | null;
}

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

const DARK = "#0a0a0a";
const TAB_BG = "#111";
const ACCENT = "#9945FF";
const TEXT_DIM = "#555";

const TAB_ICONS: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
  Home,
  Crimes: Crosshair,
  Targets: Swords,
  Gym: Dumbbell,
  More: MoreHorizontal,
};

function MoreStackScreen() {
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: DARK },
        headerTintColor: "#eee",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <MoreStack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ title: "More" }} />
      <MoreStack.Screen name="Shop" component={ShopScreen} />
      <MoreStack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <MoreStack.Screen name="Profile" component={ProfileScreen} />
      <MoreStack.Screen
        name="AttackLogs"
        component={AttackLogsScreen}
        options={({ navigation }) => ({
          title: "Attack Logs",
          headerLeft: () => (
            <Pressable
              style={({ pressed }) => [{ paddingHorizontal: 8, paddingVertical: 4 }, pressed && { opacity: 0.7 }]}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("MoreMenu");
                }
              }}
            >
              <ChevronRight size={18} color="#eee" strokeWidth={1.8} style={{ transform: [{ rotate: "180deg" }] }} />
            </Pressable>
          ),
        })}
      />
      <MoreStack.Screen name="Syndicates" component={SyndicatesScreen} />
    </MoreStack.Navigator>
  );
}

const MORE_ITEMS = [
  { label: "Shop", route: "Shop" as const, Icon: ShoppingBag },
  { label: "Leaderboard", route: "Leaderboard" as const, Icon: Trophy },
  { label: "Profile", route: "Profile" as const, Icon: User },
  { label: "Attack Logs", route: "AttackLogs" as const, Icon: Swords },
  { label: "Syndicates", route: "Syndicates" as const, Icon: Crosshair },
];

function MoreMenuScreen() {
  const nav = require("@react-navigation/native").useNavigation();
  return (
    <View style={moreStyles.container}>
      {MORE_ITEMS.map((item) => (
        <Pressable
          key={item.route}
          style={({ pressed }) => [moreStyles.row, pressed && { opacity: 0.75 }]}
          onPress={() => nav.navigate(item.route)}
        >
          <item.Icon size={18} color="#888" strokeWidth={1.5} />
          <Text style={moreStyles.link}>{item.label}</Text>
          <ChevronRight size={16} color="#333" strokeWidth={1.5} />
        </Pressable>
      ))}
    </View>
  );
}
const moreStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK, padding: 16 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#1e1e1e", gap: 12 },
  link: { color: "#eee", fontSize: 15, fontWeight: "600", flex: 1 },
});

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: DARK },
        headerTintColor: "#eee",
        headerTitleStyle: { fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopColor: "#1e1e1e",
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 4,
        },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: TEXT_DIM,
        tabBarIcon: ({ focused, color }) => {
          const IconComponent = TAB_ICONS[route.name] || Home;
          return <IconComponent size={18} color={color} strokeWidth={focused ? 2.5 : 1.5} />;
        },
        tabBarLabelStyle: { fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Crimes" component={CrimesScreen} />
      <Tab.Screen name="Targets" component={TargetsScreen} />
      <Tab.Screen name="Gym" component={GymScreen} />
      <Tab.Screen name="More" component={MoreStackScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [checking, setChecking] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then((token) => {
      setHasToken(!!token);
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    setNavigateToLogin(() => {
      navRef.current?.reset({ index: 0, routes: [{ name: "Login" }] });
    });
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: DARK }}>
        <LoadingSpinner size={32} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navRef}>
        <Stack.Navigator
          initialRouteName={hasToken ? "Main" : "Login"}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="BattleResult" component={BattleResultScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

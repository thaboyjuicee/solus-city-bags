import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  StatusBar,
  ImageBackground,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LogOut, Shield } from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";

import { api, TOKEN_KEY } from "../api/client";
import { Profile, RootStackParamList } from "../navigation/AppNavigator";
import StatusBars from "../components/StatusBars";
import LoadingSpinner from "../components/LoadingSpinner";
import { SKYLINE, CHARACTER, TEXTURE } from "../assets/images";

type Nav = NativeStackNavigationProp<RootStackParamList, "Main">;

interface EventItem {
  id: string;
  type: string;
  message: string;
  ts: string;
}

function formatCash(n: number): string {
  return Math.floor(n).toLocaleString();
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function eventColor(type: string): string {
  switch (type) {
    case "attack_win": return "#66bb6a";
    case "attack_loss": return "#ef5350";
    case "attacked": return "#ef5350";
    case "hospital": return "#ef5350";
    case "crime": return "#fdd835";
    case "gym": return "#ff9800";
    case "level_up": return "#9945FF";
    case "shop": return "#42a5f5";
    default: return "#555";
  }
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, eventsRes] = await Promise.all([
        api.get("/me"),
        api.get("/events"),
      ]);
      setProfile(profileRes.data as Profile);
      setEvents(eventsRes.data as EventItem[]);
    } catch {
      // 401 handled by interceptor
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingSpinner size={32} />
      </View>
    );
  }

  const shieldActive = profile ? new Date(profile.shieldUntil) > new Date() : false;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <ImageBackground source={TEXTURE} style={styles.texture} imageStyle={styles.textureImage} />
      <StatusBars profile={profile} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#9945FF" />}
      >
        <View style={styles.hero}>
          <ImageBackground source={SKYLINE} style={styles.heroImage} imageStyle={styles.heroImgStyle}>
            <LinearGradient colors={["transparent", "#0a0a0a"]} style={styles.heroGradient} />
            <View style={styles.heroBottom}>
              <View>
                <Text style={styles.name}>{profile?.name || profile?.wallet?.slice(0, 8) + "..."}</Text>
                <Text style={styles.subtitle}>LEVEL {profile?.level} | RP {profile?.rp}</Text>
              </View>
              <Pressable onPress={logout} style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.75 }]}> 
                <LogOut size={16} color="#555" strokeWidth={1.5} />
              </Pressable>
            </View>
          </ImageBackground>
        </View>

        {shieldActive && (
          <View style={styles.shieldBanner}>
            <Shield size={12} color="#66bb6a" strokeWidth={2} />
            <Text style={styles.shieldText}>SHIELD ACTIVE — until {new Date(profile!.shieldUntil).toLocaleTimeString()}</Text>
          </View>
        )}

        <View style={styles.topStatsRow}>
          <Image source={CHARACTER} style={styles.characterArt} />
          <View style={styles.econGrid}>
            <StatBox label="Cash" value={`$${formatCash(profile?.cash ?? 0)}`} color="#66bb6a" compact />
            <StatBox label="Income/hr" value={`$${profile?.incomePerHour ?? 0}`} color="#eeeeee" compact />
            <StatBox label="AP" value={String(profile?.ap ?? 0)} color="#ef5350" compact />
            <StatBox label="DP" value={String(profile?.dp ?? 0)} color="#42a5f5" compact />
          </View>
        </View>

        <Text style={styles.sectionTitle}>COMBAT STATS</Text>
        <View style={styles.statsGrid}>
          <StatBox label="STR" value={String(profile?.strength ?? 0)} color="#ff9800" />
          <StatBox label="SPD" value={String(profile?.speed ?? 0)} color="#9945FF" />
          <StatBox label="DEF" value={String(profile?.defense ?? 0)} color="#26c6da" />
          <StatBox label="DEX" value={String(profile?.dexterity ?? 0)} color="#fdd835" />
        </View>

        {/* Event Log */}
        <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
        <View style={styles.eventLog}>
          {events.length === 0 ? (
            <Text style={styles.noEvents}>No recent activity</Text>
          ) : (
            events.slice(0, 15).map((evt) => (
              <View key={evt.id} style={styles.eventRow}>
                <View style={[styles.eventDot, { backgroundColor: eventColor(evt.type) }]} />
                <Text style={styles.eventText} numberOfLines={2}>{evt.message}</Text>
                <Text style={styles.eventTime}>{timeAgo(evt.ts)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color, compact }: { label: string; value: string; color: string; compact?: boolean }) {
  return (
    <View style={[styles.statBox, compact && styles.compactStatBox]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  texture: { ...StyleSheet.absoluteFillObject },
  textureImage: { opacity: 0.08 },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  hero: { height: 144, marginBottom: 12, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "#1e1e1e" },
  heroImage: { flex: 1, justifyContent: "flex-end" },
  heroImgStyle: { opacity: 0.5 },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 12, paddingVertical: 10 },
  logoutBtn: { backgroundColor: "#141414", borderWidth: 1, borderColor: "#1e1e1e", borderRadius: 6, padding: 8 },
  name: { fontSize: 18, fontWeight: "900", color: "#eee", letterSpacing: 1 },
  subtitle: { color: "#eeeeee", fontSize: 10, marginTop: 2, fontWeight: "700", letterSpacing: 2 },
  shieldBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#0a1a0a", borderRadius: 4, borderWidth: 1, borderColor: "#1a3a1a", padding: 8, marginBottom: 10 },
  shieldText: { color: "#66bb6a", fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  topStatsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  characterArt: { width: 80, height: 112, borderRadius: 8, borderWidth: 1, borderColor: "#1e1e1e" },
  econGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statsGrid: { flexDirection: "row", flexWrap: "nowrap", justifyContent: "space-between", marginBottom: 16 },
  statBox: { backgroundColor: "#141414", borderRadius: 8, padding: 10, width: "24%", minWidth: 0, borderWidth: 1, borderColor: "#1e1e1e", alignItems: "center" },
  compactStatBox: { width: "48%", minWidth: 0, justifyContent: "center" },
  statLabel: { color: "#555", fontSize: 9, marginBottom: 2, textTransform: "uppercase", letterSpacing: 2, fontWeight: "900", textAlign: "center" },
  statValue: { fontSize: 14, fontWeight: "900", textAlign: "center" },
  sectionTitle: { color: "#555", fontSize: 10, fontWeight: "700", letterSpacing: 3, marginBottom: 8, textTransform: "uppercase" },
  eventLog: { backgroundColor: "#141414", borderRadius: 6, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: "#1e1e1e" },
  noEvents: { color: "#333", fontSize: 12, textAlign: "center", paddingVertical: 16, fontWeight: "600" },
  eventRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#1e1e1e" },
  eventDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  eventText: { flex: 1, color: "#ccc", fontSize: 11, fontWeight: "600" },
  eventTime: { color: "#444", fontSize: 9, marginLeft: 8, fontWeight: "700" },
});

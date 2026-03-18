import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  ImageBackground,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Zap, Lock } from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";
import { api } from "../api/client";
import { Profile } from "../navigation/AppNavigator";
import StatusBars from "../components/StatusBars";
import LoadingSpinner from "../components/LoadingSpinner";
import { CRIMES_IMG, TEXTURE } from "../assets/images";

interface Crime {
  id: string;
  name: string;
  nerveCost: number;
  cashMin: number;
  cashMax: number;
  xpReward: number;
  successRate: number;
  levelReq: number;
}

export default function CrimesScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [crimes, setCrimes] = useState<Crime[]>([]);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, crimesRes] = await Promise.all([
        api.get("/me"),
        api.get("/crimes"),
      ]);
      setProfile(profileRes.data as Profile);
      setCrimes(crimesRes.data as Crime[]);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const commit = async (crime: Crime) => {
    setCommitting(crime.id);
    try {
      const res = await api.post("/crimes/commit", { crimeId: crime.id });
      const data = res.data as {
        success: boolean; crimeName: string; cashGained: number;
        xpGained: number; leveledUp: boolean; newLevel: number;
      };

      if (data.success) {
        let msg = `+$${data.cashGained.toLocaleString()} cash\n+${data.xpGained} XP`;
        if (data.leveledUp) msg += `\nLEVEL UP! Now Level ${data.newLevel}`;
        Alert.alert("Success!", msg);
      } else {
        Alert.alert("Failed!", `The ${data.crimeName} failed.\n+${data.xpGained} XP`);
      }
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Crime failed";
      Alert.alert("Error", msg);
    } finally {
      setCommitting(null);
    }
  };

  if (loading) {
    return <View style={styles.center}><LoadingSpinner size={32} /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <ImageBackground source={TEXTURE} style={styles.texture} imageStyle={styles.textureImage} />
      <StatusBars profile={profile} />
      <View style={styles.hero}>
        <ImageBackground source={CRIMES_IMG} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
          <LinearGradient colors={["transparent", "#0a0a0a"]} style={styles.heroGradient} />
          <View style={styles.heroTextWrap}>
            <Text style={styles.title}>CRIMES</Text>
            <Text style={styles.subtitle}>Use nerve to commit crimes for cash and XP</Text>
          </View>
        </ImageBackground>
      </View>
      <FlatList
        style={styles.list}
        data={crimes}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchData} tintColor="#9945FF" />}
        renderItem={({ item: crime }) => {
          const locked = profile && profile.level < crime.levelReq;
          return (
            <View style={[styles.card, locked && { opacity: 0.4 }]}>
              <View style={styles.cardTop}>
                <Text style={styles.crimeName}>{crime.name}</Text>
                <View style={styles.levelPill}>
                  {locked ? <Lock size={9} color="#555" strokeWidth={2} /> : null}
                  <Text style={styles.levelReq}>LV.{crime.levelReq}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.chip}>
                  <Zap size={10} color="#1e88e5" strokeWidth={2} />
                  <Text style={[styles.chipText, { color: "#1e88e5" }]}>{crime.nerveCost}</Text>
                </View>
                <Text style={styles.chipSep}>·</Text>
                <Text style={[styles.chipText, { color: "#66bb6a" }]}>${crime.cashMin}-${crime.cashMax}</Text>
                <Text style={styles.chipSep}>·</Text>
                <Text style={[styles.chipText, { color: "#fdd835" }]}>{crime.xpReward} XP</Text>
                <Text style={styles.chipSep}>·</Text>
                <Text style={[styles.chipText, { color: "#555" }]}>{Math.round(crime.successRate * 100)}%</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.commitBtn, (committing === crime.id || locked) && styles.commitBtnDisabled, pressed && { opacity: 0.75 }]}
                onPress={() => commit(crime)}
                disabled={committing !== null || !!locked}
              >
                {committing === crime.id ? (
                  <LoadingSpinner size={12} color="#ef5350" />
                ) : (
                  <Text style={styles.commitBtnText}>COMMIT CRIME</Text>
                )}
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  texture: { ...StyleSheet.absoluteFillObject },
  textureImage: { opacity: 0.08 },
  hero: { height: 112, marginHorizontal: 14, marginTop: 12, marginBottom: 10, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "#1e1e1e" },
  heroImage: { flex: 1, justifyContent: "flex-end" },
  heroImageStyle: { opacity: 0.5 },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroTextWrap: { paddingHorizontal: 12, paddingBottom: 10 },
  list: { flex: 1, padding: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  title: { color: "#eee", fontSize: 20, fontWeight: "900", letterSpacing: 4, marginBottom: 4 },
  subtitle: { color: "#555", fontSize: 11, fontWeight: "600" },
  card: { backgroundColor: "#141414", borderRadius: 6, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: "#1e1e1e" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  crimeName: { color: "#eee", fontSize: 15, fontWeight: "700" },
  levelPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#9945FF20", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  levelReq: { color: "#555", fontSize: 9, fontWeight: "700" },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 3 },
  chipText: { fontSize: 10, fontWeight: "700" },
  chipSep: { color: "#333", marginHorizontal: 4, fontSize: 10 },
  commitBtn: { backgroundColor: "#1a0a0a", borderRadius: 6, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "#7f1919" },
  commitBtnDisabled: { backgroundColor: "#111", borderColor: "#222" },
  commitBtnText: { color: "#ef5350", fontWeight: "700", fontSize: 11, letterSpacing: 2 },
});

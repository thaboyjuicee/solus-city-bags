import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  StatusBar,
  Animated,
  ImageBackground,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Dumbbell, Info } from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";
import { api } from "../api/client";
import { Profile } from "../navigation/AppNavigator";
import StatusBars from "../components/StatusBars";
import LoadingSpinner from "../components/LoadingSpinner";
import { GYM_IMG, TEXTURE } from "../assets/images";

type Stat = "strength" | "speed" | "defense" | "dexterity";

const STATS: { key: Stat; label: string; color: string }[] = [
  { key: "strength", label: "Strength", color: "#ff9800" },
  { key: "speed", label: "Speed", color: "#ab47bc" },
  { key: "defense", label: "Defense", color: "#26c6da" },
  { key: "dexterity", label: "Dexterity", color: "#fdd835" },
];

function AnimatedStatBar({ value, color }: { value: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.min(value / 5, 100), duration: 600, useNativeDriver: false }).start();
  }, [value, anim]);
  return (
    <View style={styles.statBarTrack}>
      <Animated.View style={[styles.statBarFill, { backgroundColor: color, width: anim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }]} />
    </View>
  );
}

export default function GymScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get("/me");
      setProfile(res.data as Profile);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

  const train = async (stat: Stat) => {
    setTraining(stat);
    try {
      const res = await api.post("/gym/train", { stat });
      const data = res.data as {
        stat: string; gained: number; happyBonus: boolean;
        xpGained: number; leveledUp: boolean; newLevel: number;
      };

      let msg = `+${data.gained} ${stat}`;
      if (data.happyBonus) msg += " (happiness bonus!)";
      msg += `\n+${data.xpGained} XP`;
      if (data.leveledUp) msg += `\n🎉 LEVEL UP! Now Level ${data.newLevel}`;

      Alert.alert("Training Complete", msg);
      fetchProfile();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Training failed";
      Alert.alert("Error", msg);
    } finally {
      setTraining(null);
    }
  };

  if (loading) {
    return <View style={styles.center}><StatusBar barStyle="light-content" backgroundColor="#0a0a0a" /><LoadingSpinner /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <ImageBackground source={TEXTURE} style={styles.texture} imageStyle={styles.textureImage} />
      <StatusBars profile={profile} />
      <View style={styles.hero}>
        <ImageBackground source={GYM_IMG} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
          <LinearGradient colors={["transparent", "#0a0a0a"]} style={styles.heroGradient} />
          <View style={styles.heroTextWrap}>
            <Text style={styles.title}>GYM</Text>
            <Text style={styles.subtitle}>Spend 5 energy to train a combat stat</Text>
          </View>
        </ImageBackground>
      </View>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchProfile} tintColor="#9945FF" />}
      >
        <View style={styles.currentStats}>
          {STATS.map((s) => {
            const val = profile ? (profile as unknown as Record<string, number>)[s.key] ?? 0 : 0;
            return (
              <View key={s.key} style={styles.statRow}>
                <Text style={[styles.statLabel, { color: s.color }]}>{s.label}</Text>
                <AnimatedStatBar value={val} color={s.color} />
                <Text style={styles.statValue}>{val}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.buttons}>
          {STATS.map((s) => (
            <Pressable
              key={s.key}
              style={({ pressed }) => [
                styles.trainBtn,
                { borderColor: s.color },
                training !== null && styles.trainBtnDisabled,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => train(s.key)}
              disabled={training !== null}
            >
              {training === s.key ? (
                <LoadingSpinner size={16} color={s.color} />
              ) : (
                <View style={styles.trainBtnInner}>
                  <Dumbbell size={14} color={s.color} />
                  <Text style={[styles.trainBtnText, { color: s.color }]}>TRAIN {s.label.toUpperCase()}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoHeader}>
            <Info size={12} color="#555" />
            <Text style={styles.infoTitle}>INFO</Text>
          </View>
          <Text style={styles.infoText}>Energy cost: 5 per train</Text>
          <Text style={styles.infoText}>Stat gain: 1-3 points (bonus with happiness)</Text>
          <Text style={styles.infoText}>XP reward: 10 per train</Text>
        </View>
      </ScrollView>
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
  scroll: { flex: 1, padding: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  title: { color: "#eee", fontSize: 10, fontWeight: "900", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 },
  subtitle: { color: "#555", fontSize: 11, marginBottom: 20 },
  currentStats: { backgroundColor: "#141414", borderRadius: 6, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#1e1e1e" },
  statRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  statLabel: { width: 72, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  statBarTrack: { flex: 1, height: 6, backgroundColor: "#1e1e1e", borderRadius: 4, overflow: "hidden", marginHorizontal: 8 },
  statBarFill: { height: "100%", borderRadius: 4 },
  statValue: { color: "#eee", fontSize: 13, fontWeight: "700", width: 40, textAlign: "right" },
  buttons: { gap: 8, marginBottom: 16 },
  trainBtn: { borderWidth: 1, borderRadius: 6, padding: 14, alignItems: "center", backgroundColor: "#111" },
  trainBtnDisabled: { opacity: 0.4 },
  trainBtnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  trainBtnText: { fontWeight: "700", fontSize: 11, letterSpacing: 2 },
  infoBox: { backgroundColor: "#141414", borderRadius: 6, padding: 12, borderWidth: 1, borderColor: "#1e1e1e" },
  infoHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  infoTitle: { color: "#555", fontSize: 9, fontWeight: "900", letterSpacing: 2 },
  infoText: { color: "#444", fontSize: 11, marginBottom: 2 },
});

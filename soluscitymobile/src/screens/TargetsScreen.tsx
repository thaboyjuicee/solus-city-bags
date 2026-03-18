import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  RefreshControl,
  StatusBar,
  ImageBackground,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Shield, Swords, Heart } from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";
import { api } from "../api/client";
import { BattleResult, RootStackParamList, Profile } from "../navigation/AppNavigator";
import StatusBars from "../components/StatusBars";
import LoadingSpinner from "../components/LoadingSpinner";
import { ARENA_IMG, TEXTURE } from "../assets/images";

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Target {
  id: string;
  type: "player" | "npc";
  displayName: string;
  name?: string;
  wallet: string;
  rp: number;
  level: number;
  attackPower: number;
  defensePower: number;
  ap?: number;
  dp?: number;
  shieldActive: boolean;
  inHospital: boolean;
  flavor?: string;
}

function formatHospitalMessage(recoverAt?: string) {
  if (!recoverAt) return "You are in the hospital.";

  const msUntil = new Date(recoverAt).getTime() - Date.now();
  const minsUntil = Math.ceil(Math.max(0, msUntil) / 60000);

  const timeString = new Date(recoverAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (minsUntil <= 0) {
    return "You are in the hospital. It should clear automatically.";
  }
  return `You are in hospital. You can attack again in about ${minsUntil} minute${minsUntil === 1 ? "" : "s"} (until ${timeString}).`;
}

function StatusBadge({ target }: { target: Target }) {
  const color = target.shieldActive ? "#1e88e5" : target.inHospital ? "#ef5350" : "#66bb6a";
  const bg = target.shieldActive ? "#1e88e520" : target.inHospital ? "#ef535020" : "#66bb6a20";
  const label = target.shieldActive ? "SHIELDED" : target.inHospital ? "HOSPITAL" : "ACTIVE";
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {target.shieldActive && <Shield size={10} color={color} />}
      {target.inHospital && <Heart size={10} color={color} />}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export default function TargetsScreen() {
  const navigation = useNavigation<Nav>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [attacking, setAttacking] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, targetsRes] = await Promise.all([
        api.get("/me"),
        api.get("/targets"),
      ]);
      setProfile(profileRes.data as Profile);
      setTargets(targetsRes.data as Target[]);
    } catch {
      Alert.alert("Error", "Failed to load targets");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const attack = async (target: Target) => {
    if (profile?.inHospital) {
      Alert.alert("Attack blocked", formatHospitalMessage(profile.hospitalUntil));
      return;
    }

    setAttacking((prev) => ({ ...prev, [target.id]: true }));
    try {
      const res = await api.post("/battle/attack", { targetId: target.id, targetType: target.type });
      navigation.navigate("BattleResult", { result: res.data as BattleResult });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { error?: string; code?: string; recoverAt?: string } } })?.response?.data;
      const msg =
        data?.code === "IN_HOSPITAL"
          ? formatHospitalMessage(data.recoverAt)
          : data?.error ?? "Attack failed";
      Alert.alert("Attack failed", msg);
    } finally {
      setAttacking((prev) => ({ ...prev, [target.id]: false }));
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
        <ImageBackground source={ARENA_IMG} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
          <LinearGradient colors={["transparent", "#0a0a0a"]} style={styles.heroGradient} />
          <View style={styles.heroTextWrap}>
            <Text style={styles.title}>TARGETS</Text>
            <Text style={styles.subtitle}>Players in your RP range. Costs 1 energy to attack.</Text>
          </View>
        </ImageBackground>
      </View>
      <FlatList
        style={styles.list}
        data={targets}
        keyExtractor={(t) => `${t.type}:${t.id}`}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchData} tintColor="#9945FF" />}
        ListEmptyComponent={<Text style={styles.empty}>No targets available in your RP range.</Text>}
        renderItem={({ item: target }) => (
          <View style={[styles.card, target.shieldActive && styles.cardDisabled]}>
            <View style={styles.cardTop}>
              <View style={styles.nameRow}>
                <Text style={styles.targetName}>{target.displayName || target.name}</Text>
                <View style={styles.levelPill}>
                  <Text style={styles.levelPillText}>LV {target.level ?? "?"}</Text>
                </View>
                {target.type === "npc" && (
                  <View style={styles.npcPill}>
                    <Text style={styles.npcPillText}>NPC</Text>
                  </View>
                )}
              </View>
              <StatusBadge target={target} />
            </View>
            <View style={styles.chipRow}>
              <Text style={styles.rpChip}>RP {target.rp}</Text>
              <Text style={styles.chipDot}>·</Text>
              <Text style={styles.apChip}>AP {target.attackPower ?? target.ap ?? 0}</Text>
              <Text style={styles.chipDot}>·</Text>
              <Text style={styles.dpChip}>DP {target.defensePower ?? target.dp ?? 0}</Text>
            </View>
            {target.flavor ? <Text style={styles.flavorText}>{target.flavor}</Text> : null}
              <Pressable
              style={({ pressed }) => [
                styles.attackBtn,
                (attacking[target.id] || target.shieldActive || profile?.inHospital) && styles.attackBtnDisabled,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => attack(target)}
              disabled={attacking[target.id] || target.shieldActive || profile?.inHospital}
            >
              {attacking[target.id] ? (
                <LoadingSpinner size={16} color="#ef5350" />
              ) : (
                <View style={styles.attackBtnInner}>
                  <Swords
                    size={12}
                    color={target.shieldActive || profile?.inHospital ? "#555" : "#ef5350"}
                  />
                  <Text style={[styles.attackBtnText, target.shieldActive && { color: "#555" }]}>
                    {target.shieldActive ? "SHIELDED" : profile?.inHospital ? "HOSPITAL" : "ATTACK"}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        )}
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
  title: { color: "#eee", fontSize: 10, fontWeight: "900", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 },
  subtitle: { color: "#555", fontSize: 11 },
  empty: { color: "#555", textAlign: "center", marginTop: 40, fontSize: 13 },
  card: { backgroundColor: "#141414", borderRadius: 6, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: "#1e1e1e" },
  cardDisabled: { opacity: 0.4 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  targetName: { color: "#eee", fontSize: 15, fontWeight: "700" },
  levelPill: { backgroundColor: "#9945FF20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  levelPillText: { color: "#9945FF", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  npcPill: { backgroundColor: "#14F19520", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  npcPillText: { color: "#14F195", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  flavorText: { color: "#555", fontSize: 10, marginBottom: 10 },
  rpChip: { color: "#14F195", fontSize: 12, fontWeight: "700" },
  apChip: { color: "#ef5350", fontSize: 12, fontWeight: "700" },
  dpChip: { color: "#1e88e5", fontSize: 12, fontWeight: "700" },
  chipDot: { color: "#333", fontSize: 12 },
  attackBtn: { backgroundColor: "#1a0a0a", borderRadius: 6, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "#7f1919" },
  attackBtnDisabled: { opacity: 0.4 },
  attackBtnInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  attackBtnText: { color: "#ef5350", fontWeight: "700", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
});

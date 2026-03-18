import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, StatusBar, ImageBackground, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Swords, Crosshair, Home } from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";
import { RootStackParamList } from "../navigation/AppNavigator";
import { ARENA_IMG, TEXTURE } from "../assets/images";
import { api } from "../api/client";
import LoadingSpinner from "../components/LoadingSpinner";

type Nav = NativeStackNavigationProp<RootStackParamList, "BattleResult">;
type Route = RouteProp<RootStackParamList, "BattleResult">;

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

export default function BattleResultScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { result } = route.params;
  const [attackingAgain, setAttackingAgain] = React.useState(false);

  const rpSign = result.rpChange >= 0 ? "+" : "";

  const canAttackAgain = result.opponent?.type === "npc";

  const attackAgain = async () => {
    if (!canAttackAgain || !result.opponent?.id) return;
    setAttackingAgain(true);
    try {
      const res = await api.post("/battle/attack", { targetId: result.opponent.id, targetType: "npc" });
      navigation.replace("BattleResult", { result: res.data });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { error?: string; code?: string; recoverAt?: string } } })?.response?.data;
      const msg = data?.code === "IN_HOSPITAL" && data?.recoverAt
        ? formatHospitalMessage(data.recoverAt)
        : data?.error ?? "Could not attack again";
      const msUntil = data?.code === "IN_HOSPITAL" && data.recoverAt
        ? Math.ceil(Math.max(0, new Date(data.recoverAt).getTime() - Date.now()) / 60000)
        : 0;
      Alert.alert("Attack failed", msUntil > 0 ? `You are in the hospital. Attack again in about ${msUntil} minute${msUntil === 1 ? "" : "s"}.` : msg);
    } finally {
      setAttackingAgain(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <ImageBackground source={TEXTURE} style={styles.texture} imageStyle={styles.textureImage} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
        <ImageBackground source={ARENA_IMG} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
            <LinearGradient colors={["transparent", "#0a0a0a"]} style={styles.heroGradient} />
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>
                {result.outcomeType === "evaded" ? "EVADE REPORT" : result.win ? "VICTORY REPORT" : "BATTLE REPORT"}
              </Text>
              <Text style={styles.heroSubtitle}>{result.opponent?.name} ({result.opponent?.type?.toUpperCase()})</Text>
            </View>
          </ImageBackground>
        </View>
        <Swords
          size={40}
          color={
            result.outcomeType === "evaded"
              ? "#f9a825"
              : result.win
                ? "#66bb6a"
                : "#ef5350"
          }
          style={styles.icon}
        />
        <Text
          style={[
            styles.outcome,
            result.outcomeType === "evaded" ? styles.evade : result.win ? styles.win : styles.loss,
          ]}
        >
          {result.outcomeType === "evaded" ? "EVADED" : result.win ? "VICTORY" : "DEFEAT"}
        </Text>

        {/* Loot & RP */}
        <View style={styles.card}>
          <Row
            label="Loot"
            value={result.outcomeType === "evaded" ? "$0" : result.win ? `+$${result.loot.toLocaleString()}` : "$0"}
            highlight={result.win}
          />
          <Row label="RP Change" value={`${rpSign}${result.rpChange}`} highlight={result.rpChange > 0} negative={result.rpChange < 0} />
          <Row label="XP Gained" value={`+${result.xpGained}`} highlight />
          <Row
            label="Hit"
            value={
              result.outcomeType === "evaded"
                ? "EVADED"
                : result.criticalHit
                  ? "CRITICAL"
                  : "NORMAL"
            }
            highlight={result.criticalHit}
          />
          {result.outcomeType === "evaded" && (
            <Row label="Evasion Chance" value={`${((result.evadeChance ?? 0) * 100).toFixed(1)}%`} />
          )}
          {result.criticalHit && (
            <Row label="Critical Chance" value={`${((result.critChance ?? 0) * 100).toFixed(1)}%`} />
          )}
          <Row label="Opponent" value={`${result.opponent?.name ?? "Unknown"} (${result.opponent?.type ?? "player"})`} />
        </View>

        {/* Damage */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DAMAGE</Text>
          <Row label="Damage Dealt" value={String(result.damageDealt)} highlight />
          <Row label="Damage Taken" value={String(result.damageTaken)} negative={result.damageTaken > 0} />
          {(result.hospitalizedTarget ?? result.defenderHospitalized) && (
            <View style={styles.hospitalBadge}>
              <Text style={styles.hospitalText}>Target sent to hospital!</Text>
            </View>
          )}
          {(result.hospitalizedSelf ?? result.attackerHospitalized) && (
            <View style={[styles.hospitalBadge, { borderColor: "#7f1919" }]}>
              <Text style={[styles.hospitalText, { color: "#ef5350" }]}>You were hospitalized!</Text>
            </View>
          )}
        </View>

        {/* Battle Odds */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>BATTLE DETAILS</Text>
          <Row label="Your AP" value={String(result.attackerAP)} />
          <Row label="Their DP" value={String(result.defenderDP)} />
          <Row label="Win Chance" value={`${(result.pWin * 100).toFixed(1)}%`} />
          <Row label="Roll" value={result.roll.toFixed(3)} />
        </View>

        {/* Updated Stats */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>YOUR STATS AFTER BATTLE</Text>
          <Row label="Cash" value={`$${Math.floor(result.updatedProfile.cash).toLocaleString()}`} />
          <Row label="Health" value={`${result.updatedProfile.health}/${result.updatedProfile.maxHealth}`}
            negative={result.updatedProfile.health < result.updatedProfile.maxHealth * 0.3} />
          <Row label="Level" value={String(result.updatedProfile.level)} />
          <Row label="RP" value={String(result.updatedProfile.rp)} />
          <Row label="Energy" value={String(result.updatedProfile.energy)} />
        </View>

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.75 }]}
            onPress={() => navigation.navigate("Main")}
          >
            <Crosshair size={14} color="#9945FF" />
            <Text style={styles.primaryBtnText}>BACK TO TARGETS</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.75 }]}
            onPress={() => (navigation as unknown as { navigate: (name: string, params?: unknown) => void }).navigate("Main", { screen: "More", params: { screen: "AttackLogs" } })}
          >
            <Home size={14} color="#888" />
            <Text style={styles.secondaryBtnText}>VIEW LOGS</Text>
          </Pressable>
        </View>
        {canAttackAgain && (
          <Pressable
            style={({ pressed }) => [styles.attackAgainBtn, pressed && { opacity: 0.75 }]}
            onPress={attackAgain}
            disabled={attackingAgain}
          >
            {attackingAgain ? <LoadingSpinner size={14} color="#ef5350" /> : <Text style={styles.attackAgainText}>ATTACK AGAIN</Text>}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, highlight, negative }: { label: string; value: string; highlight?: boolean; negative?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.positive, negative && styles.negativeText]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  texture: { ...StyleSheet.absoluteFillObject },
  textureImage: { opacity: 0.08 },
  scrollView: { flex: 1 },
  content: { padding: 14, paddingBottom: 40 },
  hero: { height: 112, marginBottom: 12, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: "#1e1e1e" },
  heroImage: { flex: 1, justifyContent: "flex-end" },
  heroImageStyle: { opacity: 0.5 },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroTextWrap: { paddingHorizontal: 12, paddingBottom: 10 },
  heroTitle: { color: "#eee", fontSize: 10, fontWeight: "900", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 },
  heroSubtitle: { color: "#555", fontSize: 11 },
  icon: { alignSelf: "center", marginBottom: 8 },
  outcome: { fontSize: 36, fontWeight: "900", textAlign: "center", marginBottom: 20, letterSpacing: 6 },
  win: { color: "#66bb6a" },
  loss: { color: "#ef5350" },
  card: { backgroundColor: "#141414", borderRadius: 6, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#1e1e1e" },
  sectionTitle: { color: "#555", fontSize: 9, fontWeight: "900", letterSpacing: 3, marginBottom: 10, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  rowLabel: { color: "#555", fontSize: 12 },
  rowValue: { color: "#eee", fontSize: 12, fontWeight: "700" },
  positive: { color: "#66bb6a" },
  negativeText: { color: "#ef5350" },
  evade: { color: "#f9a825" },
  hospitalBadge: { marginTop: 8, padding: 8, borderRadius: 4, borderWidth: 1, borderColor: "#2e7d32", alignItems: "center", backgroundColor: "#66bb6a10" },
  hospitalText: { color: "#66bb6a", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  buttons: { flexDirection: "row", gap: 10, marginTop: 4 },
  primaryBtn: { flex: 1, backgroundColor: "#1a0a2e", padding: 12, borderRadius: 6, alignItems: "center", borderWidth: 1, borderColor: "rgba(153,69,255,0.3)", flexDirection: "row", justifyContent: "center", gap: 8 },
  primaryBtnText: { color: "#9945FF", fontWeight: "700", fontSize: 11, letterSpacing: 2 },
  secondaryBtn: { flex: 1, backgroundColor: "#111", padding: 12, borderRadius: 6, alignItems: "center", borderWidth: 1, borderColor: "#1e1e1e", flexDirection: "row", justifyContent: "center", gap: 8 },
  secondaryBtnText: { color: "#888", fontWeight: "700", fontSize: 11, letterSpacing: 2 },
  attackAgainBtn: { marginTop: 10, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: "#7f1919", backgroundColor: "#1a0a0a", alignItems: "center" },
  attackAgainText: { color: "#ef5350", fontWeight: "900", fontSize: 11, letterSpacing: 2 },
});

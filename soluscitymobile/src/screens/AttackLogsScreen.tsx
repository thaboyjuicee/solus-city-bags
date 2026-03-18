import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StatusBar, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../api/client";
import { RootStackParamList } from "../navigation/AppNavigator";
import LoadingSpinner from "../components/LoadingSpinner";

type Nav = NativeStackNavigationProp<RootStackParamList, "Main">;

interface AttackLogEntry {
  id: string;
  createdAt: string;
  type: string;
  attackerName: string;
  defenderName: string;
  targetType: "player" | "npc";
  result: "win" | "loss";
  outcomeType?: "win" | "loss" | "evaded";
  damageDealt: number;
  damageTaken: number;
  loot: number;
  rpChange: number;
  xpGained: number;
  hospitalResult: string;
  revengeTargetId?: string;
  revengeAvailable: boolean;
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

function timeAgo(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AttackLogsScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AttackLogEntry[]>([]);
  const [revengeBusy, setRevengeBusy] = useState<Record<string, boolean>>({});

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get("/logs/attacks");
      setLogs(res.data as AttackLogEntry[]);
    } catch {
      Alert.alert("Error", "Failed to load attack logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchLogs(); }, [fetchLogs]));

  const revenge = async (entry: AttackLogEntry) => {
    if (!entry.revengeTargetId) return;
    setRevengeBusy((prev) => ({ ...prev, [entry.id]: true }));
    try {
      const res = await api.post("/battle/attack", { targetId: entry.revengeTargetId, targetType: "player" });
      navigation.navigate("BattleResult", { result: res.data });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { error?: string; code?: string; recoverAt?: string } } })?.response?.data;
      const msg =
        data?.code === "IN_HOSPITAL"
          ? formatHospitalMessage(data.recoverAt)
          : data?.error ?? "Revenge failed";
      Alert.alert("Revenge failed", msg);
    } finally {
      setRevengeBusy((prev) => ({ ...prev, [entry.id]: false }));
    }
  };

  if (loading) {
    return <View style={styles.center}><StatusBar barStyle="light-content" backgroundColor="#0a0a0a" /><LoadingSpinner /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <FlatList
        style={styles.list}
        data={logs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchLogs} tintColor="#9945FF" />}
        ListHeaderComponent={<Text style={styles.title}>ATTACK LOGS</Text>}
        ListEmptyComponent={<Text style={styles.empty}>No battle records yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowTop}>
              <Text
                style={[
                  styles.badge,
                  item.outcomeType === "evaded"
                    ? styles.evadeBadge
                    : item.result === "win"
                      ? styles.winBadge
                      : styles.lossBadge,
                ]}
              >
                {(item.outcomeType ?? item.result).toUpperCase()}
              </Text>
              <Text style={styles.ts}>{timeAgo(item.createdAt)}</Text>
            </View>
            <Text style={styles.message}>
              {item.type === "attacked_by_player" || item.type === "attacked_by_player_evaded"
                ? `${item.attackerName} attacked you`
                : `You attacked ${item.defenderName}${item.targetType === "npc" ? " (NPC)" : ""}`}
            </Text>
            <View style={styles.statsRow}>
              <Text style={styles.dealt}>Dealt {item.damageDealt}</Text>
              <Text style={styles.taken}>Taken {item.damageTaken}</Text>
              <Text style={styles.loot}>{item.loot >= 0 ? `+$${Math.floor(item.loot)}` : `-$${Math.floor(Math.abs(item.loot))}`}</Text>
            </View>
            {item.revengeAvailable && item.revengeTargetId && (
              <Pressable
                style={({ pressed }) => [styles.revengeBtn, revengeBusy[item.id] && styles.revengeBtnDisabled, pressed && { opacity: 0.75 }]}
                disabled={!!revengeBusy[item.id]}
                onPress={() => revenge(item)}
              >
                <Text style={styles.revengeText}>{revengeBusy[item.id] ? "ATTACKING..." : "REVENGE"}</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  list: { flex: 1, padding: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  title: { color: "#eee", fontSize: 10, fontWeight: "900", letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 },
  empty: { color: "#555", textAlign: "center", marginTop: 40 },
  card: { backgroundColor: "#141414", borderColor: "#1e1e1e", borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  badge: { fontSize: 9, fontWeight: "900", letterSpacing: 2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, overflow: "hidden" },
  winBadge: { color: "#66bb6a", backgroundColor: "#66bb6a20" },
  evadeBadge: { color: "#f9a825", backgroundColor: "#f9a82520" },
  lossBadge: { color: "#ef5350", backgroundColor: "#ef535020" },
  ts: { color: "#555", fontSize: 10, fontWeight: "700" },
  message: { color: "#ddd", fontSize: 12, marginBottom: 8 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  dealt: { color: "#66bb6a", fontSize: 11, fontWeight: "700" },
  taken: { color: "#ef5350", fontSize: 11, fontWeight: "700" },
  loot: { color: "#14F195", fontSize: 11, fontWeight: "700" },
  revengeBtn: { alignItems: "center", paddingVertical: 8, borderWidth: 1, borderColor: "rgba(153,69,255,0.3)", backgroundColor: "#1a0a2e", borderRadius: 6 },
  revengeBtnDisabled: { opacity: 0.45 },
  revengeText: { color: "#9945FF", fontSize: 10, fontWeight: "900", letterSpacing: 2 },
});

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Trophy } from "lucide-react-native";
import { api } from "../api/client";
import { Profile } from "../navigation/AppNavigator";
import StatusBars from "../components/StatusBars";
import LoadingSpinner from "../components/LoadingSpinner";

interface LeaderboardEntry {
  rank: number;
  name: string;
  wallet: string;
  rp: number;
  level: number;
  ap: number;
  dp: number;
  isMe: boolean;
}

function getRankColor(rank: number) {
  if (rank === 1) return "#fdd835";
  if (rank === 2) return "#bbb";
  if (rank === 3) return "#cd7f32";
  return "#555";
}

export default function LeaderboardScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, lbRes] = await Promise.all([
        api.get("/me"),
        api.get("/leaderboard"),
      ]);
      setProfile(profileRes.data as Profile);
      setEntries(lbRes.data as LeaderboardEntry[]);
    } catch {
      Alert.alert("Error", "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) {
    return <View style={styles.center}><StatusBar barStyle="light-content" backgroundColor="#0a0a0a" /><LoadingSpinner /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <StatusBars profile={profile} />
      <FlatList
        style={styles.list}
        data={entries}
        keyExtractor={(e) => String(e.rank)}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchData} tintColor="#9945FF" />}
        ListHeaderComponent={
          <>
            <View style={styles.headerSection}>
              <Text style={styles.title}>LEADERBOARD</Text>
              <Text style={styles.subtitle}>Top 100 players ranked by RP</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.col, styles.rankCol, styles.headerText]}>#</Text>
              <Text style={[styles.col, styles.nameCol, styles.headerText]}>PLAYER</Text>
              <Text style={[styles.col, styles.lvlCol, styles.headerText]}>LV</Text>
              <Text style={[styles.col, styles.numCol, styles.headerText]}>RP</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, item.isMe && styles.myRow]}>
            <View style={[styles.rankCol, styles.rankCell]}>
              {item.rank <= 3 ? (
                <Trophy size={12} color={getRankColor(item.rank)} />
              ) : (
                <Text style={[styles.cellText, { color: "#555" }]}>{item.rank}</Text>
              )}
            </View>
            <Text style={[styles.nameCol, styles.cellText, item.isMe && styles.myName]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.lvlCol, styles.cellText, styles.lvlText]}>{item.level ?? "-"}</Text>
            <Text style={[styles.numCol, styles.cellText, item.isMe ? styles.myRp : styles.rpText]}>{item.rp}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  list: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  headerSection: { padding: 14, paddingBottom: 0 },
  title: { color: "#eee", fontSize: 10, fontWeight: "900", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 },
  subtitle: { color: "#555", fontSize: 11, marginBottom: 12 },
  tableHeader: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1e1e1e", backgroundColor: "#111" },
  row: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#111" },
  myRow: { backgroundColor: "#1a0a2e" },
  col: {},
  rankCol: { width: 32 },
  rankCell: { justifyContent: "center" },
  nameCol: { flex: 1 },
  lvlCol: { width: 30, textAlign: "center" },
  numCol: { width: 50, textAlign: "right" },
  headerText: { color: "#555", fontWeight: "900", textTransform: "uppercase", fontSize: 9, letterSpacing: 2 },
  cellText: { color: "#ccc", fontSize: 12 },
  myName: { color: "#9945FF", fontWeight: "700" },
  myRp: { color: "#14F195", fontWeight: "700" },
  rpText: { color: "#14F195" },
  lvlText: { color: "#555" },
});

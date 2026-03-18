import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { Profile } from "../navigation/AppNavigator";
import StatusBars from "../components/StatusBars";
import LoadingSpinner from "../components/LoadingSpinner";

interface SyndicateListItem {
  id: string;
  name: string;
  description: string;
  buffType: string;
  buffValue: number;
  memberCount: number;
  totalRp: number;
}

interface SyndicateLeaderboardItem {
  id: string;
  name: string;
  memberCount: number;
  totalRp: number;
  buffType: string;
  buffValue: number;
}

export default function SyndicatesScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [syndicates, setSyndicates] = useState<SyndicateListItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<SyndicateLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, syndicatesRes, leaderboardRes] = await Promise.all([
        api.get("/me"),
        api.get("/syndicates"),
        api.get("/leaderboard/syndicates"),
      ]);
      setProfile(profileRes.data as Profile);
      setSyndicates(syndicatesRes.data as SyndicateListItem[]);
      setLeaderboard(leaderboardRes.data as SyndicateLeaderboardItem[]);
    } catch {
      Alert.alert("Error", "Failed to load syndicates");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const mySyndicate = useMemo(
    () => syndicates.find((s) => s.id === profile?.syndicate?.id) ?? null,
    [profile?.syndicate?.id, syndicates]
  );

  const createSyndicate = async () => {
    if (!createName.trim()) {
      Alert.alert("Name required", "Enter a syndicate name.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/syndicates", { name: createName.trim(), description: createDesc.trim() });
      setCreateName("");
      setCreateDesc("");
      await fetchData();
      Alert.alert("Created", "Syndicate created successfully.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Could not create syndicate";
      Alert.alert("Error", msg);
    } finally {
      setBusy(false);
    }
  };

  const joinSyndicate = async (id: string) => {
    setBusy(true);
    try {
      await api.post(`/syndicates/${id}/join`);
      await fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Could not join syndicate";
      Alert.alert("Error", msg);
    } finally {
      setBusy(false);
    }
  };

  const leaveSyndicate = async () => {
    setBusy(true);
    try {
      await api.post("/syndicates/leave");
      await fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Could not leave syndicate";
      Alert.alert("Error", msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><StatusBar barStyle="light-content" backgroundColor="#0a0a0a" /><LoadingSpinner /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <StatusBars profile={profile} />
      <FlatList
        style={styles.list}
        data={syndicates}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchData} tintColor="#9945FF" />}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>SYNDICATES</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MY SYNDICATE</Text>
              {mySyndicate ? (
                <>
                  <Text style={styles.name}>{mySyndicate.name}</Text>
                  <Text style={styles.meta}>Members {mySyndicate.memberCount}  |  Total RP {mySyndicate.totalRp}</Text>
                  <Text style={styles.meta}>Buff: +{Math.round(mySyndicate.buffValue * 100)}% AP</Text>
                  <Pressable style={styles.dangerBtn} onPress={leaveSyndicate} disabled={busy}>
                    <Text style={styles.dangerBtnText}>{busy ? "PLEASE WAIT" : "LEAVE SYNDICATE"}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.meta}>You are not in a syndicate.</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Syndicate Name"
                    placeholderTextColor="#555"
                    value={createName}
                    onChangeText={setCreateName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Description (optional)"
                    placeholderTextColor="#555"
                    value={createDesc}
                    onChangeText={setCreateDesc}
                  />
                  <Pressable style={styles.primaryBtn} onPress={createSyndicate} disabled={busy}>
                    <Text style={styles.primaryBtnText}>{busy ? "CREATING..." : "CREATE SYNDICATE"}</Text>
                  </Pressable>
                </>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TOP SYNDICATES</Text>
              {leaderboard.slice(0, 5).map((entry, i) => (
                <View key={entry.id} style={styles.lbRow}>
                  <Text style={styles.lbRank}>#{i + 1}</Text>
                  <Text style={styles.lbName}>{entry.name}</Text>
                  <Text style={styles.lbRp}>{entry.totalRp}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>DISCOVER</Text>
          </View>
        }
        renderItem={({ item }) => {
          const joined = profile?.syndicate?.id === item.id;
          return (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.description || "No description"}</Text>
              <Text style={styles.meta}>Members {item.memberCount}/20  |  RP {item.totalRp}</Text>
              <Text style={styles.meta}>Buff: +{Math.round(item.buffValue * 100)}% AP</Text>
              {!joined && !profile?.syndicate && (
                <Pressable style={styles.primaryBtn} onPress={() => joinSyndicate(item.id)} disabled={busy}>
                  <Text style={styles.primaryBtnText}>{busy ? "PLEASE WAIT" : "JOIN"}</Text>
                </Pressable>
              )}
              {joined && <Text style={styles.joinedTag}>YOU ARE A MEMBER</Text>}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  list: { flex: 1, padding: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  title: { color: "#eee", fontSize: 10, fontWeight: "900", letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 },
  section: { backgroundColor: "#141414", borderWidth: 1, borderColor: "#1e1e1e", borderRadius: 8, padding: 12, marginBottom: 10 },
  sectionTitle: { color: "#555", fontSize: 9, fontWeight: "900", letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" },
  card: { backgroundColor: "#141414", borderWidth: 1, borderColor: "#1e1e1e", borderRadius: 8, padding: 12, marginBottom: 8 },
  name: { color: "#eee", fontSize: 14, fontWeight: "800", marginBottom: 4 },
  meta: { color: "#555", fontSize: 11, marginBottom: 4 },
  input: { backgroundColor: "#111", borderColor: "#1e1e1e", borderWidth: 1, borderRadius: 6, color: "#eee", paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  primaryBtn: { alignItems: "center", paddingVertical: 10, borderWidth: 1, borderColor: "rgba(153,69,255,0.3)", backgroundColor: "#1a0a2e", borderRadius: 6, marginTop: 4 },
  primaryBtnText: { color: "#9945FF", fontWeight: "900", fontSize: 10, letterSpacing: 2 },
  dangerBtn: { alignItems: "center", paddingVertical: 10, borderWidth: 1, borderColor: "#7f1919", backgroundColor: "#1a0a0a", borderRadius: 6, marginTop: 6 },
  dangerBtnText: { color: "#ef5350", fontWeight: "900", fontSize: 10, letterSpacing: 2 },
  lbRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  lbRank: { width: 30, color: "#9945FF", fontWeight: "800" },
  lbName: { flex: 1, color: "#eee" },
  lbRp: { color: "#14F195", fontWeight: "700" },
  joinedTag: { color: "#14F195", fontSize: 10, fontWeight: "900", letterSpacing: 2, marginTop: 6 },
});

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  Animated,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { Profile } from "../navigation/AppNavigator";
import StatusBars from "../components/StatusBars";
import LoadingSpinner from "../components/LoadingSpinner";

function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function AnimatedBar({ current, max, color }: { current: number; max: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pct = Math.min(current / max, 1) * 100;
    Animated.timing(anim, { toValue: pct, duration: 600, useNativeDriver: false }).start();
  }, [current, max, anim]);
  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, { backgroundColor: color, width: anim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }]} />
    </View>
  );
}

function StatBar({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  return (
    <View style={styles.barContainer}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={[styles.barNumbers, { color }]}>{current} / {max}</Text>
      </View>
      <AnimatedBar current={current} max={max} color={color} />
    </View>
  );
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/me");
      const nextProfile = res.data as Profile;
      setProfile(nextProfile);
      if (!editingName) {
        setNameDraft(nextProfile.name);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [editingName]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading || !profile) {
    return <View style={styles.center}><StatusBar barStyle="light-content" backgroundColor="#0a0a0a" /><LoadingSpinner /></View>;
  }

  const xpNeeded = (profile.level) * 100;
  const xpPct = Math.round((profile.xp / xpNeeded) * 100);
  const shortWallet = profile.wallet.slice(0, 6) + "..." + profile.wallet.slice(-4);
  const timerValue = (ts?: string | null): string => {
    if (!ts) return "Full";
    const t = new Date(ts);
    if (Number.isNaN(t.getTime()) || t.getTime() <= Date.now()) {
      return "Full";
    }
    return t.toLocaleTimeString();
  };
  const canEditName = nameDraft.trim().length >= 3 && nameDraft.trim().length <= 20;
  const nerveStatus = profile.nerve >= profile.maxNerve ? "Full" : timerValue(profile.nextNerveAt);
  const energyStatus = profile.energy >= profile.maxEnergy ? "Full" : timerValue(profile.nextEnergyAt);
  const hospitalStatus = timerValue(profile.hospitalUntil);
  const shieldStatus = profile.shieldUntil && new Date(profile.shieldUntil).getTime() > Date.now()
    ? timerValue(profile.shieldUntil)
    : "Max";
  const nerveStatusColor = profile.nerve >= profile.maxNerve ? "#14F195" : "#1e88e5";
  const energyStatusColor = profile.energy >= profile.maxEnergy ? "#14F195" : "#66bb6a";
  const shieldStatusColor = profile.shieldUntil && new Date(profile.shieldUntil).getTime() > Date.now() ? "#1e88e5" : "#14F195";

  const editName = async () => {
    const next = nameDraft.trim();
    if (next.length < 3) {
      setNameError("Name must be at least 3 characters");
      return;
    }
    if (next.length > 20) {
      setNameError("Name cannot be longer than 20 characters");
      return;
    }
    if (next === profile?.name) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    setNameError("");
    try {
      const res = await api.patch("/me", { name: next });
      setProfile((current) => (current ? { ...current, name: res.data.name } : current));
      setEditingName(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Could not update name";
      Alert.alert("Error", msg);
    } finally {
      setSavingName(false);
    }
  };

  const cancelNameEdit = () => {
    setEditingName(false);
    setNameDraft(profile?.name ?? "");
    setNameError("");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <StatusBars profile={profile} />
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchData} tintColor="#9945FF" />}
      >
        {/* Identity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>IDENTITY</Text>
          <View style={styles.identityRow}>
            <Text style={styles.identityLabel}>Name</Text>
            {!editingName ? (
              <Text style={styles.nameRowValue}>{profile.name}</Text>
            ) : (
              <TextInput
                value={nameDraft}
                onChangeText={(value) => {
                  setNameDraft(value);
                  setNameError("");
                }}
                style={[styles.nameInput, styles.rightNameInput, styles.nameInputInline]}
                placeholder="Enter new name"
                placeholderTextColor="#555"
                maxLength={20}
              />
            )}
          </View>
          {editingName ? (
            <View style={styles.nameErrorRow}>
              {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
            </View>
          ) : null}
          <StatRow label="Level" value={profile.level} color="#9945FF" />
          <StatRow label="XP" value={`${profile.xp} / ${xpNeeded}  (${xpPct}%)`} color="#fdd835" />
          <StatRow label="Wallet" value={shortWallet} color="#555" />
          <StatRow label="Rank Points" value={profile.rp.toLocaleString()} color="#14F195" />
          {!editingName ? (
            <View style={styles.nameActionsBottom}>
              <Pressable
                onPress={() => {
                  setNameDraft(profile.name);
                  setNameError("");
                  setEditingName(true);
                }}
                style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.editButtonText}>EDIT</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.nameActionsBottom}>
              <View style={styles.nameActions}>
                <Pressable
                  onPress={editName}
                  disabled={savingName || !canEditName}
                  style={({ pressed }) => [
                    styles.saveButton,
                    (savingName || !canEditName) ? styles.disabledButton : null,
                    pressed && (savingName || !canEditName ? null : { opacity: 0.75 }),
                  ]}
                >
                  <Text style={styles.saveButtonText}>{savingName ? "SAVING..." : "SAVE"}</Text>
                </Pressable>
                <Pressable
                  onPress={cancelNameEdit}
                  disabled={savingName}
                  style={({ pressed }) => [styles.cancelButton, pressed && !savingName ? { opacity: 0.75 } : null]}
                >
                  <Text style={styles.cancelButtonText}>CANCEL</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Bars */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STATUS</Text>
          <StatBar label="Health" current={profile.health} max={profile.maxHealth} color="#ef5350" />
          <StatBar label="Energy" current={profile.energy} max={profile.maxEnergy} color="#66bb6a" />
          <StatBar label="Nerve" current={profile.nerve} max={profile.maxNerve} color="#1e88e5" />
          <StatBar label="Happiness" current={profile.happiness} max={profile.maxHappiness} color="#fdd835" />
        </View>

        {/* Economy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ECONOMY</Text>
          <StatRow label="Cash" value={`$${profile.cash.toLocaleString()}`} color="#66bb6a" />
          <StatRow label="Income/hr" value={`$${profile.incomePerHour.toLocaleString()}`} color="#66bb6a" />
        </View>

        {/* Combat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COMBAT</Text>
          <StatRow label="Attack Power" value={profile.ap} color="#ef5350" />
          <StatRow label="Defensive Power" value={profile.dp} color="#1e88e5" />
          {profile.statBreakdown?.itemBonuses ? (
            <>
              <StatRow label="Item ATK Bonus" value={profile.statBreakdown.itemBonuses.atk} color="#ef5350" />
              <StatRow label="Item DEF Bonus" value={profile.statBreakdown.itemBonuses.def} color="#1e88e5" />
              <StatRow label="Item SPD Bonus" value={profile.statBreakdown.itemBonuses.speed} color="#9945FF" />
              <StatRow label="Item DEX Bonus" value={profile.statBreakdown.itemBonuses.dex} color="#fdd835" />
            </>
          ) : null}
          <View style={styles.divider} />
          <StatRow label="Strength" value={profile.strength} color="#ff9800" />
          <StatRow label="Speed" value={profile.speed} color="#ab47bc" />
          <StatRow label="Defense" value={profile.defense} color="#26c6da" />
          <StatRow label="Dexterity" value={profile.dexterity} color="#fdd835" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYNDICATE</Text>
          {profile.syndicate ? (
            <>
              <StatRow label="Name" value={profile.syndicate.name} color="#14F195" />
              <StatRow label="Role" value={profile.syndicate.role.toUpperCase()} color="#9945FF" />
              <StatRow label="Buff" value={`+${Math.round(profile.syndicate.buffValue * 100)}% ${profile.syndicate.buffType.toUpperCase()}`} color="#66bb6a" />
            </>
          ) : (
            <Text style={{ color: "#555", fontSize: 12 }}>Not in a syndicate yet.</Text>
          )}
        </View>

        {/* Timers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TIMERS</Text>
          {hospitalStatus !== "Full" ? <StatRow label="Hospital Until" value={hospitalStatus} color="#ef5350" /> : null}
          <StatRow label="Shield Until" value={shieldStatus} color={shieldStatusColor} />
          <StatRow
            label="Next Energy"
            value={energyStatus}
            color={energyStatusColor}
          />
          <StatRow
            label="Next Nerve"
            value={nerveStatus}
            color={nerveStatusColor}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  scroll: { flex: 1, padding: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  section: { backgroundColor: "#141414", borderRadius: 6, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#1e1e1e" },
  sectionTitle: { color: "#555", fontSize: 9, fontWeight: "900", letterSpacing: 3, marginBottom: 10, textTransform: "uppercase" },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 },
  statLabel: { color: "#555", fontSize: 12 },
  statValue: { color: "#eee", fontSize: 13, fontWeight: "700" },
  identityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, marginBottom: 4 },
  identityLabel: { color: "#555", fontSize: 12 },
  nameRowValue: { color: "#eee", fontSize: 13, fontWeight: "700", textAlign: "right", flex: 1, marginLeft: 8 },
  nameActionsBottom: { alignItems: "center", marginTop: 2, marginBottom: 8 },
  nameErrorRow: { marginBottom: 8 },
  nameInput: { backgroundColor: "#111", borderColor: "#1e1e1e", borderWidth: 1, borderRadius: 6, color: "#eee", paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  nameInputInline: { flex: 1, marginLeft: 8, marginBottom: 0 },
  rightNameInput: { textAlign: "right" },
  nameActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  editButton: { borderWidth: 1, borderColor: "rgba(20,241,149,0.35)", borderRadius: 5, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#111" },
  editButtonText: { color: "#14F195", fontSize: 10, letterSpacing: 1, fontWeight: "900" },
  saveButton: { borderWidth: 1, borderColor: "rgba(102,187,106,0.45)", borderRadius: 5, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#1a241a" },
  saveButtonText: { color: "#66bb6a", fontSize: 10, letterSpacing: 1, fontWeight: "900" },
  cancelButton: { borderWidth: 1, borderColor: "#2d2d2d", borderRadius: 5, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#111" },
  cancelButtonText: { color: "#555", fontSize: 10, letterSpacing: 1, fontWeight: "900" },
  disabledButton: { opacity: 0.45 },
  errorText: { color: "#ef5350", fontSize: 11, marginTop: -2, marginBottom: 8 },
  divider: { borderTopWidth: 1, borderTopColor: "#1e1e1e", marginVertical: 6 },
  barContainer: { marginBottom: 10 },
  barHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  barLabel: { color: "#555", fontSize: 11 },
  barNumbers: { fontSize: 11, fontWeight: "700" },
  barTrack: { height: 6, backgroundColor: "#1e1e1e", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
});

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Heart } from "lucide-react-native";
import { Profile } from "../navigation/AppNavigator";

interface Props {
  profile: Profile | null;
}

function AnimatedBar({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(current / max, 1) : 0;
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct * 100,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [pct, widthAnim]);

  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: color, width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) },
          ]}
        />
      </View>
      <Text style={styles.barValue}>{current}/{max}</Text>
    </View>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + "20" }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export default function StatusBars({ profile }: Props) {
  if (!profile) return null;

  return (
    <View style={styles.container}>
      {profile.inHospital && (
        <View style={styles.hospitalBanner}>
          <Heart size={12} color="#ef5350" strokeWidth={2.5} />
          <Text style={styles.hospitalText}>IN HOSPITAL</Text>
        </View>
      )}
      <AnimatedBar label="HP" current={profile.health} max={profile.maxHealth} color="#e53935" />
      <AnimatedBar label="EN" current={profile.energy} max={profile.maxEnergy} color="#43a047" />
      <AnimatedBar label="NV" current={profile.nerve} max={profile.maxNerve} color="#1e88e5" />
      <AnimatedBar label="HA" current={profile.happiness} max={profile.maxHappiness} color="#fdd835" />
      <View style={styles.infoRow}>
        <Pill label={`LV ${profile.level}`} color="#9945FF" />
        <Text style={styles.xpText}>XP {profile.xp}/{100 * profile.level}</Text>
        <Text style={styles.cashText}>${Math.floor(profile.cash).toLocaleString()}</Text>
        <Text style={styles.apText}>AP {profile.ap}</Text>
        <Text style={styles.dpText}>DP {profile.dp}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e1e",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  barLabel: {
    color: "#555",
    fontSize: 9,
    fontWeight: "700",
    width: 20,
    letterSpacing: 1,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#1e1e1e",
    borderRadius: 4,
    overflow: "hidden",
    marginHorizontal: 6,
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  barValue: {
    color: "#555",
    fontSize: 9,
    fontWeight: "700",
    width: 48,
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  pill: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 9,
    fontWeight: "700",
  },
  xpText: {
    color: "#fdd835",
    fontSize: 9,
    fontWeight: "700",
  },
  cashText: {
    color: "#66bb6a",
    fontSize: 9,
    fontWeight: "700",
    flex: 1,
  },
  apText: {
    color: "#ef5350",
    fontSize: 9,
    fontWeight: "700",
  },
  dpText: {
    color: "#1e88e5",
    fontSize: 9,
    fontWeight: "700",
  },
  hospitalBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a0a0a",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#7f1919",
    padding: 6,
    marginBottom: 8,
    gap: 6,
  },
  hospitalText: {
    color: "#ef5350",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 3,
  },
});

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
  StatusBar,
  ImageBackground,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Sword, Shield, Package, Zap } from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";
import { api } from "../api/client";
import { Profile } from "../navigation/AppNavigator";
import StatusBars from "../components/StatusBars";
import LoadingSpinner from "../components/LoadingSpinner";
import { SHOP_IMG, TEXTURE } from "../assets/images";

interface ShopItem {
  id: string;
  category: "unit" | "equipment";
  name: string;
  atk: number;
  def: number;
  speed: number;
  dex: number;
  price: number;
  levelRequirement: number;
  locked: boolean;
  description?: string;
  owned: number;
}

export default function ShopScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [category, setCategory] = useState<"unit" | "equipment">("unit");
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [buying, setBuying] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, itemsRes] = await Promise.all([
        api.get("/me"),
        api.get("/shop/items"),
      ]);
      setProfile(profileRes.data as Profile);
      const payload = itemsRes.data as { all: ShopItem[] };
      const data = payload.all;
      setItems(data);
      const initQty: Record<string, string> = {};
      data.forEach((item) => { initQty[item.id] = "1"; });
      setQuantities((prev) => ({ ...initQty, ...prev }));
    } catch {
      Alert.alert("Error", "Failed to load shop");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const buy = async (item: ShopItem) => {
    const qty = parseInt(quantities[item.id] ?? "1", 10);
    if (isNaN(qty) || qty < 1 || qty > 100) {
      Alert.alert("Invalid quantity", "Enter a number between 1 and 100");
      return;
    }
    setBuying((prev) => ({ ...prev, [item.id]: true }));
    try {
      const res = await api.post("/shop/buy", { itemId: item.id, qty });
      const data = res.data as { success: boolean; newCash: number; qty: number };
      Alert.alert("Purchased!", `Bought ${data.qty}x ${item.name}\nNew cash: $${Math.floor(data.newCash).toLocaleString()}`);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Purchase failed";
      Alert.alert("Error", msg);
    } finally {
      setBuying((prev) => ({ ...prev, [item.id]: false }));
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
        <ImageBackground source={SHOP_IMG} style={styles.heroImage} imageStyle={styles.heroImageStyle}>
          <LinearGradient colors={["transparent", "#0a0a0a"]} style={styles.heroGradient} />
          <View style={styles.heroTextWrap}>
            <Text style={styles.title}>ITEM SHOP</Text>
            <Text style={styles.subtitle}>Buy equipment to boost AP and DP</Text>
          </View>
        </ImageBackground>
      </View>
      <FlatList
        style={styles.list}
        data={items.filter((i) => i.category === category)}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchData} tintColor="#9945FF" />}
        ListHeaderComponent={
          <View style={styles.tabsRow}>
            <Pressable style={[styles.tabBtn, category === "unit" && styles.tabBtnActive]} onPress={() => setCategory("unit")}>
              <Text style={[styles.tabText, category === "unit" && styles.tabTextActive]}>UNITS</Text>
            </Pressable>
            <Pressable style={[styles.tabBtn, category === "equipment" && styles.tabBtnActive]} onPress={() => setCategory("equipment")}>
              <Text style={[styles.tabText, category === "equipment" && styles.tabTextActive]}>EQUIPMENT</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.locked && { opacity: 0.45 }]}>
            <View style={styles.cardHeader}>
              <View style={styles.nameRow}>
                <Package size={14} color="#eee" />
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <View style={styles.ownedPill}>
                <Text style={styles.ownedPillText}>{item.owned} OWNED</Text>
              </View>
            </View>
            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Sword size={10} color="#ef5350" />
                <Text style={styles.atkChip}>ATK +{item.atk}</Text>
              </View>
              <View style={styles.chip}>
                <Shield size={10} color="#1e88e5" />
                <Text style={styles.defChip}>DEF +{item.def}</Text>
              </View>
              <View style={styles.chip}>
                <Zap size={10} color="#9945FF" />
                <Text style={styles.spdChip}>SPD +{item.speed}</Text>
              </View>
              <Text style={styles.dexChip}>DEX +{item.dex}</Text>
              <Text style={styles.priceChip}>${item.price.toLocaleString()}</Text>
            </View>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            <Text style={styles.reqText}>LV REQ {item.levelRequirement}</Text>
            <View style={styles.buyRow}>
              <TextInput
                style={styles.qtyInput}
                keyboardType="numeric"
                value={quantities[item.id] ?? "1"}
                onChangeText={(v) => setQuantities((prev) => ({ ...prev, [item.id]: v }))}
                maxLength={3}
                placeholderTextColor="#555"
              />
              <Pressable
                style={({ pressed }) => [
                  styles.buyButton,
                  buying[item.id] && styles.buyButtonDisabled,
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => buy(item)}
                disabled={buying[item.id] || item.locked}
              >
                {buying[item.id] ? (
                  <LoadingSpinner size={16} color="#9945FF" />
                ) : (
                  <Text style={styles.buyButtonText}>{item.locked ? "LOCKED" : "BUY"}</Text>
                )}
              </Pressable>
            </View>
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
  tabsRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tabBtn: { flex: 1, borderWidth: 1, borderColor: "#1e1e1e", borderRadius: 6, paddingVertical: 8, alignItems: "center", backgroundColor: "#111" },
  tabBtnActive: { borderColor: "rgba(153,69,255,0.3)", backgroundColor: "#1a0a2e" },
  tabText: { color: "#555", fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  tabTextActive: { color: "#9945FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  title: { color: "#eee", fontSize: 10, fontWeight: "900", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 },
  subtitle: { color: "#555", fontSize: 11 },
  card: { backgroundColor: "#141414", borderRadius: 6, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: "#1e1e1e" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemName: { color: "#eee", fontSize: 15, fontWeight: "700" },
  ownedPill: { backgroundColor: "#9945FF20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  ownedPillText: { color: "#9945FF", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4 },
  atkChip: { color: "#ef5350", fontSize: 12, fontWeight: "700" },
  defChip: { color: "#1e88e5", fontSize: 12, fontWeight: "700" },
  spdChip: { color: "#9945FF", fontSize: 12, fontWeight: "700" },
  dexChip: { color: "#fdd835", fontSize: 12, fontWeight: "700" },
  priceChip: { color: "#66bb6a", fontSize: 12, fontWeight: "700" },
  desc: { color: "#555", fontSize: 10, marginBottom: 6 },
  reqText: { color: "#555", fontSize: 9, fontWeight: "900", letterSpacing: 2, marginBottom: 8 },
  buyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyInput: { backgroundColor: "#1e1e1e", color: "#eee", borderRadius: 6, padding: 8, width: 60, textAlign: "center", fontSize: 14, borderWidth: 1, borderColor: "#333" },
  buyButton: { backgroundColor: "#1a0a2e", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 6, flex: 1, alignItems: "center", borderWidth: 1, borderColor: "rgba(153,69,255,0.3)" },
  buyButtonDisabled: { opacity: 0.4 },
  buyButtonText: { color: "#9945FF", fontWeight: "700", fontSize: 11, letterSpacing: 2 },
});

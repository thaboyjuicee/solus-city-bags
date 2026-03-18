import React, { useState, useCallback } from "react";
import axios from "axios";
import {
  View,
  Text,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { Swords, Dumbbell, Crosshair, Trophy } from "lucide-react-native";

import { api, TOKEN_KEY } from "../api/client";
import { API_BASE_URL, APP_IDENTITY_URI } from "../config";
import { RootStackParamList } from "../navigation/AppNavigator";
import LoadingSpinner from "../components/LoadingSpinner";

const LOGIN_BACKGROUND = require("../../assets/images/SOLUS  CITY SCREEN.png");

type Nav = NativeStackNavigationProp<RootStackParamList, "Login">;

/** Decode a base64-encoded address string to Uint8Array (no Buffer needed) */
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function describeLoginError(err: unknown, step: string): string {
  if (axios.isAxiosError(err)) {
    const method = err.config?.method?.toUpperCase() ?? "REQUEST";
    const path = err.config?.url ?? "";
    const target = `${err.config?.baseURL ?? API_BASE_URL}${path}`;

    if (err.response) {
      const body = typeof err.response.data === "string" ? err.response.data : JSON.stringify(err.response.data);
      return `[${step}] API ${err.response.status} ${method} ${target} - ${body}`;
    }

    if (err.code === "ECONNABORTED") {
      return `[${step}] Timeout reaching ${target}. Check Railway cold starts or increase API timeout.`;
    }

    return `[${step}] Network error reaching ${target}. ${err.message}`;
  }

  if (err instanceof Error) {
    return `[${step}] ${err.message}`;
  }

  return `[${step}] Unexpected non-error throw (${typeof err}): ${String(err)}`;
}

type VerifyPayload = {
  wallet: string;
  message: string;
  signature: string;
};

type ChallengeResponse = {
  nonce: string;
  message: string;
};

function isTransientNetworkError(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    return !err.response;
  }

  if (err instanceof Error) {
    const lower = err.message.toLowerCase();
    return lower.includes("network request failed") || lower.includes("network error") || lower.includes("timeout");
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withNetworkRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const delaysMs = [0, 450, 1000];
  let lastErr: unknown;

  for (let attempt = 0; attempt < delaysMs.length; attempt++) {
    if (delaysMs[attempt] > 0) {
      await sleep(delaysMs[attempt]);
    }

    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientNetworkError(err) || attempt === delaysMs.length - 1) {
        throw err;
      }

      console.warn("LOGIN_NETWORK_RETRY", {
        label,
        attempt: attempt + 1,
        nextDelayMs: delaysMs[attempt + 1] ?? 0,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  throw lastErr;
}

async function probeHealth(): Promise<void> {
  try {
    await api.get("/health");
    return;
  } catch (err) {
    if (!axios.isAxiosError(err) || err.response) {
      throw err;
    }

    const target = `${API_BASE_URL}/health`;
    console.warn("HEALTH_AXIOS_NETWORK_FALLBACK", { target, code: err.code, message: err.message });
    const response = await fetch(target, { method: "GET", headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`[api_health_fetch] API ${response.status} GET ${target}`);
    }
  }
}

async function challengeWithFallback(wallet: string): Promise<ChallengeResponse> {
  const path = `/auth/challenge?wallet=${wallet}`;

  try {
    const challengeRes = await api.get(path);
    return challengeRes.data as ChallengeResponse;
  } catch (err: unknown) {
    if (!axios.isAxiosError(err) || err.response) {
      throw err;
    }

    const target = `${API_BASE_URL}${path}`;
    console.warn("AUTH_CHALLENGE_AXIOS_NETWORK_FALLBACK", { target, code: err.code, message: err.message });

    let response: Response;
    try {
      response = await fetch(target, { method: "GET", headers: { Accept: "application/json" } });
    } catch (fetchErr) {
      const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      throw new Error(`[auth_challenge_fetch] Network error reaching ${target}. ${fetchMsg}`);
    }

    const bodyText = await response.text();
    let parsedBody: unknown = bodyText;
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      // Keep raw text body when it is not JSON.
    }

    if (!response.ok) {
      const body = typeof parsedBody === "string" ? parsedBody : JSON.stringify(parsedBody);
      throw new Error(`[auth_challenge_fetch] API ${response.status} GET ${target} - ${body}`);
    }

    if (typeof parsedBody !== "object" || parsedBody === null || !(("message" in parsedBody) && ("nonce" in parsedBody))) {
      throw new Error(`[auth_challenge_fetch] API ${response.status} GET ${target} - Invalid challenge payload`);
    }

    return parsedBody as ChallengeResponse;
  }
}

async function verifyWithFallback(payload: VerifyPayload): Promise<{ token: string }> {
  try {
    const verifyRes = await api.post("/auth/verify", payload);
    const token = (verifyRes.data as { token?: unknown })?.token;
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("[auth_verify] Invalid token payload from API");
    }
    return { token };
  } catch (err: unknown) {
    // RN + Axios can occasionally throw ERR_NETWORK for POST despite endpoint being healthy.
    if (!axios.isAxiosError(err) || err.response) {
      throw err;
    }

    const target = `${API_BASE_URL}/auth/verify`;
    console.warn("AUTH_VERIFY_AXIOS_NETWORK_FALLBACK", { target, code: err.code, message: err.message });

    let response: Response;
    try {
      response = await fetch(target, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (fetchErr) {
      const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      throw new Error(`[auth_verify_fetch] Network error reaching ${target}. ${fetchMsg}`);
    }

    const bodyText = await response.text();
    let parsedBody: unknown = bodyText;
    try {
      parsedBody = JSON.parse(bodyText);
    } catch {
      // Keep raw text body when it is not JSON.
    }

    if (!response.ok) {
      const body = typeof parsedBody === "string" ? parsedBody : JSON.stringify(parsedBody);
      throw new Error(`[auth_verify_fetch] API ${response.status} POST ${target} - ${body}`);
    }

    if (typeof parsedBody !== "object" || parsedBody === null || !("token" in parsedBody)) {
      throw new Error(`[auth_verify_fetch] API ${response.status} POST ${target} - Missing token in response`);
    }

    const token = (parsedBody as { token?: unknown }).token;
    if (typeof token !== "string" || token.length === 0) {
      throw new Error(`[auth_verify_fetch] API ${response.status} POST ${target} - Invalid token type`);
    }

    return { token };
  }
}

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const [wallet, setWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectAndSign = useCallback(async () => {
    let step = "wallet_authorize";

    setLoading(true);
    setError(null);
    try {
      // --- Transact #1: Authorize with wallet (gets address + auth token) ---
      const authResult = await transact(async (mobileWallet) => {
        const { accounts, auth_token } = await mobileWallet.authorize({
          identity: {
            name: "Solus City",
            uri: APP_IDENTITY_URI,
          },
          chain: "solana:devnet",
        });

        const base64Address = accounts[0].address;
        const pubkeyBytes = base64ToBytes(base64Address);
        const walletAddress = new PublicKey(pubkeyBytes).toBase58();

        return { walletAddress, base64Address, authToken: auth_token };
      });

      const { walletAddress, base64Address, authToken } = authResult;
      setWallet(walletAddress);

      step = "api_health";
      try {
        await probeHealth();
      } catch (healthErr) {
        // Health is informative only; challenge/verify are the real blockers.
        console.warn("API_HEALTH_PROBE_FAILED_CONTINUING", healthErr);
      }

      // --- HTTP call outside transact: get challenge nonce from server ---
      step = "auth_challenge";
      const { message } = await withNetworkRetry("auth_challenge", async () => challengeWithFallback(walletAddress));

      // --- Transact #2: Reauthorize + sign the challenge message ---
      step = "wallet_sign";
      const signature = await transact(async (mobileWallet) => {
        await mobileWallet.reauthorize({
          auth_token: authToken,
          identity: {
            name: "Solus City",
            uri: APP_IDENTITY_URI,
          },
        });

        const messageBytes = new TextEncoder().encode(message);
        const signedPayloads = await mobileWallet.signMessages({
          addresses: [base64Address],
          payloads: [messageBytes],
        });

        return bs58.encode(signedPayloads[0]);
      });

      // --- HTTP call outside transact: verify signature and get JWT ---
      step = "auth_verify";
      // Let the app settle after wallet handoff before auth verify request.
      await sleep(150);
      const verifyData = await withNetworkRetry("auth_verify", async () =>
        verifyWithFallback({
          wallet: walletAddress,
          message,
          signature,
        })
      );
      const { token } = verifyData;

      // Temporary debug log: copy JWT for server smoke tests, then remove.
      console.log("JWT_DEBUG_TOKEN", token);

      await AsyncStorage.setItem(TOKEN_KEY, token);
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (err: unknown) {
      const msg = describeLoginError(err, step);
      console.error("LOGIN_FLOW_ERROR", {
        step,
        errorType: typeof err,
        errorValue: String(err),
        error: err,
      });
      setError(msg);
      Alert.alert("Login failed", msg);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  return (
    <ImageBackground source={LOGIN_BACKGROUND} style={styles.bgImage} resizeMode="cover">
      <View style={styles.bgOverlay}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
          <View style={styles.content}>
          <View style={styles.logoBox}>
            <Image source={require("../../assets/images/app_icon.png")} style={styles.logoImage} />
          </View>
          <Text style={styles.title}>SOLUS CITY</Text>
          <Text style={styles.subtitle}>Text-based crime RPG on Solana</Text>

          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <Swords size={14} color="#555" strokeWidth={1.5} />
              <Text style={styles.feature}>Fight players for loot and rank</Text>
            </View>
            <View style={styles.featureRow}>
              <Dumbbell size={14} color="#555" strokeWidth={1.5} />
              <Text style={styles.feature}>Train your combat stats in the gym</Text>
            </View>
            <View style={styles.featureRow}>
              <Crosshair size={14} color="#555" strokeWidth={1.5} />
              <Text style={styles.feature}>Commit crimes for cash and XP</Text>
            </View>
            <View style={styles.featureRow}>
              <Trophy size={14} color="#555" strokeWidth={1.5} />
              <Text style={styles.feature}>Climb the leaderboard</Text>
            </View>
          </View>

          {wallet && (
            <Text style={styles.walletText}>
              {wallet.slice(0, 6)}...{wallet.slice(-4)}
            </Text>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.button, loading && styles.buttonDisabled, pressed && { opacity: 0.75 }]}
            onPress={connectAndSign}
            disabled={loading}
          >
            {loading ? (
              <LoadingSpinner size={16} color="#9945FF" />
            ) : (
              <Text style={styles.buttonText}>CONNECT WALLET</Text>
            )}
          </Pressable>
            <Text style={styles.footer}>Powered by Solana</Text>
          </View>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
  },
  bgOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: "rgba(10,10,10,0.7)",
    borderWidth: 1,
    borderColor: "rgba(153,69,255,0.28)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  logoImage: {
    width: 78,
    height: 78,
    borderRadius: 18,
    resizeMode: "cover",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#eee",
    letterSpacing: 6,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#555",
    marginBottom: 32,
    fontWeight: "600",
  },
  featureList: {
    marginBottom: 32,
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feature: {
    color: "#555",
    fontSize: 12,
    fontWeight: "600",
  },
  walletText: {
    fontSize: 11,
    color: "#9945FF",
    marginBottom: 12,
    fontFamily: "monospace",
    fontWeight: "700",
  },
  errorText: {
    color: "#ef5350",
    marginBottom: 12,
    textAlign: "center",
    fontSize: 11,
  },
  button: {
    backgroundColor: "#1a0a2e",
    borderWidth: 1,
    borderColor: "rgba(153,69,255,0.3)",
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 6,
    minWidth: 220,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#111",
    borderColor: "#222",
  },
  buttonText: {
    color: "#9945FF",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 2,
  },
  footer: {
    color: "#333",
    fontSize: 9,
    marginTop: 24,
    letterSpacing: 2,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});

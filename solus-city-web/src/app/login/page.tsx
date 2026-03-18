"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import bs58 from "bs58";
import { api } from "@/lib/api/client";
import { TOKEN_KEY } from "@/lib/config";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type AuthState = "idle" | "authenticating" | "error";

interface ChallengeResponse {
  nonce: string;
  message: string;
}

interface VerifyResponse {
  token: string;
}

// Mirrors: LoginScreen.tsx
// Full wallet auth flow: challenge → sign → verify → JWT → /home
export default function LoginPage() {
  const { connected, publicKey, signMessage, disconnect } = useWallet();
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Guard against double-fire (React strict mode) and re-entrant calls
  const authInProgress = useRef(false);

  const runAuthFlow = useCallback(async () => {
    if (!publicKey || !signMessage || authInProgress.current) return;
    authInProgress.current = true;
    setAuthState("authenticating");
    setErrorMsg(null);

    try {
      // 1. Fetch challenge
      const { data: challenge } = await api.get<ChallengeResponse>(
        `/auth/challenge?wallet=${publicKey.toBase58()}`
      );

      // 2. Sign the challenge message — user will see a wallet popup
      let sigBytes: Uint8Array;
      try {
        sigBytes = await signMessage(new TextEncoder().encode(challenge.message));
      } catch {
        // User dismissed or rejected the signing request
        setErrorMsg("Signature request was cancelled.");
        setAuthState("error");
        return;
      }

      // 3. Verify signature and receive JWT
      const { data: verified } = await api.post<VerifyResponse>("/auth/verify", {
        wallet: publicKey.toBase58(),
        message: challenge.message,
        signature: bs58.encode(sigBytes),
      });

      // 4. Persist JWT and navigate into the app
      localStorage.setItem(TOKEN_KEY, verified.token);
      router.push("/home");
    } catch (err: unknown) {
      const serverError =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErrorMsg(serverError ?? "Authentication failed. Please try again.");
      setAuthState("error");
    } finally {
      authInProgress.current = false;
    }
  }, [publicKey, signMessage, router]);

  // Kick off auth automatically once the wallet is connected
  useEffect(() => {
    if (connected && publicKey) {
      runAuthFlow();
    } else {
      setAuthState("idle");
      setErrorMsg(null);
    }
  }, [connected, publicKey, runAuthFlow]);

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-4xl font-black tracking-widest text-accent uppercase">
          Solus City
        </h1>
        <p className="text-text-secondary text-sm tracking-wide">
          Connect your wallet to enter
        </p>
      </div>

      <div className="w-full max-w-xs flex flex-col items-center gap-4">
        {authState === "authenticating" && (
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size={36} />
            <p className="text-text-secondary text-sm">Authenticating…</p>
          </div>
        )}

        {authState === "error" && (
          <div className="w-full flex flex-col items-center gap-3">
            <p className="text-danger text-sm text-center">{errorMsg}</p>
            <button
              onClick={runAuthFlow}
              className="w-full py-2.5 bg-accent rounded-lg text-white font-semibold text-sm hover:bg-accent-dim transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => {
                disconnect();
                setAuthState("idle");
                setErrorMsg(null);
              }}
              className="text-text-dim text-xs underline"
            >
              Disconnect wallet
            </button>
          </div>
        )}

        {authState === "idle" && <WalletMultiButton className="w-full justify-center" />}
      </div>

      <p className="text-text-dim text-xs text-center max-w-xs">
        Supports Phantom and Solflare. Your wallet signs a nonce — no funds are
        transferred at login.
      </p>
    </div>
  );
}

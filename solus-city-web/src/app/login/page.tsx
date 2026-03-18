"use client";

import Image from "next/image";
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

export default function LoginPage() {
  const { connected, publicKey, signMessage, disconnect } = useWallet();
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const authInProgress = useRef(false);

  const runAuthFlow = useCallback(async () => {
    if (!publicKey || !signMessage || authInProgress.current) return;
    authInProgress.current = true;
    setAuthState("authenticating");
    setErrorMsg(null);

    try {
      const { data: challenge } = await api.get<ChallengeResponse>(
        `/auth/challenge?wallet=${publicKey.toBase58()}`
      );

      let sigBytes: Uint8Array;
      try {
        sigBytes = await signMessage(new TextEncoder().encode(challenge.message));
      } catch {
        setErrorMsg("Signature request was cancelled.");
        setAuthState("error");
        return;
      }

      const { data: verified } = await api.post<VerifyResponse>("/auth/verify", {
        wallet: publicKey.toBase58(),
        message: challenge.message,
        signature: bs58.encode(sigBytes),
      });

      localStorage.setItem(TOKEN_KEY, verified.token);
      router.push("/home");
    } catch (err: unknown) {
      const serverError =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error;
      setErrorMsg(serverError ?? "Authentication failed. Please try again.");
      setAuthState("error");
    } finally {
      authInProgress.current = false;
    }
  }, [publicKey, signMessage, router]);

  useEffect(() => {
    if (connected && publicKey) {
      runAuthFlow();
    } else {
      setAuthState("idle");
      setErrorMsg(null);
    }
  }, [connected, publicKey, runAuthFlow]);

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-[#0a0a0a] flex flex-col items-center justify-center gap-8 px-6">
      <Image
        src="/assets/images/home_character.png"
        alt="Solus city character"
        fill
        className="object-cover md:object-contain opacity-20 pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/90 via-[#0a0a0a]/65 to-[#0a0a0a]/85" />

      <div className="relative z-10 flex flex-col items-center gap-3">
        <h1 className="text-4xl font-black tracking-widest text-[#eee] uppercase">
          Solus City
        </h1>
        <p className="text-text-secondary text-sm tracking-wide">
          Connect your wallet to enter
        </p>
      </div>

      <div className="relative z-10 w-full max-w-xs flex flex-col items-center gap-4">
        {authState === "authenticating" && (
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size={36} />
            <p className="text-text-secondary text-sm">Authenticating...</p>
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

      <p className="relative z-10 text-text-dim text-xs text-center max-w-xs">
        Supports Phantom and Solflare. Your wallet signs a nonce — no funds are
        transferred at login.
      </p>
    </div>
  );
}

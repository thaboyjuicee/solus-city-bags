"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { PrestigePreviewCard } from "@/components/game/PrestigePreviewCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PrestigePreview } from "@/lib/gameApi";

export default function PrestigePage() {
  const [preview, setPreview] = useState<PrestigePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ preview: PrestigePreview }>("/prestige/preview");
      setPreview(res.data.preview);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !preview) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  return (
    <div className="flex flex-col gap-4">
      <PrestigePreviewCard
        preview={preview}
        busy={busy}
        onExecute={async () => {
          setBusy(true);
          setResult(null);
          try {
            await api.post("/prestige/execute", { confirm: true });
            setResult("Prestige executed successfully.");
            await load();
          } catch (err: unknown) {
            setResult((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Prestige failed.");
          } finally {
            setBusy(false);
          }
        }}
      />
      {result && <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-[12px] text-[#eee]">{result}</div>}
      <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-[12px] text-[#888]">
        Prestige is a transparent reset loop. Review the reset scope above carefully before committing.
      </div>
    </div>
  );
}


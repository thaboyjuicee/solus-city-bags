type DexPair = {
  priceUsd?: string;
  liquidity?: { usd?: number };
};

export async function fetchSlsPrice(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/tokens/ELTXCFp1tmtfu39CPw6afnMSjW1BBxjinorJQsKmBAGS",
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as { pairs?: DexPair[] };
    const pairs = (data.pairs ?? []).filter((pair) => pair.priceUsd);
    if (pairs.length === 0) return null;

    const best = pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    const price = parseFloat(best.priceUsd ?? "");

    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}

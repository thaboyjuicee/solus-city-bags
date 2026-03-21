"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StatusBars } from "@/components/ui/StatusBars";
import { MeResponse, BlackMarketListing, BlackMarketRotation } from "@/lib/gameApi";

function formatTimeLeft(seconds: number) {
  if (seconds <= 0) return "Refreshing now";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export default function BlackMarketPage() {
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [rotation, setRotation] = useState<BlackMarketRotation | null>(null);
  const [listings, setListings] = useState<BlackMarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [meRes, rotationRes, listingsRes] = await Promise.all([
        api.get<MeResponse>("/me"),
        api.get<{ rotation: BlackMarketRotation }>("/black-market/rotation"),
        api.get<{ rotation: BlackMarketRotation; listings: BlackMarketListing[] }>("/black-market/listings"),
      ]);
      setProfile(meRes.data);
      setRotation(rotationRes.data.rotation);
      setListings(listingsRes.data.listings);
      setError(null);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to load black market.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const grouped = useMemo(() => {
    return listings.reduce<Record<string, BlackMarketListing[]>>((acc, listing) => {
      acc[listing.listingType] = [...(acc[listing.listingType] ?? []), listing];
      return acc;
    }, {});
  }, [listings]);

  const buy = async (listing: BlackMarketListing) => {
    setBuyingId(listing.id);
    try {
      await api.post("/black-market/buy", { listingId: listing.id, qty: 1 });
      await fetchData();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Purchase failed.");
    } finally {
      setBuyingId(null);
    }
  };

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (error && !profile) return <div className="flex min-h-dvh items-center justify-center text-[#ef5350]">{error}</div>;

  return (
    <div className="flex flex-col gap-3">
      {profile && <StatusBars profile={profile} />}

      <div className="rounded-lg border border-white/10 bg-black/20 backdrop-blur-sm p-4">
        <p className="text-[10px] font-black tracking-[3px] text-[#9945FF] uppercase">Black Market</p>
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-[#eee] text-lg font-black">{rotation?.theme?.toUpperCase() ?? "ACTIVE ROTATION"}</p>
            <p className="text-[11px] text-[#555]">Wallet: ${Math.floor(profile?.cash ?? 0).toLocaleString()} • Heat: {profile?.heat ?? 0}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold tracking-[2px] text-[#555]">ROTATES IN</p>
            <p className="text-sm font-black text-[#fdd835]">{formatTimeLeft(rotation?.secondsRemaining ?? 0)}</p>
          </div>
        </div>
      </div>

      {error && <p className="text-[10px] font-bold text-[#ef5350]">{error}</p>}

      {Object.entries(grouped).map(([group, entries]) => (
        <div key={group} className="flex flex-col gap-2">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">{group}</p>
          {entries.map((listing) => (
            <div key={listing.id} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-md p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[13px] font-bold text-[#eee]">{listing.item.name}</p>
                  <p className="text-[10px] text-[#555]">{listing.item.description}</p>
                </div>
                <span className="text-[10px] font-black text-[#66bb6a]">${Math.floor(listing.finalPrice).toLocaleString()}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                <span className="text-[#42a5f5]">Stock {listing.remainingStock}/{listing.stock}</span>
                <span className="text-[#fdd835]">Heat {listing.requiredHeatMin}+</span>
                <span className="text-[#ff9800]">Level {listing.requiredLevelMin}+</span>
                <span className="text-[#ef5350]">Risk {listing.riskPercent}%</span>
              </div>
              <button
                onClick={() => buy(listing)}
                disabled={buyingId === listing.id || !listing.active}
                className="w-full py-2 rounded border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF] text-[10px] font-black tracking-[2px] disabled:opacity-40"
              >
                {buyingId === listing.id ? "BUYING..." : "BUY"}
              </button>
            </div>
          ))}
        </div>
      ))}

      <div className="h-16 md:hidden" />
    </div>
  );
}

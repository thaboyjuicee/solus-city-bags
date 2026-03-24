"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trophy } from "lucide-react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { LeaderboardResponse } from "@/lib/gameApi";

type LeaderboardTab = LeaderboardResponse["type"];

const TABS: LeaderboardTab[] = ["season", "pvp", "crime", "syndicates", "prestige", "hall_of_fame"];

function getRankColor(rank: number): string {
  if (rank === 1) return "#fdd835";
  if (rank === 2) return "#bbbbbb";
  if (rank === 3) return "#cd7f32";
  return "#555555";
}

function RankCell({ rank }: { rank: number }) {
  const color = getRankColor(rank);
  if (rank <= 3) {
    return <Trophy className="h-3.5 w-3.5" style={{ color }} />;
  }
  return (
    <span className="text-[12px] font-bold" style={{ color }}>
      {rank}
    </span>
  );
}

function getBoardSubtitle(type: LeaderboardTab) {
  switch (type) {
    case "season":
      return "Top players ranked by seasonal score";
    case "pvp":
      return "Top fighters ranked by PvP performance";
    case "crime":
      return "Top earners and operators on the street";
    case "syndicates":
      return "Syndicates ranked by season performance";
    case "prestige":
      return "Veteran ladder ranked by prestige progression";
    case "hall_of_fame":
      return "Historic winners and standout legends";
  }
}

function getScoreLabel(type: LeaderboardTab) {
  switch (type) {
    case "season":
      return "SEASON";
    case "pvp":
      return "PVP";
    case "crime":
      return "CRIME";
    case "syndicates":
      return "PTS";
    case "prestige":
      return "PRESTIGE";
    case "hall_of_fame":
      return "RANK";
  }
}

function isPlayerBoard(type: LeaderboardTab) {
  return type === "season" || type === "pvp" || type === "crime";
}

function getScoreValue(type: LeaderboardTab, entry: LeaderboardResponse["entries"][number]) {
  if (type === "prestige") return entry.prestigeLevel ?? entry.prestigePoints ?? 0;
  if (type === "hall_of_fame") return entry.rank ?? 0;
  return entry.score ?? entry.seasonScore ?? entry.rp ?? 0;
}

function getPlayerBoardScoreLabel(type: LeaderboardTab) {
  switch (type) {
    case "season":
      return "SEASON";
    case "crime":
      return "CRIME";
    case "pvp":
    default:
      return "PVP";
  }
}

function getPlayerBoardScoreValue(type: LeaderboardTab, entry: LeaderboardResponse["entries"][number]) {
  switch (type) {
    case "season":
      return entry.score ?? entry.seasonScore ?? 0;
    case "crime":
      return entry.crimeScore ?? entry.score ?? 0;
    case "pvp":
    default:
      return entry.pvpScore ?? entry.score ?? 0;
  }
}

function getSecondaryText(type: LeaderboardTab, entry: LeaderboardResponse["entries"][number]) {
  switch (type) {
    case "syndicates":
      return `${entry.membersCount ?? 0} members • War ${entry.warRating ?? 0}`;
    case "prestige":
      return `Prestige ${entry.prestigeLevel ?? 0} • Points ${entry.prestigePoints ?? 0}`;
    case "hall_of_fame":
      return `${entry.category?.replaceAll("_", " ") ?? "legend"} • ${entry.seasonName ?? "history"}`;
    case "season":
      return `LV ${entry.level ?? 1}`;
    case "crime":
      return `LV ${entry.level ?? 1}`;
    case "pvp":
    default:
      return `LV ${entry.level ?? 1}`;
  }
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<LeaderboardTab>("pvp");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (nextTab: LeaderboardTab, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get<LeaderboardResponse>(`/leaderboard?type=${nextTab}`);
      setData(res.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(tab);
  }, [fetchData, tab]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[3px] text-[#eee]">Leaderboard</p>
          <p className="mt-0.5 text-[11px] font-semibold text-text-dim">{getBoardSubtitle(tab)}</p>
        </div>
        <button
          onClick={() => fetchData(tab, true)}
          disabled={refreshing || loading}
          className="rounded border border-white/10 bg-black/20 p-2 text-text-dim transition-colors hover:text-text-secondary disabled:opacity-50"
          aria-label="Refresh leaderboard"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-6">
        {TABS.map((entry) => (
          <button
            key={entry}
            onClick={() => setTab(entry)}
            className={`min-w-0 rounded-md border px-2 py-2 text-center text-[8px] font-black uppercase tracking-[0.5px] sm:text-[9px] sm:tracking-[1px] ${
              tab === entry
                ? "border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] text-[#9945FF]"
                : "border-white/10 bg-black/20 text-[#666]"
            }`}
          >
            <span className="block leading-tight">{entry.replace(/_/g, " ")}</span>
          </button>
        ))}
      </div>

      {loading || !data ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size={28} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
          {isPlayerBoard(data.type) ? (
            <div className="flex items-center border-b border-white/10 bg-black/20 px-3 py-2">
              <span className="w-8 text-[9px] font-black uppercase tracking-[2px] text-text-dim">#</span>
              <span className="flex-1 text-[9px] font-black uppercase tracking-[2px] text-text-dim">Player</span>
              <span className="w-8 text-center text-[9px] font-black uppercase tracking-[2px] text-text-dim">LV</span>
              <span className="w-14 text-right text-[9px] font-black uppercase tracking-[2px] text-text-dim">RP</span>
              <span className="w-14 text-right text-[9px] font-black uppercase tracking-[2px] text-text-dim">
                {getPlayerBoardScoreLabel(data.type)}
              </span>
            </div>
          ) : (
            <div className="flex items-center border-b border-white/10 bg-black/20 px-3 py-2">
              <span className="w-8 text-[9px] font-black uppercase tracking-[2px] text-text-dim">#</span>
              <span className="flex-1 text-[9px] font-black uppercase tracking-[2px] text-text-dim">Player</span>
              <span className="w-16 text-right text-[9px] font-black uppercase tracking-[2px] text-text-dim">
                {getScoreLabel(data.type)}
              </span>
            </div>
          )}

          {data.entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-dim">No entries yet.</p>
          ) : (
            data.entries.map((entry, index) => (
              isPlayerBoard(data.type) ? (
                <div
                  key={`${tab}-${entry.userId ?? entry.name}-${entry.rank}`}
                  className={`flex items-center px-3 py-2.5 ${
                    index < data.entries.length - 1 ? "border-b border-[#111]" : ""
                  } ${entry.isMe ? "bg-[#1a0a2e]" : ""}`}
                >
                  <div className="flex w-8 items-center">
                    <RankCell rank={entry.rank} />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`truncate text-[12px] ${entry.isMe ? "font-bold text-[#9945FF]" : "text-[#ccc]"}`}>
                      {entry.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9px] text-text-dim">
                      <span>
                        AP <span className="font-bold text-[#ef5350]">{entry.ap ?? 0}</span>
                      </span>
                      <span>
                        DP <span className="font-bold text-[#1e88e5]">{entry.dp ?? 0}</span>
                      </span>
                    </div>
                  </div>

                  <span className="w-8 text-center text-[12px] text-text-dim">
                    {entry.level ?? 1}
                  </span>

                  <span className="w-14 text-right text-[12px] font-bold text-text-dim">
                    {(entry.rp ?? 0).toLocaleString()}
                  </span>

                  <span className="w-14 text-right text-[12px] font-bold text-[#14F195]">
                    {getPlayerBoardScoreValue(data.type, entry).toLocaleString()}
                  </span>
                </div>
              ) : (
                <div
                  key={`${tab}-${entry.userId ?? entry.name}-${entry.rank}`}
                  className={`flex items-center px-3 py-2.5 ${
                    index < data.entries.length - 1 ? "border-b border-[#111]" : ""
                  } ${entry.isMe ? "bg-[#1a0a2e]" : ""}`}
                >
                  <div className="flex w-8 items-center">
                    <RankCell rank={entry.rank} />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`truncate text-[12px] ${entry.isMe ? "font-bold text-[#9945FF]" : "text-[#ccc]"}`}>
                      {entry.name}
                    </span>
                    <span className="truncate text-[9px] text-text-dim">{getSecondaryText(data.type, entry)}</span>
                  </div>

                  <span className="w-16 text-right text-[12px] font-bold text-[#14F195]">
                    {getScoreValue(data.type, entry).toLocaleString()}
                  </span>
                </div>
              )
            ))
          )}
        </div>
      )}
    </div>
  );
}

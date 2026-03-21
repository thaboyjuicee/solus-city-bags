"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SyndicateVaultCard } from "@/components/game/SyndicateVaultCard";
import { SyndicateRoleBadge } from "@/components/game/SyndicateRoleBadge";
import { WarScoreboard } from "@/components/game/WarScoreboard";
import { ContributionList } from "@/components/game/ContributionList";
import { TerritoryBonusBadge } from "@/components/game/TerritoryBonusBadge";

type MeLite = { syndicate?: { id: string } | null };

type SyndicateSummary = {
  id: string;
  name: string;
  description: string;
  vaultCash: number;
  seasonPoints: number;
  territoryCount: number;
  warRating: number;
  rolePermissions?: { manageRoles: boolean; withdrawVault: boolean; manageWar: boolean; recruit: boolean };
  currentWarStatus?: {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    attackerScore: number;
    defenderScore: number;
    territory?: { id: string; name: string; code: string } | null;
    attackerSyndicate?: { id: string; name: string } | null;
    defenderSyndicate?: { id: string; name: string } | null;
  } | null;
  territoriesOwned?: Array<{ id: string; name: string; code: string; bonusType: string; bonusValue: number }>;
  members?: Array<{ userId: string; name: string; role: string; contributionScore: number; warParticipation: number }>;
  memberContributionLeaders?: Array<{ userId: string; name: string; role: string; contributionScore: number; warParticipation: number }>;
  championshipQualification?: {
    qualified: boolean;
    championshipSeasonId: string | null;
    seed: number | null;
    qualifyingPoints: number | null;
    currentMatch: {
      id: string;
      round: number;
      status: string;
      startsAt: string;
      endsAt: string;
      scoreA: number;
      scoreB: number;
      winnerSyndicateId: string | null;
    } | null;
  };
  championHistory?: Array<{ id: string; seasonId: string; seasonName: string; rank: number; display: Record<string, unknown> }>;
};

const DEFAULT_BUFF_TYPE = "crime_payout";
const DEFAULT_BUFF_VALUE = 0.05;

export default function SyndicatesPage() {
  const [syndicates, setSyndicates] = useState<SyndicateSummary[]>([]);
  const [detail, setDetail] = useState<SyndicateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await api.get<MeLite>("/me");
      if (meRes.data.syndicate?.id) {
        const detailRes = await api.get<SyndicateSummary>(`/syndicates/${meRes.data.syndicate.id}`);
        setDetail(detailRes.data);
        setSyndicates([]);
      } else {
        const listRes = await api.get<SyndicateSummary[] | { syndicates: SyndicateSummary[] }>("/syndicates");
        const nextList = Array.isArray(listRes.data) ? listRes.data : listRes.data.syndicates;
        setSyndicates(nextList ?? []);
        setDetail(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size={32} /></div>;

  if (!detail) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Create Syndicate</p>
          <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-[#eee] outline-none" placeholder="Syndicate name" />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-[#eee] outline-none" placeholder="Description" />
          <button
            type="button"
            disabled={busy === "create" || name.trim().length < 3}
            onClick={async () => {
              setBusy("create");
              try {
                await api.post("/syndicates", {
                  name: name.trim(),
                  description: description.trim(),
                  buffType: DEFAULT_BUFF_TYPE,
                  buffValue: DEFAULT_BUFF_VALUE,
                });
                setName("");
                setDescription("");
                await load();
              } finally {
                setBusy(null);
              }
            }}
            className="rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#9945FF] disabled:opacity-40"
          >
            {busy === "create" ? "CREATING..." : "CREATE SYNDICATE"}
          </button>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Available Syndicates</p>
          {syndicates.length === 0 ? (
            <p className="text-[12px] text-[#777]">No syndicates available yet.</p>
          ) : (
            syndicates.map((syndicate) => (
              <div key={syndicate.id} className="rounded-md border border-white/10 bg-black/20 p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[14px] font-black text-[#eee]">{syndicate.name}</p>
                  <p className="text-[11px] text-[#777] mt-1">{syndicate.description}</p>
                  <p className="text-[10px] text-[#888] mt-2">Season {syndicate.seasonPoints} • Territories {syndicate.territoryCount} • War {syndicate.warRating}</p>
                </div>
                <button
                  type="button"
                  disabled={busy === syndicate.id}
                  onClick={async () => {
                    setBusy(syndicate.id);
                    try {
                      await api.post(`/syndicates/${syndicate.id}/join`);
                      await load();
                    } finally {
                      setBusy(null);
                    }
                  }}
                  className="rounded-md border border-[#1f5f36] bg-[#0f2a18] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#66bb6a] disabled:opacity-40"
                >
                  {busy === syndicate.id ? "JOINING..." : "JOIN"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Syndicate HQ</p>
            <p className="text-[20px] font-black text-[#eee] mt-1">{detail.name}</p>
            <p className="text-[12px] text-[#888] mt-1">{detail.description}</p>
          </div>
          <button
            type="button"
            disabled={busy === "leave"}
            onClick={async () => {
              setBusy("leave");
              try {
                await api.post("/syndicates/leave");
                await load();
              } finally {
                setBusy(null);
              }
            }}
            className="rounded-md border border-[#6d4c41] bg-[#231412] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#ff8a65] disabled:opacity-40"
          >
            {busy === "leave" ? "LEAVING..." : "LEAVE"}
          </button>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Season</p><p className="text-[16px] font-black text-[#66bb6a] mt-1">{detail.seasonPoints}</p></div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">Territories</p><p className="text-[16px] font-black text-[#42a5f5] mt-1">{detail.territoryCount}</p></div>
          <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] font-black tracking-[2px] text-[#555] uppercase">War Rating</p><p className="text-[16px] font-black text-[#ff8a65] mt-1">{detail.warRating}</p></div>
        </div>
      </div>

      <SyndicateVaultCard
        vaultCash={detail.vaultCash}
        canDeposit
        canWithdraw={!!detail.rolePermissions?.withdrawVault}
        busy={busy === "deposit" || busy === "withdraw"}
        onDeposit={async (amount) => {
          setBusy("deposit");
          try {
            await api.post("/syndicates/vault/deposit", { amount });
            await load();
          } finally {
            setBusy(null);
          }
        }}
        onWithdraw={async (amount) => {
          setBusy("withdraw");
          try {
            await api.post("/syndicates/vault/withdraw", { amount });
            await load();
          } finally {
            setBusy(null);
          }
        }}
      />

      {detail.currentWarStatus ? (
        <WarScoreboard war={detail.currentWarStatus} canManageActions={!!detail.rolePermissions?.manageWar} />
      ) : (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-[12px] text-[#777]">No active war at the moment.</div>
      )}

      {detail.championshipQualification && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Championship Status</p>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] tracking-[2px] text-[#555] uppercase">Qualified</p><p className="text-[16px] font-black text-[#66bb6a] mt-1">{detail.championshipQualification.qualified ? "YES" : "NO"}</p></div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] tracking-[2px] text-[#555] uppercase">Seed</p><p className="text-[16px] font-black text-[#42a5f5] mt-1">{detail.championshipQualification.seed ?? "-"}</p></div>
            <div className="rounded-md border border-white/10 bg-black/20 p-3"><p className="text-[9px] tracking-[2px] text-[#555] uppercase">Qualifier Score</p><p className="text-[16px] font-black text-[#fdd835] mt-1">{detail.championshipQualification.qualifyingPoints ?? 0}</p></div>
          </div>
          {detail.championshipQualification.currentMatch && (
            <p className="text-[11px] text-[#aaa]">Current match round {detail.championshipQualification.currentMatch.round} is {detail.championshipQualification.currentMatch.status}.</p>
          )}
        </div>
      )}

      {detail.territoriesOwned && detail.territoriesOwned.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Owned Territories</p>
          <div className="flex flex-wrap gap-2">
            {detail.territoriesOwned.map((territory) => (
              <div key={territory.id} className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-[12px] font-bold text-[#eee]">{territory.name}</p>
                <div className="mt-1"><TerritoryBonusBadge bonusType={territory.bonusType} bonusValue={territory.bonusValue} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Member Roster</p>
        {(detail.members ?? []).map((member) => (
          <div key={member.userId} className="rounded-md border border-white/10 bg-black/20 p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[12px] font-bold text-[#eee]">{member.name}</p>
              <div className="mt-1"><SyndicateRoleBadge role={member.role} /></div>
              <p className="text-[10px] text-[#777] mt-2">Contribution {member.contributionScore} • War {member.warParticipation}</p>
            </div>
            {detail.rolePermissions?.manageRoles && (
              <select
                defaultValue={member.role}
                onChange={async (event) => {
                  setBusy(`role-${member.userId}`);
                  try {
                    await api.post(`/syndicates/${detail.id}/role`, {
                      targetUserId: member.userId,
                      role: event.target.value,
                    });
                    await load();
                  } finally {
                    setBusy(null);
                  }
                }}
                className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-[#eee] outline-none"
              >
                <option value="leader">leader</option>
                <option value="co_leader">co_leader</option>
                <option value="treasurer">treasurer</option>
                <option value="war_captain">war_captain</option>
                <option value="recruiter">recruiter</option>
                <option value="member">member</option>
              </select>
            )}
          </div>
        ))}
      </div>

      {detail.championHistory && detail.championHistory.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Champion History</p>
          {detail.championHistory.map((entry) => (
            <div key={entry.id} className="rounded-md border border-white/10 bg-black/20 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold text-[#eee]">{detail.name}</p>
                <p className="text-[10px] text-[#777]">{entry.seasonName}</p>
              </div>
              <p className="text-[9px] tracking-[2px] uppercase text-[#fdd835]">Champion</p>
            </div>
          ))}
        </div>
      )}

      <ContributionList
        title="Top Contributors"
        items={(detail.memberContributionLeaders ?? []).map((member) => ({
          id: member.userId,
          userName: member.name,
          syndicateName: detail.name,
          actionType: member.role,
          points: member.contributionScore,
        }))}
      />
    </div>
  );
}


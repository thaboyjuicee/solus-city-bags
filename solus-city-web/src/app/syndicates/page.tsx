"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SyndicateVaultCard } from "@/components/game/SyndicateVaultCard";
import { SyndicateRoleBadge } from "@/components/game/SyndicateRoleBadge";
import { WarScoreboard } from "@/components/game/WarScoreboard";
import { ContributionList } from "@/components/game/ContributionList";
import { TerritoryBonusBadge } from "@/components/game/TerritoryBonusBadge";

type MeLite = {
  id?: string;
  syndicate?: { id: string } | null;
  currentSyndicateRole?: string | null;
};

type SyndicateMember = {
  userId: string;
  name: string;
  role: string;
  contributionScore: number;
  warParticipation: number;
};

type SyndicateSummary = {
  id: string;
  name: string;
  description: string;
  leaderId?: string | null;
  creatorId?: string | null;
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
  members?: SyndicateMember[];
  memberContributionLeaders?: SyndicateMember[];
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

type MemberRoleState = {
  open: boolean;
  draft: string;
  busy: boolean;
  success: string | null;
  error: string | null;
};

const DEFAULT_BUFF_TYPE = "crime_payout";
const DEFAULT_BUFF_VALUE = 0.05;

const ROLES = ["leader", "co_leader", "treasurer", "war_captain", "recruiter", "member"] as const;

function formatRole(role: string) {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type RoleFilter = "all" | "creator" | (typeof ROLES)[number];

function extractErrMsg(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    (err as { message?: string })?.message ??
    fallback
  );
}

const EMPTY_ROLE_STATE: MemberRoleState = {
  open: false,
  draft: "",
  busy: false,
  success: null,
  error: null,
};

export default function SyndicatesPage() {
  const [syndicates, setSyndicates] = useState<SyndicateSummary[]>([]);
  const [detail, setDetail] = useState<SyndicateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [vaultSuccess, setVaultSuccess] = useState<string | null>(null);
  const vaultSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current user identity
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);

  // Stable creator ID — latches on first non-null value, never cleared by role reloads
  const [creatorId, setCreatorId] = useState<string | null>(null);

  // Per-member role editing state
  const [memberRoleStates, setMemberRoleStates] = useState<Record<string, MemberRoleState>>({});

  const patchMemberRole = (userId: string, patch: Partial<MemberRoleState>) => {
    setMemberRoleStates((prev) => ({
      ...prev,
      [userId]: { ...EMPTY_ROLE_STATE, ...prev[userId], ...patch },
    }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await api.get<MeLite>("/me");
      setMyUserId(meRes.data.id ?? null);
      setMyRole(meRes.data.currentSyndicateRole ?? null);
      if (meRes.data.syndicate?.id) {
        const detailRes = await api.get<SyndicateSummary>(`/syndicates/${meRes.data.syndicate.id}`);
        setDetail(detailRes.data);
        setSyndicates([]);
        // Latch creatorId once — prefer the dedicated field, fall back to leaderId on first load
        const incoming = detailRes.data.creatorId ?? detailRes.data.leaderId;
        if (incoming) setCreatorId(incoming);
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

  // ── Permission helpers ───────────────────────────────────────────────────────
  const isCreator = myUserId !== null && myUserId === creatorId;
  const iAmLeader = myRole === "leader";
  const iAmCoLeader = myRole === "co_leader";
  const canManageRoles = iAmLeader || iAmCoLeader || isCreator;

  function canChangeRole(member: SyndicateMember): boolean {
    if (!canManageRoles) return false;
    if (member.userId === myUserId) return false; // can't change own role
    // co_leader (who is not creator/leader) cannot touch the leader or creator
    if (iAmCoLeader && !isCreator && !iAmLeader) {
      if (member.userId === creatorId) return false;
      if (member.role === "leader") return false;
    }
    return true;
  }

  const filteredMembers = (detail.members ?? []).filter((member) => {
    if (roleFilter === "all") return true;
    if (roleFilter === "creator") return member.userId === creatorId;
    return member.role === roleFilter;
  });

  const confirmRoleChange = async (member: SyndicateMember) => {
    const rs = memberRoleStates[member.userId];
    if (!rs || !rs.draft || rs.draft === member.role) return;
    patchMemberRole(member.userId, { busy: true, error: null, success: null });
    try {
      await api.post(`/syndicates/${detail.id}/role`, {
        targetUserId: member.userId,
        role: rs.draft,
      });
      patchMemberRole(member.userId, {
        busy: false,
        open: false,
        success: `Role updated to ${formatRole(rs.draft)}.`,
        draft: "",
      });
      // Auto-clear success after 3s then reload
      setTimeout(() => {
        patchMemberRole(member.userId, { success: null });
        load();
      }, 3000);
    } catch (err) {
      patchMemberRole(member.userId, {
        busy: false,
        error: extractErrMsg(err, "Failed to update role."),
      });
    }
  };

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

      {vaultError && <p className="text-[10px] font-bold text-[#ef5350]">{vaultError}</p>}
      {vaultSuccess && <p className="text-[10px] font-bold text-[#66bb6a]">{vaultSuccess}</p>}
      <SyndicateVaultCard
        vaultCash={detail.vaultCash}
        canDeposit
        canWithdraw={!!detail.rolePermissions?.withdrawVault}
        busy={busy === "deposit" || busy === "withdraw"}
        onDeposit={async (amount) => {
          setBusy("deposit");
          setVaultError(null);
          setVaultSuccess(null);
          try {
            await api.post("/syndicates/vault/deposit", { amount });
            await load();
            setVaultSuccess(`Deposited $${amount.toLocaleString()} to vault.`);
            if (vaultSuccessTimer.current) clearTimeout(vaultSuccessTimer.current);
            vaultSuccessTimer.current = setTimeout(() => setVaultSuccess(null), 3000);
          } catch (err) {
            setVaultError(extractErrMsg(err, "Deposit failed."));
          } finally {
            setBusy(null);
          }
        }}
        onWithdraw={async (amount) => {
          setBusy("withdraw");
          setVaultError(null);
          setVaultSuccess(null);
          try {
            await api.post("/syndicates/vault/withdraw", { amount });
            await load();
            setVaultSuccess(`Withdrew $${amount.toLocaleString()} from vault.`);
            if (vaultSuccessTimer.current) clearTimeout(vaultSuccessTimer.current);
            vaultSuccessTimer.current = setTimeout(() => setVaultSuccess(null), 3000);
          } catch (err) {
            setVaultError(extractErrMsg(err, "Withdrawal failed."));
          } finally {
            setBusy(null);
          }
        }}
      />

      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase mb-1">$SLS Syndicate Deposits</p>
        <p className="text-[11px] text-[#555]">$SLS syndicate deposits coming soon.</p>
      </div>

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

      {/* ── Member Roster ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black tracking-[3px] text-[#555] uppercase">Member Roster</p>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="rounded-md border border-[#9945FF] bg-[#0d0d0d] px-2 py-1 text-[10px] font-bold text-[#eee] outline-none cursor-pointer"
          >
            <option value="all">All</option>
            <option value="creator">Creator</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{formatRole(r)}</option>
            ))}
          </select>
        </div>

        {filteredMembers.map((member) => {
          const rs: MemberRoleState = memberRoleStates[member.userId] ?? EMPTY_ROLE_STATE;
          const eligible = canChangeRole(member);

          return (
            <div key={member.userId} className="rounded-md border border-white/10 bg-black/20 p-3 flex flex-col gap-2">
              {/* Top row: name + badges + change role button */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[12px] font-bold text-[#eee]">{member.name}</p>
                    {member.userId === creatorId && (
                      <span className="text-[9px] font-black tracking-[1px] uppercase px-1.5 py-0.5 rounded bg-[#fdd835]/20 text-[#fdd835] border border-[#fdd835]/30">CREATOR</span>
                    )}
                  </div>
                  <SyndicateRoleBadge role={member.role} />
                </div>

                {eligible && !rs.open && (
                  <button
                    onClick={() => patchMemberRole(member.userId, { open: true, draft: member.role })}
                    className="shrink-0 px-2 py-1 rounded border border-[rgba(153,69,255,0.4)] bg-[#1a0a2e] text-[#9945FF] text-[9px] font-black tracking-[1px] hover:border-[rgba(153,69,255,0.8)] transition-colors"
                  >
                    CHANGE ROLE
                  </button>
                )}
              </div>

              <p className="text-[10px] text-[#777]">Contribution {member.contributionScore} • War {member.warParticipation}</p>

              {/* Inline role editor */}
              {rs.open && (
                <div className="flex flex-col gap-2 pt-1 border-t border-white/10">
                  <p className="text-[9px] font-bold tracking-[2px] text-[#555] uppercase">Change Role</p>
                  <div className="flex gap-2 flex-wrap">
                    <select
                      value={rs.draft}
                      onChange={(e) => patchMemberRole(member.userId, { draft: e.target.value })}
                      className="flex-1 min-w-0 rounded-md border border-[#9945FF]/60 bg-[#0d0d0d] px-2 py-1.5 text-[11px] font-bold text-[#eee] outline-none cursor-pointer"
                    >
                      {ROLES.map((r) => (
                        <option
                          key={r}
                          value={r}
                          disabled={r === member.role}
                          className={r === member.role ? "text-[#555]" : "text-[#eee]"}
                        >
                          {formatRole(r)}{r === member.role ? " (current)" : ""}
                        </option>
                      ))}
                    </select>

                    <button
                      disabled={rs.busy || rs.draft === member.role}
                      onClick={() => confirmRoleChange(member)}
                      className="px-3 py-1.5 rounded-md bg-[#9945FF] text-white text-[10px] font-black tracking-[1px] hover:bg-[#7a35cc] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {rs.busy ? "SAVING..." : "CONFIRM"}
                    </button>

                    <button
                      disabled={rs.busy}
                      onClick={() => patchMemberRole(member.userId, { open: false, draft: "", error: null })}
                      className="px-3 py-1.5 rounded-md border border-white/10 bg-black/20 text-[#777] text-[10px] font-black tracking-[1px] hover:text-[#aaa] disabled:opacity-40 transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>

                  {rs.error && (
                    <p className="text-[10px] font-bold text-[#ef5350]">{rs.error}</p>
                  )}
                </div>
              )}

              {/* Success message (shown after editor closes) */}
              {rs.success && (
                <p className="text-[10px] font-bold text-[#66bb6a]">{rs.success}</p>
              )}
            </div>
          );
        })}
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

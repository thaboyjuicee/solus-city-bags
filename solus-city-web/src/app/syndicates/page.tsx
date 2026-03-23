"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SyndicateVaultCard } from "@/components/game/SyndicateVaultCard";
import { SyndicateRoleBadge } from "@/components/game/SyndicateRoleBadge";
import { WarScoreboard } from "@/components/game/WarScoreboard";
import { ContributionList } from "@/components/game/ContributionList";

// ── Types ────────────────────────────────────────────────────────────────────

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
  visibility?: string;
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

type SyndicateListItem = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  creatorName: string;
  visibility: string;
  leaderId?: string | null;
  creatorId?: string | null;
  seasonPoints: number;
  warRating: number;
};

type MemberRoleState = {
  open: boolean;
  draft: string;
  busy: boolean;
  success: string | null;
  error: string | null;
};

type HistoryEntry = {
  id: string;
  type: string;
  message: string;
  playerName: string;
  ts: string;
};

type LeaveModal =
  | { kind: "disband" }
  | { kind: "transfer"; nextLeaderName: string }
  | { kind: "confirm" };

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_BUFF_TYPE = "crime_payout";
const DEFAULT_BUFF_VALUE = 0.05;
const ROLES = ["leader", "co_leader", "treasurer", "war_captain", "recruiter", "member"] as const;
type RoleFilter = "all" | "creator" | (typeof ROLES)[number];
type SubTab = "hq" | "roster" | "pending" | "history" | "chat";

const EMPTY_ROLE_STATE: MemberRoleState = { open: false, draft: "", busy: false, success: null, error: null };

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRole(role: string) {
  return role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function extractErrMsg(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    (err as { message?: string })?.message ??
    fallback
  );
}

function timeAgo(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function historyDotColor(type: string): string {
  if (type === "syndicate_created") return "#fdd835";
  if (type === "syndicate_joined") return "#66bb6a";
  if (type === "syndicate_left") return "#ff8a65";
  if (type === "syndicate_disbanded") return "#ef5350";
  if (type === "syndicate_role_change") return "#9945FF";
  if (type.includes("vault")) return "#42a5f5";
  return "#555";
}

// ── Sub-components ───────────────────────────────────────────────────────────

function TabButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      className={`px-4 py-2 text-[10px] font-black tracking-[2px] uppercase border-b-2 transition-colors ${
        disabled
          ? "border-transparent text-[#333] cursor-not-allowed"
          : active
          ? "border-[#9945FF] text-[#9945FF]"
          : "border-transparent text-[#aab0a3] hover:text-[#d0d5ca]"
      }`}
    >
      {children}
    </button>
  );
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const isPublic = visibility === "public";
  return (
    <span
      className={`text-[9px] font-black tracking-[1px] uppercase px-2 py-0.5 rounded border ${
        isPublic
          ? "bg-[#0f2a18] border-[#1f5f36] text-[#66bb6a]"
          : "bg-[#231412] border-[#6d4c41] text-[#ff8a65]"
      }`}
    >
      {isPublic ? "PUBLIC" : "PRIVATE"}
    </span>
  );
}

// ── Leave Modal ───────────────────────────────────────────────────────────────

function LeaveModalOverlay({
  modal,
  busy,
  onClose,
  onConfirmLeave,
  onConfirmDisband,
  onWithdrawFirst,
}: {
  modal: LeaveModal;
  busy: boolean;
  onClose: () => void;
  onConfirmLeave: () => void;
  onConfirmDisband: () => void;
  onWithdrawFirst: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
      <div className="rounded-xl border border-white/10 bg-[#111] p-6 max-w-sm w-full flex flex-col gap-4">
        {modal.kind === "disband" && (
          <>
            <div>
              <p className="text-[13px] font-black text-[#ef5350]">Disband Syndicate</p>
              <p className="mt-2 text-[12px] text-[#aaa] leading-relaxed">
                You are the only member. Leaving will permanently disband this syndicate and delete it. Make sure to withdraw any deposited vault cash before leaving.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onWithdrawFirst}
                className="rounded-md border border-[rgba(153,69,255,0.4)] bg-[#1a0a2e] py-2 text-[10px] font-black tracking-[2px] text-[#9945FF] hover:border-[rgba(153,69,255,0.7)] transition-colors"
              >
                WITHDRAW VAULT CASH FIRST
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onConfirmDisband}
                className="rounded-md border border-[#6d4c41] bg-[#231412] py-2 text-[10px] font-black tracking-[2px] text-[#ef5350] disabled:opacity-40"
              >
                {busy ? "DISBANDING..." : "CONFIRM DISBAND"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-white/10 bg-black/20 py-2 text-[10px] font-black tracking-[2px] text-[#666] hover:text-[#999] transition-colors"
              >
                CANCEL
              </button>
            </div>
          </>
        )}

        {modal.kind === "transfer" && (
          <>
            <div>
              <p className="text-[13px] font-black text-[#ff8a65]">Leave as Leader</p>
              <p className="mt-2 text-[12px] text-[#aaa] leading-relaxed">
                Leadership will automatically transfer to{" "}
                <span className="font-bold text-[#f2f4ec]">{modal.nextLeaderName}</span> (highest contributor). Are you sure?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md border border-white/10 bg-black/20 py-2 text-[10px] font-black tracking-[2px] text-[#666] hover:text-[#999] transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onConfirmLeave}
                className="flex-1 rounded-md border border-[#6d4c41] bg-[#231412] py-2 text-[10px] font-black tracking-[2px] text-[#ff8a65] disabled:opacity-40"
              >
                {busy ? "LEAVING..." : "CONFIRM LEAVE"}
              </button>
            </div>
          </>
        )}

        {modal.kind === "confirm" && (
          <>
            <div>
              <p className="text-[13px] font-black text-[#f2f4ec]">Leave Syndicate</p>
              <p className="mt-2 text-[12px] text-[#aaa]">Are you sure you want to leave?</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md border border-white/10 bg-black/20 py-2 text-[10px] font-black tracking-[2px] text-[#666] hover:text-[#999] transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onConfirmLeave}
                className="flex-1 rounded-md border border-[#6d4c41] bg-[#231412] py-2 text-[10px] font-black tracking-[2px] text-[#ff8a65] disabled:opacity-40"
              >
                {busy ? "LEAVING..." : "CONFIRM LEAVE"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function SyndicatesPage() {
  // Top-level tab
  const [mainTab, setMainTab] = useState<"mine" | "browse">("mine");
  // Sub-tab within YOUR SYNDICATE
  const [subTab, setSubTab] = useState<SubTab>("hq");

  // My identity
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [mySyndicateId, setMySyndicateId] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  // MY SYNDICATE tab data
  const [detail, setDetail] = useState<SyndicateSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  // BROWSE tab data
  const [browseList, setBrowseList] = useState<SyndicateListItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseFetched, setBrowseFetched] = useState(false);

  // HISTORY tab data
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFetched, setHistoryFetched] = useState(false);

  // Create form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Action state
  const [busy, setBusy] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [memberRoleStates, setMemberRoleStates] = useState<Record<string, MemberRoleState>>({});

  // Leave modal + error
  const [leaveModal, setLeaveModal] = useState<LeaveModal | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Vault feedback
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [vaultSuccess, setVaultSuccess] = useState<string | null>(null);
  const vaultSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Visibility toggle
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  // Apply toast (private syndicate)
  const [applyToast, setApplyToast] = useState<string | null>(null);
  const applyToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Join errors per syndicate (browse tab)
  const [joinErrors, setJoinErrors] = useState<Record<string, string | null>>({});

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadDetail = useCallback(async (syndicateId: string) => {
    const detailRes = await api.get<SyndicateSummary>(`/syndicates/${syndicateId}`);
    setDetail(detailRes.data);
    const incoming = detailRes.data.creatorId ?? detailRes.data.leaderId;
    if (incoming) setCreatorId(incoming);
  }, []);

  const loadMe = useCallback(async () => {
    setDetailLoading(true);
    try {
      const meRes = await api.get<MeLite>("/me");
      setMyUserId(meRes.data.id ?? null);
      setMyRole(meRes.data.currentSyndicateRole ?? null);
      const sid = meRes.data.syndicate?.id ?? null;
      setMySyndicateId(sid);
      if (sid) {
        await loadDetail(sid);
      } else {
        setDetail(null);
      }
    } finally {
      setDetailLoading(false);
    }
  }, [loadDetail]);

  const loadBrowse = useCallback(async () => {
    setBrowseLoading(true);
    try {
      const res = await api.get<SyndicateListItem[] | { syndicates: SyndicateListItem[] }>("/syndicates");
      const list = Array.isArray(res.data) ? res.data : res.data.syndicates;
      setBrowseList(list ?? []);
      setBrowseFetched(true);
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (mainTab === "browse" && !browseFetched) loadBrowse();
  }, [mainTab, browseFetched, loadBrowse]);

  useEffect(() => {
    if (subTab !== "history" || historyFetched || !mySyndicateId) return;
    setHistoryLoading(true);
    api.get<HistoryEntry[]>(`/syndicates/${mySyndicateId}/history`)
      .then((res) => { setHistory(Array.isArray(res.data) ? res.data : []); setHistoryFetched(true); })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [subTab, historyFetched, mySyndicateId]);

  // ── Permission helpers ─────────────────────────────────────────────────────

  const isCreator = myUserId !== null && myUserId === creatorId;
  const iAmLeader = myRole === "leader";
  const iAmCoLeader = myRole === "co_leader";
  const canManageRoles = iAmLeader || iAmCoLeader || isCreator;

  function canChangeRole(member: SyndicateMember): boolean {
    if (!canManageRoles) return false;
    if (member.userId === myUserId) return false;
    if (iAmCoLeader && !isCreator && !iAmLeader) {
      if (member.userId === creatorId) return false;
      if (member.role === "leader") return false;
    }
    return true;
  }

  // ── Member role editing ────────────────────────────────────────────────────

  const patchMemberRole = (userId: string, patch: Partial<MemberRoleState>) => {
    setMemberRoleStates((prev) => ({
      ...prev,
      [userId]: { ...EMPTY_ROLE_STATE, ...prev[userId], ...patch },
    }));
  };

  const confirmRoleChange = async (member: SyndicateMember) => {
    if (!detail) return;
    const rs = memberRoleStates[member.userId];
    if (!rs || !rs.draft || rs.draft === member.role) return;
    patchMemberRole(member.userId, { busy: true, error: null, success: null });
    try {
      await api.post(`/syndicates/${detail.id}/role`, { targetUserId: member.userId, role: rs.draft });
      patchMemberRole(member.userId, { busy: false, open: false, success: `Role updated to ${formatRole(rs.draft)}.`, draft: "" });
      setTimeout(() => {
        patchMemberRole(member.userId, { success: null });
        if (mySyndicateId) loadDetail(mySyndicateId);
      }, 3000);
    } catch (err) {
      patchMemberRole(member.userId, { busy: false, error: extractErrMsg(err, "Failed to update role.") });
    }
  };

  // ── Leave flow ─────────────────────────────────────────────────────────────

  const handleLeaveClick = () => {
    if (!detail) return;
    const memberCount = detail.members?.length ?? 1;

    if (memberCount <= 1) {
      setLeaveModal({ kind: "disband" });
    } else if (iAmLeader) {
      const others = (detail.members ?? [])
        .filter((m) => m.userId !== myUserId)
        .sort((a, b) => b.contributionScore - a.contributionScore);
      setLeaveModal({ kind: "transfer", nextLeaderName: others[0]?.name ?? "a co-leader" });
    } else {
      setLeaveModal({ kind: "confirm" });
    }
  };

  const execLeave = async () => {
    setLeaveModal(null);
    setBusy("leave");
    setLeaveError(null);
    try {
      await api.post("/syndicates/leave");
      setHistoryFetched(false);
      await loadMe();
    } catch (err) {
      setLeaveError(extractErrMsg(err, "Failed to leave syndicate."));
    } finally {
      setBusy(null);
    }
  };

  const execDisband = async () => {
    if (!detail) return;
    setLeaveModal(null);
    setBusy("disband");
    setLeaveError(null);
    try {
      await api.delete(`/syndicates/${detail.id}`);
      await loadMe();
    } catch (err) {
      setLeaveError(extractErrMsg(err, "Failed to disband syndicate."));
    } finally {
      setBusy(null);
    }
  };

  // ── Visibility toggle ──────────────────────────────────────────────────────

  const toggleVisibility = async () => {
    if (!detail) return;
    const next = (detail.visibility ?? "public") === "public" ? "private" : "public";
    setVisibilityBusy(true);
    setVisibilityError(null);
    try {
      await api.patch(`/syndicates/${detail.id}`, { visibility: next });
      setDetail((prev) => prev ? { ...prev, visibility: next } : prev);
    } catch (err) {
      setVisibilityError(extractErrMsg(err, "Failed to update visibility."));
    } finally {
      setVisibilityBusy(false);
    }
  };

  // ── Apply toast ────────────────────────────────────────────────────────────

  const showApplyToast = () => {
    setApplyToast("Application sent — feature coming soon.");
    if (applyToastTimer.current) clearTimeout(applyToastTimer.current);
    applyToastTimer.current = setTimeout(() => setApplyToast(null), 3500);
  };

  // ── Filtered members ───────────────────────────────────────────────────────

  const filteredMembers = (detail?.members ?? []).filter((member) => {
    if (roleFilter === "all") return true;
    if (roleFilter === "creator") return member.userId === creatorId;
    return member.role === roleFilter;
  });

  const isPrivate = (detail?.visibility ?? "public") === "private";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Leave modal */}
      {leaveModal && (
        <LeaveModalOverlay
          modal={leaveModal}
          busy={busy === "leave" || busy === "disband"}
          onClose={() => setLeaveModal(null)}
          onConfirmLeave={execLeave}
          onConfirmDisband={execDisband}
          onWithdrawFirst={() => { setLeaveModal(null); setSubTab("hq"); }}
        />
      )}

      {/* Top-level tab bar */}
      <div className="flex gap-1 border-b border-white/10">
        <TabButton active={mainTab === "mine"} onClick={() => setMainTab("mine")}>
          Your Syndicate
        </TabButton>
        <TabButton active={mainTab === "browse"} onClick={() => setMainTab("browse")}>
          Browse
        </TabButton>
      </div>

      {/* ── YOUR SYNDICATE TAB ────────────────────────────────────────────── */}
      {mainTab === "mine" && (
        <>
          {detailLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <LoadingSpinner size={28} />
            </div>
          ) : !detail ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-white/10 bg-black/20 p-10 text-center">
              <p className="text-[14px] font-black text-[#f2f4ec]">You haven&apos;t joined a syndicate yet.</p>
              <p className="text-[12px] text-[#666] max-w-xs">Find an existing syndicate or create your own below.</p>
              <button
                type="button"
                onClick={() => setMainTab("browse")}
                className="rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] px-4 py-2 text-[10px] font-black tracking-[2px] text-[#9945FF] hover:border-[rgba(153,69,255,0.6)] transition-colors"
              >
                BROWSE SYNDICATES
              </button>
            </div>
          ) : (
            <>
              {/* HQ header */}
              <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Syndicate HQ</p>
                    <p className="text-[20px] font-black text-[#f2f4ec] mt-1">{detail.name}</p>
                    <p className="text-[12px] text-[#d0d5ca] mt-0.5">{detail.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busy === "leave" || busy === "disband"}
                      onClick={handleLeaveClick}
                      className="rounded-md border border-[#6d4c41] bg-[#231412] px-3 py-1.5 text-[10px] font-black tracking-[2px] text-[#ff8a65] disabled:opacity-40"
                    >
                      {busy === "leave" || busy === "disband" ? "LEAVING..." : "LEAVE"}
                    </button>
                    {leaveError && (
                      <p className="text-[9px] font-bold text-[#ef5350] text-right max-w-[160px]">{leaveError}</p>
                    )}
                    {/* Visibility toggle — leaders/co-leaders/creator only */}
                    {canManageRoles && (
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <VisibilityBadge visibility={detail.visibility ?? "public"} />
                          <button
                            type="button"
                            disabled={visibilityBusy}
                            onClick={toggleVisibility}
                            className="text-[9px] font-black tracking-[1px] text-[#aab0a3] uppercase hover:text-[#d0d5ca] disabled:opacity-40 transition-colors"
                          >
                            {visibilityBusy ? "..." : "TOGGLE"}
                          </button>
                        </div>
                        {visibilityError && (
                          <p className="text-[9px] font-bold text-[#ef5350]">{visibilityError}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-tab bar */}
                <div className="flex gap-1 border-b border-white/10 -mx-4 px-4 flex-wrap">
                  <TabButton active={subTab === "hq"} onClick={() => setSubTab("hq")}>HQ</TabButton>
                  <TabButton active={subTab === "roster"} onClick={() => setSubTab("roster")}>Roster</TabButton>
                  {canManageRoles && (
                    <TabButton
                      active={subTab === "pending"}
                      disabled={!isPrivate}
                      onClick={() => setSubTab("pending")}
                    >
                      Pending{!isPrivate ? " (public)" : ""}
                    </TabButton>
                  )}
                  <TabButton active={subTab === "history"} onClick={() => setSubTab("history")}>History</TabButton>
                  <TabButton active={subTab === "chat"} onClick={() => setSubTab("chat")}>Chat</TabButton>
                </div>
              </div>

              {/* ── HQ sub-tab ─────────────────────────────────────────────── */}
              {subTab === "hq" && (
                <>
                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="rounded-md border border-white/10 bg-black/20 p-3">
                      <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">Season</p>
                      <p className="text-[16px] font-black text-[#66bb6a] mt-1">{detail.seasonPoints}</p>
                    </div>
                    <div className="rounded-md border border-white/10 bg-black/20 p-3">
                      <p className="text-[9px] font-black tracking-[2px] text-[#aab0a3] uppercase">War Rating</p>
                      <p className="text-[16px] font-black text-[#ff8a65] mt-1">{detail.warRating}</p>
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
                        if (mySyndicateId) await loadDetail(mySyndicateId);
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
                        if (mySyndicateId) await loadDetail(mySyndicateId);
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
                    <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase mb-1">$SLS Syndicate Deposits</p>
                    <p className="text-[11px] text-[#aab0a3]">$SLS syndicate deposits coming soon.</p>
                  </div>

                  {detail.currentWarStatus ? (
                    <WarScoreboard war={detail.currentWarStatus} canManageActions={!!detail.rolePermissions?.manageWar} />
                  ) : (
                    <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-[12px] text-[#777]">No active war at the moment.</div>
                  )}

                  {detail.championshipQualification && (
                    <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
                      <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Championship Status</p>
                      <div className="grid gap-2 md:grid-cols-3">
                        <div className="rounded-md border border-white/10 bg-black/20 p-3">
                          <p className="text-[9px] tracking-[2px] text-[#aab0a3] uppercase">Qualified</p>
                          <p className="text-[16px] font-black text-[#66bb6a] mt-1">{detail.championshipQualification.qualified ? "YES" : "NO"}</p>
                        </div>
                        <div className="rounded-md border border-white/10 bg-black/20 p-3">
                          <p className="text-[9px] tracking-[2px] text-[#aab0a3] uppercase">Seed</p>
                          <p className="text-[16px] font-black text-[#42a5f5] mt-1">{detail.championshipQualification.seed ?? "-"}</p>
                        </div>
                        <div className="rounded-md border border-white/10 bg-black/20 p-3">
                          <p className="text-[9px] tracking-[2px] text-[#aab0a3] uppercase">Qualifier Score</p>
                          <p className="text-[16px] font-black text-[#fdd835] mt-1">{detail.championshipQualification.qualifyingPoints ?? 0}</p>
                        </div>
                      </div>
                      {detail.championshipQualification.currentMatch && (
                        <p className="text-[11px] text-[#aaa]">
                          Current match round {detail.championshipQualification.currentMatch.round} is {detail.championshipQualification.currentMatch.status}.
                        </p>
                      )}
                    </div>
                  )}

                  {detail.championHistory && detail.championHistory.length > 0 && (
                    <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
                      <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Champion History</p>
                      {detail.championHistory.map((entry) => (
                        <div key={entry.id} className="rounded-md border border-white/10 bg-black/20 p-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[12px] font-bold text-[#f2f4ec]">{detail.name}</p>
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
                </>
              )}

              {/* ── ROSTER sub-tab ─────────────────────────────────────────── */}
              {subTab === "roster" && (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Member Roster</p>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                      className="rounded-md border border-[#9945FF] bg-[#0d0d0d] px-2 py-1 text-[10px] font-bold text-[#f2f4ec] outline-none cursor-pointer"
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
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[12px] font-bold text-[#f2f4ec]">{member.name}</p>
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

                        {rs.open && (
                          <div className="flex flex-col gap-2 pt-1 border-t border-white/10">
                            <p className="text-[9px] font-bold tracking-[2px] text-[#aab0a3] uppercase">Change Role</p>
                            <div className="flex gap-2 flex-wrap">
                              <select
                                value={rs.draft}
                                onChange={(e) => patchMemberRole(member.userId, { draft: e.target.value })}
                                className="flex-1 min-w-0 rounded-md border border-[#9945FF]/60 bg-[#0d0d0d] px-2 py-1.5 text-[11px] font-bold text-[#f2f4ec] outline-none cursor-pointer"
                              >
                                {ROLES.map((r) => (
                                  <option key={r} value={r} disabled={r === member.role} className={r === member.role ? "text-[#aab0a3]" : "text-[#f2f4ec]"}>
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
                            {rs.error && <p className="text-[10px] font-bold text-[#ef5350]">{rs.error}</p>}
                          </div>
                        )}
                        {rs.success && <p className="text-[10px] font-bold text-[#66bb6a]">{rs.success}</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── PENDING sub-tab ────────────────────────────────────────── */}
              {subTab === "pending" && canManageRoles && (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
                  <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Pending Applications</p>
                  <p className="text-[12px] text-[#aab0a3]">No pending applications.</p>
                </div>
              )}

              {/* ── HISTORY sub-tab ────────────────────────────────────────── */}
              {subTab === "history" && (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Syndicate History</p>
                    <button
                      type="button"
                      onClick={() => { setHistoryFetched(false); }}
                      className="text-[9px] font-black tracking-[1px] text-[#aab0a3] uppercase hover:text-[#d0d5ca] transition-colors"
                    >
                      REFRESH
                    </button>
                  </div>
                  {historyLoading ? (
                    <div className="flex justify-center py-6"><LoadingSpinner size={22} /></div>
                  ) : history.length === 0 ? (
                    <p className="text-[12px] text-[#aab0a3]">No recorded events yet. Activity will appear here as members join, leave, and take actions.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {history.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-3">
                          <span
                            className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full"
                            style={{ backgroundColor: historyDotColor(entry.type) }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-[#aaa]">{entry.message}</p>
                            <p className="text-[10px] text-[#aab0a3] mt-0.5">{entry.playerName}</p>
                          </div>
                          <p className="flex-shrink-0 text-[10px] text-[#444]">{timeAgo(entry.ts)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── CHAT sub-tab ───────────────────────────────────────────── */}
              {subTab === "chat" && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-white/10 bg-black/20 p-10 text-center">
                  <p className="text-[14px] font-black text-[#444]">Syndicate Chat</p>
                  <p className="text-[11px] text-[#aab0a3]">Syndicate chat coming soon.</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── BROWSE TAB ───────────────────────────────────────────────────────── */}
      {mainTab === "browse" && (
        <div className="flex flex-col gap-4">
          {applyToast && (
            <div className="rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] px-4 py-2 text-[11px] font-bold text-[#9945FF]">
              {applyToast}
            </div>
          )}

          {!mySyndicateId && (
            <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
              <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Create Syndicate</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-[#f2f4ec] outline-none"
                placeholder="Syndicate name"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-24 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-[#f2f4ec] outline-none"
                placeholder="Description"
              />
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
                    await loadMe();
                    setMainTab("mine");
                  } finally {
                    setBusy(null);
                  }
                }}
                className="rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#9945FF] disabled:opacity-40"
              >
                {busy === "create" ? "CREATING..." : "CREATE SYNDICATE"}
              </button>
            </div>
          )}

          <div className="rounded-lg border border-white/10 bg-black/20 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black tracking-[3px] text-[#aab0a3] uppercase">Available Syndicates</p>
              <button
                type="button"
                onClick={() => { setBrowseFetched(false); loadBrowse(); }}
                className="text-[9px] font-black tracking-[1px] text-[#aab0a3] uppercase hover:text-[#d0d5ca] transition-colors"
              >
                REFRESH
              </button>
            </div>

            {mySyndicateId && (
              <p className="text-[10px] text-[#666] italic">Leave your current syndicate to join another.</p>
            )}

            {browseLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner size={24} /></div>
            ) : browseList.length === 0 ? (
              <p className="text-[12px] text-[#777]">No syndicates available yet.</p>
            ) : (
              browseList.map((syndicate) => {
                const isOwn = syndicate.id === mySyndicateId;
                const isPublic = syndicate.visibility === "public";
                return (
                  <div
                    key={syndicate.id}
                    className={`rounded-md border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${isOwn ? "border-[rgba(153,69,255,0.3)] bg-[#1a0a2e]" : "border-white/10 bg-black/20"}`}
                  >
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-black text-[#f2f4ec]">{syndicate.name}</p>
                        <VisibilityBadge visibility={syndicate.visibility} />
                        {isOwn && (
                          <span className="text-[9px] font-black tracking-[1px] uppercase px-1.5 py-0.5 rounded bg-[#9945FF]/20 text-[#9945FF] border border-[#9945FF]/30">YOURS</span>
                        )}
                      </div>
                      {syndicate.description && (
                        <p className="text-[11px] text-[#777]">{syndicate.description}</p>
                      )}
                      <p className="text-[10px] text-[#aab0a3]">
                        {syndicate.memberCount} member{syndicate.memberCount !== 1 ? "s" : ""} • Founded by {syndicate.creatorName}
                      </p>
                      <p className="text-[10px] text-[#444]">Season {syndicate.seasonPoints} • War {syndicate.warRating}</p>
                    </div>

                    <div className="shrink-0">
                      {isOwn ? (
                        <button
                          type="button"
                          onClick={() => setMainTab("mine")}
                          className="rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#9945FF] hover:border-[rgba(153,69,255,0.6)] transition-colors"
                        >
                          VIEW HQ
                        </button>
                      ) : mySyndicateId ? null : isPublic ? (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            disabled={busy === syndicate.id}
                            onClick={async () => {
                              setBusy(syndicate.id);
                              setJoinErrors((prev) => ({ ...prev, [syndicate.id]: null }));
                              try {
                                await api.post(`/syndicates/${syndicate.id}/join`);
                                await loadMe();
                                setMainTab("mine");
                              } catch (err) {
                                setJoinErrors((prev) => ({
                                  ...prev,
                                  [syndicate.id]: extractErrMsg(err, "Failed to join."),
                                }));
                              } finally {
                                setBusy(null);
                              }
                            }}
                            className="rounded-md border border-[#1f5f36] bg-[#0f2a18] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#66bb6a] disabled:opacity-40"
                          >
                            {busy === syndicate.id ? "JOINING..." : "JOIN"}
                          </button>
                          {joinErrors[syndicate.id] && (
                            <p className="text-[9px] text-[#ef5350] text-right max-w-[160px]">{joinErrors[syndicate.id]}</p>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={showApplyToast}
                          className="rounded-md border border-[rgba(153,69,255,0.3)] bg-[#1a0a2e] px-3 py-2 text-[10px] font-black tracking-[2px] text-[#9945FF]"
                        >
                          APPLY
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}


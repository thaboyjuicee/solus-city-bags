export const SYNDICATE_ROLES = [
  "leader",
  "co_leader",
  "treasurer",
  "war_captain",
  "recruiter",
  "member",
] as const;

export type SyndicateRole = (typeof SYNDICATE_ROLES)[number];

export function getRolePermissions(role: string) {
  return {
    manageRoles: role === "leader" || role === "co_leader",
    withdrawVault: role === "leader" || role === "co_leader" || role === "treasurer",
    manageWar: role === "leader" || role === "co_leader" || role === "war_captain",
    recruit: role !== "member",
  };
}

export function canManageRoles(role: string) {
  return getRolePermissions(role).manageRoles;
}

export function canWithdrawVault(role: string) {
  return getRolePermissions(role).withdrawVault;
}

export function canManageWar(role: string) {
  return getRolePermissions(role).manageWar;
}

export function canRecruit(role: string) {
  return getRolePermissions(role).recruit;
}

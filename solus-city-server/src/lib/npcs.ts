export interface NpcTemplate {
  id: string;
  name: string;
  levelBase: number;
  rpBase: number;
  healthBase: number;
  strengthBase: number;
  speedBase: number;
  defenseBase: number;
  dexterityBase: number;
  cashBase: number;
  avatarKey: string;
  flavor?: string;
}

export interface NpcTarget {
  id: string;
  type: "npc";
  displayName: string;
  level: number;
  rp: number;
  health: number;
  maxHealth: number;
  strength: number;
  speed: number;
  defense: number;
  dexterity: number;
  cash: number;
  attackPower: number;
  defensePower: number;
  avatarKey: string;
  flavor?: string;
}

export const NPC_POOL: NpcTemplate[] = [
  { id: "street-thug", name: "Street Thug", levelBase: 1, rpBase: 80, healthBase: 85, strengthBase: 6, speedBase: 4, defenseBase: 5, dexterityBase: 4, cashBase: 180, avatarKey: "thug", flavor: "Quick fists, weak armor." },
  { id: "gang-lookout", name: "Gang Lookout", levelBase: 2, rpBase: 110, healthBase: 90, strengthBase: 7, speedBase: 6, defenseBase: 5, dexterityBase: 6, cashBase: 220, avatarKey: "lookout", flavor: "Always sees trouble first." },
  { id: "rookie-crew", name: "Rookie Crew", levelBase: 3, rpBase: 150, healthBase: 96, strengthBase: 10, speedBase: 5, defenseBase: 8, dexterityBase: 5, cashBase: 300, avatarKey: "crew", flavor: "Unstable but aggressive." },
  { id: "black-market-guard", name: "Black Market Guard", levelBase: 5, rpBase: 240, healthBase: 108, strengthBase: 12, speedBase: 6, defenseBase: 12, dexterityBase: 7, cashBase: 550, avatarKey: "guard", flavor: "Armor first, questions later." },
  { id: "alley-enforcer", name: "Alley Enforcer", levelBase: 7, rpBase: 320, healthBase: 114, strengthBase: 16, speedBase: 8, defenseBase: 14, dexterityBase: 8, cashBase: 800, avatarKey: "enforcer", flavor: "Prefers close combat." },
  { id: "syndicate-runner", name: "Syndicate Runner", levelBase: 9, rpBase: 460, healthBase: 118, strengthBase: 18, speedBase: 12, defenseBase: 14, dexterityBase: 13, cashBase: 1200, avatarKey: "runner", flavor: "Fast and evasive." },
  { id: "corporate-watchman", name: "Corporate Watchman", levelBase: 12, rpBase: 650, healthBase: 130, strengthBase: 24, speedBase: 12, defenseBase: 20, dexterityBase: 11, cashBase: 1800, avatarKey: "watchman", flavor: "Corporate-grade protection." },
  { id: "night-courier", name: "Night Courier", levelBase: 14, rpBase: 780, healthBase: 136, strengthBase: 22, speedBase: 16, defenseBase: 18, dexterityBase: 18, cashBase: 2200, avatarKey: "courier", flavor: "Hard to pin down." },
  {
    id: "obsidian-colossus",
    name: "Obsidian Colossus",
    levelBase: 32,
    rpBase: 5000,
    healthBase: 2600,
    strengthBase: 1,
    speedBase: 1,
    defenseBase: 12000,
    dexterityBase: 0,
    cashBase: 10000,
    avatarKey: "colossus",
    flavor: "An impossible wall of armor. Even luck has trouble breaking through.",
  },
];

export function buildNpcForPlayer(playerLevel: number, playerRp: number, template: NpcTemplate): NpcTarget {
  // Deterministic per (player profile + npc) to avoid HP/stat drift between
  // target listing and battle execution.
  const seedSource = `${template.id}|${playerLevel}|${playerRp}`;
  let seed = 2166136261;
  for (let i = 0; i < seedSource.length; i++) {
    seed ^= seedSource.charCodeAt(i);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed >>> 0) / 0x100000000;
  };

  const seededVary = (n: number, spread: number) => {
    const delta = Math.floor(rand() * (spread * 2 + 1)) - spread;
    return n + delta;
  };

  const scale = Math.max(0.8, Math.min(1.35, 0.9 + playerLevel / 60 + playerRp / 5000));
  const level = Math.max(1, Math.round(seededVary(template.levelBase * scale, 2)));
  const rp = Math.max(0, Math.round(seededVary(template.rpBase * scale, 50)));
  const maxHealth = Math.max(60, Math.round(seededVary(template.healthBase * scale, 8)));
  const strength = Math.max(1, Math.round(seededVary(template.strengthBase * scale, 3)));
  const speed = Math.max(0, Math.round(seededVary(template.speedBase * scale, 3)));
  const defense = Math.max(1, Math.round(seededVary(template.defenseBase * scale, 3)));
  const dexterity = Math.max(0, Math.round(seededVary(template.dexterityBase * scale, 3)));
  const cash = Math.max(50, Math.round(seededVary(template.cashBase * scale, 250)));

  return {
    id: template.id,
    type: "npc",
    displayName: template.name,
    level,
    rp,
    health: maxHealth,
    maxHealth,
    strength,
    speed,
    defense,
    dexterity,
    cash,
    attackPower: 10 + strength,
    defensePower: 10 + defense,
    avatarKey: template.avatarKey,
    flavor: template.flavor,
  };
}

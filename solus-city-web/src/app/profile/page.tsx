// Mirrors: ProfileScreen.tsx
// Shows the player's full stats, wallet address, rank, equipped items,
// and syndicate membership.
export default function ProfilePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-black text-text-primary tracking-wide">
          Profile
        </h1>
      </header>

      {/* Avatar + name card */}
      <div className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-border" />
        <div className="flex flex-col gap-1">
          <span className="text-text-primary font-bold">Username</span>
          <span className="text-text-dim text-xs font-mono">
            Wallet: —
          </span>
          <span className="text-accent text-xs">Level — · Rank —</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          ["Attack Power", "AP", "#9945FF"],
          ["Defense Power", "DP", "#00C853"],
          ["Respect Points", "RP", "#FFB300"],
          ["Cash", "$", "#2196F3"],
        ].map(([label, key, color]) => (
          <div
            key={key}
            className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-1"
          >
            <span className="text-text-dim text-xs">{label}</span>
            <span className="text-2xl font-black" style={{ color }}>
              —
            </span>
          </div>
        ))}
      </div>

      {/* Equipped items placeholder */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h2 className="text-text-secondary text-sm font-semibold mb-3">
          Equipped
        </h2>
        <p className="text-text-dim text-xs text-center py-4">
          [Weapon & Armor slots]
        </p>
      </div>
    </div>
  );
}

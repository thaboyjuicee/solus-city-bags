// Mirrors: LeaderboardScreen.tsx
// Global ranking of players sorted by Respect Points (RP).
export default function LeaderboardPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-black text-text-primary tracking-wide">
          Leaderboard
        </h1>
        <p className="text-text-dim text-sm mt-0.5">Top players by Respect Points</p>
      </header>

      <section className="flex flex-col gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-4"
          >
            <span
              className={`w-7 text-center font-black text-sm ${
                i === 0
                  ? "text-yellow-400"
                  : i === 1
                  ? "text-gray-300"
                  : i === 2
                  ? "text-amber-600"
                  : "text-text-dim"
              }`}
            >
              #{i + 1}
            </span>
            <span className="flex-1 text-text-primary text-sm font-medium">
              Player #{i + 1}
            </span>
            <span className="text-accent text-sm font-bold">— RP</span>
          </div>
        ))}
      </section>
    </div>
  );
}

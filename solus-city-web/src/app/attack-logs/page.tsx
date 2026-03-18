// Mirrors: AttackLogsScreen.tsx
// Displays a chronological feed of incoming and outgoing attacks,
// showing attacker, defender, outcome, cash delta, and timestamp.
export default function AttackLogsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-black text-text-primary tracking-wide">
          Attack Logs
        </h1>
        <p className="text-text-dim text-sm mt-0.5">
          Recent attacks involving your account
        </p>
      </header>

      {/* Tab toggle placeholder */}
      <div className="flex gap-2">
        {["Incoming", "Outgoing"].map((tab) => (
          <button
            key={tab}
            className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm"
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Log feed placeholder */}
      <section className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                i % 2 === 0 ? "bg-success" : "bg-danger"
              }`}
            />
            <div className="flex flex-col gap-0.5 flex-1">
              <span className="text-text-primary text-sm font-medium">
                — vs —
              </span>
              <span className="text-text-dim text-xs">—</span>
            </div>
            <span
              className={`text-sm font-bold ${
                i % 2 === 0 ? "text-success" : "text-danger"
              }`}
            >
              {i % 2 === 0 ? "Won" : "Lost"}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

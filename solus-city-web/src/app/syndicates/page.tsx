// Mirrors: SyndicatesScreen.tsx
// Lists all syndicates (guilds). Players can view members, stats, and
// apply to join or manage their own syndicate.
export default function SyndicatesPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-black text-text-primary tracking-wide">
          Syndicates
        </h1>
        <p className="text-text-dim text-sm mt-0.5">
          Join a crew and rise together
        </p>
      </header>

      {/* Create button placeholder */}
      <button className="w-full py-3 border border-dashed border-accent rounded-xl text-accent text-sm font-semibold opacity-50 cursor-not-allowed">
        + Create Syndicate
      </button>

      {/* Syndicate list placeholder */}
      <section className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-lg bg-border flex-shrink-0" />
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-text-primary text-sm font-bold">
                Syndicate #{i + 1}
              </span>
              <span className="text-text-dim text-xs">
                Members: — · Total RP: —
              </span>
            </div>
            <button className="px-3 py-1.5 bg-accent rounded-lg text-white text-xs font-semibold opacity-50 cursor-not-allowed">
              View
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

/**
 * Lightweight SVG “product shots” for the two AI surfaces — no external assets.
 */
export function HeroVisuals() {
  return (
    <div className="relative w-full max-w-2xl mx-auto lg:mx-0 lg:max-w-none">
      <div
        className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-violet-500/10 to-transparent blur-2xl"
        aria-hidden
      />
      <div className="relative grid gap-4 sm:grid-cols-2">
        <MetricsAssistantCard />
        <FlowBuilderCard />
      </div>
    </div>
  );
}

function MetricsAssistantCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-sm p-4 shadow-xl shadow-black/40">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-medium text-zinc-400">Marketing Assistant</span>
      </div>
      <div className="space-y-2 text-[13px]">
        <div className="rounded-lg bg-zinc-800/80 px-3 py-2 text-zinc-300">
          Revenue by day for the last 7 days?
        </div>
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-zinc-200">
          <p className="text-xs text-cyan-400/90 font-medium mb-1">Store + GA4</p>
          <div className="flex gap-2 h-14 items-end">
            {[40, 65, 52, 78, 70, 88, 95].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-cyan-600/80 to-cyan-400/60"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-zinc-800/80 px-3 py-2 text-zinc-300">
          Draft a win-back email for lapsed subscribers.
        </div>
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-zinc-200 text-xs leading-relaxed">
          Subject: We saved your cart — 10% inside…
        </div>
      </div>
    </div>
  );
}

function FlowBuilderCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-sm p-4 shadow-xl shadow-black/40">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-zinc-400">Flow Builder</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
          AI graph
        </span>
      </div>
      <svg viewBox="0 0 280 200" className="w-full h-auto text-zinc-500" aria-hidden>
        <defs>
          <linearGradient id="edge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(6 182 212)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="rgb(139 92 246)" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <path
          d="M 50 100 L 120 100 M 160 100 L 230 100 M 120 60 L 160 60 M 120 140 L 160 140"
          stroke="url(#edge)"
          strokeWidth="2"
          fill="none"
        />
        <rect x="10" y="80" width="40" height="40" rx="8" className="fill-cyan-500/30 stroke-cyan-400/50" strokeWidth="1" />
        <rect x="120" y="40" width="40" height="40" rx="8" className="fill-violet-500/30 stroke-violet-400/50" strokeWidth="1" />
        <rect x="120" y="120" width="40" height="40" rx="8" className="fill-violet-500/30 stroke-violet-400/50" strokeWidth="1" />
        <rect x="230" y="80" width="40" height="40" rx="8" className="fill-emerald-500/30 stroke-emerald-400/50" strokeWidth="1" />
        <text x="30" y="105" textAnchor="middle" className="fill-zinc-300 text-[9px] font-medium">
          trig
        </text>
        <text x="140" y="64" textAnchor="middle" className="fill-zinc-300 text-[8px] font-medium">
          wait
        </text>
        <text x="140" y="144" textAnchor="middle" className="fill-zinc-300 text-[8px] font-medium">
          email
        </text>
        <text x="250" y="105" textAnchor="middle" className="fill-zinc-300 text-[8px] font-medium">
          end
        </text>
      </svg>
      <p className="text-xs text-zinc-500 mt-1">
        Describe a journey in chat → validated automation on the canvas.
      </p>
    </div>
  );
}

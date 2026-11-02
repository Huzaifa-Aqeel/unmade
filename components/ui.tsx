import { percent } from "@/lib/format";

export function Progress({
  value,
  target,
  reached,
  compact = false,
}: {
  value: number;
  target: number;
  reached?: boolean;
  compact?: boolean;
}) {
  const pct = percent(value, target);
  return (
    <div className={compact ? "" : "space-y-2"}>
      <div className="h-[3px] w-full bg-line">
        <div
          className={`h-full transition-[width] duration-700 ease-out ${reached ? "bg-rust" : "bg-ink"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!compact && (
        <div className="flex items-baseline justify-between text-[11px] tabular-nums">
          <span className="text-ink">
            {value} <span className="text-muted">/ {target}</span>
          </span>
          <span className="label-xs !text-[9px] text-muted">{pct}%</span>
        </div>
      )}
    </div>
  );
}

export function StatusPill({ reached, closed }: { reached: boolean; closed?: boolean }) {
  if (closed) {
    return (
      <span className="inline-flex items-center gap-1.5 border border-line-strong px-2.5 py-1 text-[9px] label-xs text-muted">
        Closed
      </span>
    );
  }
  if (reached) {
    return (
      <span className="inline-flex items-center gap-1.5 border border-rust/40 bg-rust-soft px-2.5 py-1 text-[9px] label-xs text-rust">
        Eligible for production review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 border border-line-strong px-2.5 py-1 text-[9px] label-xs text-ink-soft">
      Below target
    </span>
  );
}

export function SimulatedTag() {
  return (
    <span className="absolute bottom-3 left-3 z-10 border border-white/30 bg-black/45 px-2 py-1 text-[9px] label-xs text-white/90 backdrop-blur-sm">
      Simulated preview
    </span>
  );
}

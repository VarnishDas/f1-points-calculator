import { useState } from "react";
import type { ReactNode } from "react";

type DashboardLayoutProps = {
  standings: ReactNode;
  workspace: ReactNode;
  leaderLabel?: string;
};

export default function DashboardLayout({
  standings,
  workspace,
  leaderLabel,
}: DashboardLayoutProps) {
  const [isStandingsOpen, setIsStandingsOpen] = useState(false);

  return (
    <div className="grid flex-1 gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:min-h-0 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] lg:overflow-hidden lg:pb-3">
      <div className="min-w-0 lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden">
        <button
          type="button"
          onClick={() => setIsStandingsOpen((open) => !open)}
          className="surface-card mb-3 flex h-12 w-full items-center justify-between rounded-xl px-3 text-xs font-black uppercase tracking-[0.12em] text-neutral-100 transition hover:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 lg:hidden"
          aria-label="Toggle projected standings"
          aria-expanded={isStandingsOpen}
          aria-controls="standings-panel-content"
        >
          <span className="flex min-w-0 flex-col items-start gap-0.5 normal-case">
            <span className="text-[11px] font-black uppercase tracking-[0.12em]">
              Standings
            </span>
            {leaderLabel ? (
              <span className="truncate text-[11px] font-bold normal-case tracking-normal text-amber-400/90">
                {leaderLabel}
              </span>
            ) : null}
          </span>
          <span className="flex items-center gap-3">
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-400">
              Projected
            </span>
            <span
              className="grid h-7 w-7 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-base leading-none text-amber-400"
              aria-hidden="true"
            >
              {isStandingsOpen ? "−" : "+"}
            </span>
          </span>
        </button>
        <div
          id="standings-panel-content"
          className={
            isStandingsOpen
              ? "block w-full lg:flex lg:h-full lg:min-h-0"
              : "hidden w-full lg:flex lg:h-full lg:min-h-0"
          }
        >
          {standings}
        </div>
      </div>
      {workspace}
    </div>
  );
}

import { useState } from "react";
import type { ReactNode } from "react";

type DashboardLayoutProps = {
  standings: ReactNode;
  workspace: ReactNode;
};

export default function DashboardLayout({
  standings,
  workspace,
}: DashboardLayoutProps) {
  const [isStandingsOpen, setIsStandingsOpen] = useState(false);

  return (
    <div className="grid flex-1 gap-3 p-3 lg:min-h-0 lg:grid-cols-[280px_minmax(0,1fr)] lg:overflow-hidden">
      <div className="min-w-0 lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden">
        <button
          type="button"
          onClick={() => setIsStandingsOpen((open) => !open)}
          className="mb-3 flex h-11 w-full items-center justify-between rounded-md border border-white/10 bg-neutral-950/75 px-3 text-xs font-black uppercase tracking-[0.12em] text-neutral-100 lg:hidden"
          aria-label="Toggle projected standings"
          aria-expanded={isStandingsOpen}
          aria-controls="standings-panel-content"
        >
          <span>Standings</span>
          <span className="flex items-center gap-3">
            <span className="text-[10px] font-black text-amber-500">
              Projected
            </span>
            <span className="text-lg leading-none text-amber-400" aria-hidden="true">
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

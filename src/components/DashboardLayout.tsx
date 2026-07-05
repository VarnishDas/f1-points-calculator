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
    <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[330px_minmax(0,1fr)] lg:p-4">
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => setIsStandingsOpen((open) => !open)}
          className="mb-3 flex h-11 w-full items-center justify-between rounded-md border border-white/10 bg-neutral-950/75 px-4 text-sm font-black uppercase tracking-[0.12em] text-neutral-100 lg:hidden"
          aria-expanded={isStandingsOpen}
        >
          Standings
          <span className="text-lg leading-none text-amber-400" aria-hidden="true">
            {isStandingsOpen ? "−" : "+"}
          </span>
        </button>
        <div className={isStandingsOpen ? "block lg:block" : "hidden lg:block"}>
          {standings}
        </div>
      </div>
      {workspace}
    </div>
  );
}

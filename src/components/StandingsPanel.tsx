import { useState } from "react";

import type { Driver } from "../types/driver";
import type { Team } from "../types/team";
import type { DriverStanding, TeamStanding, WdcStatus } from "../types/standings";

type StandingsMode = "drivers" | "constructors";

type StandingsPanelProps = {
  driverStandings: DriverStanding[];
  teamStandings: TeamStanding[];
  drivers: Driver[];
  teams: Team[];
  wdcStatusByDriverId: Record<string, WdcStatus>;
};

export default function StandingsPanel({
  driverStandings,
  teamStandings,
  drivers,
  teams,
  wdcStatusByDriverId,
}: StandingsPanelProps) {
  const [mode, setMode] = useState<StandingsMode>("drivers");
  const driverById = new Map(drivers.map((driver) => [driver.id, driver]));
  const teamById = new Map(teams.map((team) => [team.id, team]));

  return (
    <aside className="flex w-full flex-col rounded-md border border-white/10 bg-neutral-950/75 shadow-2xl shadow-black/30 lg:h-full lg:max-h-full lg:min-h-0">
      <div className="hidden items-center justify-between gap-3 border-b border-white/10 px-3 py-3 lg:flex">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-neutral-100">
          Standings
        </h2>
        <span className="text-[10px] font-black uppercase tracking-wide text-amber-500">
          Projected
        </span>
      </div>

      <div className="border-b border-white/10 p-2">
        <div className="grid grid-cols-2 rounded-md border border-white/10 bg-black/25 p-1">
          <button
            type="button"
            onClick={() => setMode("drivers")}
            aria-pressed={mode === "drivers"}
            className={
              mode === "drivers"
                ? "h-9 rounded bg-amber-500/10 px-2 text-xs font-black text-amber-400 ring-1 ring-amber-500/50 sm:h-8 sm:text-[11px]"
                : "h-9 rounded px-2 text-xs font-bold text-neutral-500 transition hover:text-neutral-200 sm:h-8 sm:text-[11px]"
            }
          >
            Drivers
          </button>
          <button
            type="button"
            onClick={() => setMode("constructors")}
            aria-pressed={mode === "constructors"}
            className={
              mode === "constructors"
                ? "h-9 rounded bg-amber-500/10 px-2 text-xs font-black text-amber-400 ring-1 ring-amber-500/50 sm:h-8 sm:text-[11px]"
                : "h-9 rounded px-2 text-xs font-bold text-neutral-500 transition hover:text-neutral-200 sm:h-8 sm:text-[11px]"
            }
          >
            Constructors
          </button>
        </div>
      </div>

      <div className="custom-scrollbar max-h-[22rem] overflow-x-auto overflow-y-auto lg:min-h-0 lg:max-h-none lg:flex-1 lg:stable-scrollbar-gutter">
        {mode === "drivers" ? (
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-neutral-950">
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-neutral-500">
                <th className="sticky left-0 z-20 w-10 bg-neutral-950 px-2 py-2 font-bold sm:px-4">#</th>
                <th className="px-1 py-2 font-bold">Driver</th>
                <th className="w-10 px-1 py-2 text-right font-bold">W</th>
                <th className="w-16 px-2 py-2 text-right font-bold sm:px-4">Pts</th>
              </tr>
            </thead>
            <tbody>
              {driverStandings.map((standing) => {
                const driver = driverById.get(standing.driverId);
                const team = driver ? teamById.get(driver.teamId) : undefined;
                const wdcStatus = wdcStatusByDriverId[standing.driverId];

                return (
                  <tr
                    key={standing.driverId}
                    className="border-b border-white/[0.06] last:border-b-0"
                  >
                    <td className="sticky left-0 z-10 bg-neutral-950 px-2 py-2 tabular-nums text-neutral-400 sm:px-4">
                      {standing.position}
                    </td>
                    <td className="min-w-0 px-1 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-4 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: team?.color ?? "#737373" }}
                        />
                        <span className="w-9 shrink-0 font-black tracking-[0.16em] text-neutral-100">
                          {driver?.code ?? standing.driverId.slice(0, 3)}
                        </span>
                        <span className="truncate text-neutral-500">
                          {driver?.lastName ?? standing.driverId}
                        </span>
                        {wdcStatus === "champion" ? (
                          <span className="shrink-0 rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-300">
                            WDC
                          </span>
                        ) : wdcStatus === "outOfContention" ? (
                          <span className="shrink-0 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neutral-500">
                            Out
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-1 py-2 text-right tabular-nums text-neutral-500">
                      {standing.wins}
                    </td>
                    <td className="px-2 py-2 text-right font-black tabular-nums text-amber-400 sm:px-4">
                      {standing.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-neutral-950">
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-neutral-500">
                <th className="sticky left-0 z-20 w-10 bg-neutral-950 px-2 py-2 font-bold sm:px-4">#</th>
                <th className="px-1 py-2 font-bold">Constructor</th>
                <th className="w-16 px-2 py-2 text-right font-bold sm:px-4">Pts</th>
              </tr>
            </thead>
            <tbody>
              {teamStandings.map((standing) => {
                const team = teamById.get(standing.teamId);

                return (
                  <tr
                    key={standing.teamId}
                    className="border-b border-white/[0.06] last:border-b-0"
                  >
                    <td className="sticky left-0 z-10 bg-neutral-950 px-2 py-2 tabular-nums text-neutral-400 sm:px-4">
                      {standing.position}
                    </td>
                    <td className="min-w-0 px-1 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-4 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: team?.color ?? "#737373" }}
                        />
                        <span className="truncate font-semibold text-neutral-100">
                          {team?.name ?? standing.teamId}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right font-black tabular-nums text-amber-400 sm:px-4">
                      {standing.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </aside>
  );
}

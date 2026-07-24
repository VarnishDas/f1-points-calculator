import { memo, useMemo, useState } from "react";

import type { Driver } from "../types/driver";
import type { Team } from "../types/team";
import type {
  DriverStanding,
  TeamStanding,
  WdcStatus,
} from "../types/standings";
import EmptyState from "./EmptyState";

type StandingsMode = "drivers" | "constructors";

type StandingsPanelProps = {
  driverStandings: DriverStanding[];
  teamStandings: TeamStanding[];
  drivers: Driver[];
  teams: Team[];
  wdcStatusByDriverId: Record<string, WdcStatus>;
};

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400";

const StandingsPanel = memo(function StandingsPanel({
  driverStandings,
  teamStandings,
  drivers,
  teams,
  wdcStatusByDriverId,
}: StandingsPanelProps) {
  const [mode, setMode] = useState<StandingsMode>("drivers");
  const driverById = useMemo(
    () => new Map(drivers.map((driver) => [driver.id, driver])),
    [drivers],
  );
  const teamById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );
  const leaderDriverPoints = driverStandings[0]?.points ?? 0;
  const leaderTeamPoints = teamStandings[0]?.points ?? 0;

  return (
    <aside
      aria-label="Projected championship standings"
      className="surface-card flex w-full flex-col overflow-hidden rounded-xl lg:h-full lg:max-h-full lg:min-h-0"
    >
      <div className="hidden items-center justify-between gap-3 border-b border-white/10 px-3 py-3 lg:flex">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-neutral-100">
          Standings
        </h2>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-400">
          Projected
        </span>
      </div>

      <div className="border-b border-white/10 p-2">
        <div className="grid grid-cols-2 rounded-lg border border-white/10 bg-black/30 p-1">
          <button
            type="button"
            onClick={() => setMode("drivers")}
            aria-pressed={mode === "drivers"}
            className={
              mode === "drivers"
                ? `h-9 rounded-md bg-amber-500/10 px-2 text-xs font-black text-amber-400 ring-1 ring-amber-500/50 ${focusRing} sm:h-8 sm:text-[11px]`
                : `h-9 rounded-md px-2 text-xs font-bold text-neutral-500 transition hover:bg-white/[0.04] hover:text-neutral-200 ${focusRing} sm:h-8 sm:text-[11px]`
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
                ? `h-9 rounded-md bg-amber-500/10 px-2 text-xs font-black text-amber-400 ring-1 ring-amber-500/50 ${focusRing} sm:h-8 sm:text-[11px]`
                : `h-9 rounded-md px-2 text-xs font-bold text-neutral-500 transition hover:bg-white/[0.04] hover:text-neutral-200 ${focusRing} sm:h-8 sm:text-[11px]`
            }
          >
            Constructors
          </button>
        </div>
      </div>

      <div className="custom-scrollbar max-h-[22rem] overflow-x-auto overflow-y-auto lg:min-h-0 lg:max-h-none lg:flex-1 lg:stable-scrollbar-gutter">
        {mode === "drivers" ? (
          driverStandings.length === 0 ? (
            <div className="p-2.5">
              <EmptyState
                title="No driver standings"
                description="Standings will appear once race results or predictions are available."
              />
            </div>
          ) : (
            <table className="w-full border-collapse text-xs">
              <caption className="sr-only">
                Projected drivers championship standings
              </caption>
              <thead className="sticky top-0 z-10 bg-neutral-950/95 backdrop-blur-sm">
                <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-neutral-500">
                  <th
                    scope="col"
                    className="sticky left-0 z-20 w-10 bg-neutral-950/95 px-2 py-2 font-bold sm:px-3"
                  >
                    <span aria-hidden="true">#</span>
                    <span className="sr-only">Position</span>
                  </th>
                  <th scope="col" className="px-1 py-2 font-bold">
                    Driver
                  </th>
                  <th scope="col" className="w-10 px-1 py-2 text-right font-bold">
                    <span aria-hidden="true">Gap</span>
                    <span className="sr-only">Gap to leader</span>
                  </th>
                  <th
                    scope="col"
                    className="w-14 px-2 py-2 text-right font-bold sm:px-3"
                  >
                    <span aria-hidden="true">Pts</span>
                    <span className="sr-only">Points</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {driverStandings.map((standing) => {
                  const driver = driverById.get(standing.driverId);
                  const team = driver
                    ? teamById.get(driver.teamId)
                    : undefined;
                  const wdcStatus = wdcStatusByDriverId[standing.driverId];

                  return (
                    <DriverStandingRow
                      key={standing.driverId}
                      standing={standing}
                      driver={driver}
                      team={team}
                      wdcStatus={wdcStatus}
                      gap={leaderDriverPoints - standing.points}
                    />
                  );
                })}
              </tbody>
            </table>
          )
        ) : teamStandings.length === 0 ? (
          <div className="p-2.5">
            <EmptyState
              title="No constructor standings"
              description="Standings will appear once race results or predictions are available."
            />
          </div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <caption className="sr-only">
              Projected constructors championship standings
            </caption>
            <thead className="sticky top-0 z-10 bg-neutral-950/95 backdrop-blur-sm">
              <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-neutral-500">
                <th
                  scope="col"
                  className="sticky left-0 z-20 w-10 bg-neutral-950/95 px-2 py-2 font-bold sm:px-3"
                >
                  <span aria-hidden="true">#</span>
                  <span className="sr-only">Position</span>
                </th>
                <th scope="col" className="px-1 py-2 font-bold">
                  Constructor
                </th>
                <th scope="col" className="w-10 px-1 py-2 text-right font-bold">
                  <span aria-hidden="true">Gap</span>
                  <span className="sr-only">Gap to leader</span>
                </th>
                <th
                  scope="col"
                  className="w-14 px-2 py-2 text-right font-bold sm:px-3"
                >
                  <span aria-hidden="true">Pts</span>
                  <span className="sr-only">Points</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {teamStandings.map((standing) => (
                <TeamStandingRow
                  key={standing.teamId}
                  standing={standing}
                  team={teamById.get(standing.teamId)}
                  gap={leaderTeamPoints - standing.points}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </aside>
  );
});

export default StandingsPanel;

function positionTone(position: number): string {
  if (position === 1) return "text-amber-300";
  if (position === 2) return "text-neutral-200";
  if (position === 3) return "text-orange-300/90";
  return "text-neutral-500";
}

function rowTone(position: number): string {
  if (position === 1) return "bg-amber-400/[0.04]";
  if (position <= 3) return "bg-white/[0.015]";
  return "";
}

type DriverStandingRowProps = {
  standing: DriverStanding;
  driver?: Driver;
  team?: Team;
  wdcStatus?: WdcStatus;
  gap: number;
};

const DriverStandingRow = memo(function DriverStandingRow({
  standing,
  driver,
  team,
  wdcStatus,
  gap,
}: DriverStandingRowProps) {
  return (
    <tr
      className={`border-b border-white/[0.06] last:border-b-0 ${rowTone(standing.position)}`}
    >
      <td
        className={`sticky left-0 z-10 bg-neutral-950 px-2 py-2 text-center text-[11px] font-black tabular-nums sm:px-3 ${positionTone(standing.position)}`}
      >
        {standing.position}
      </td>
      <td className="min-w-0 px-1 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-5 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: team?.color ?? "#737373" }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-black text-neutral-100">
              {driver?.lastName ?? standing.driverId}
            </span>
            <span className="mt-0.5 block truncate text-[10px] font-semibold text-neutral-500">
              {driver?.code ?? ""}
              {standing.wins > 0 ? ` · ${standing.wins}W` : ""}
            </span>
          </span>
          {wdcStatus === "champion" ? (
            <span
              aria-label="Projected world drivers champion"
              className="shrink-0 rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-300"
            >
              WDC
            </span>
          ) : wdcStatus === "outOfContention" ? (
            <span
              aria-label="Out of championship contention"
              className="shrink-0 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neutral-500"
            >
              Out
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-1 py-2 text-right tabular-nums text-neutral-500">
        {gap === 0 ? "—" : `-${gap}`}
      </td>
      <td className="px-2 py-2 text-right font-black tabular-nums text-amber-400 sm:px-3">
        {standing.points}
      </td>
    </tr>
  );
});

type TeamStandingRowProps = {
  standing: TeamStanding;
  team?: Team;
  gap: number;
};

const TeamStandingRow = memo(function TeamStandingRow({
  standing,
  team,
  gap,
}: TeamStandingRowProps) {
  return (
    <tr
      className={`border-b border-white/[0.06] last:border-b-0 ${rowTone(standing.position)}`}
    >
      <td
        className={`sticky left-0 z-10 bg-neutral-950 px-2 py-2 text-center text-[11px] font-black tabular-nums sm:px-3 ${positionTone(standing.position)}`}
      >
        {standing.position}
      </td>
      <td className="min-w-0 px-1 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-5 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: team?.color ?? "#737373" }}
          />
          <span className="truncate font-semibold text-neutral-100">
            {team?.name ?? standing.teamId}
          </span>
        </div>
      </td>
      <td className="px-1 py-2 text-right tabular-nums text-neutral-500">
        {gap === 0 ? "—" : `-${gap}`}
      </td>
      <td className="px-2 py-2 text-right font-black tabular-nums text-amber-400 sm:px-3">
        {standing.points}
      </td>
    </tr>
  );
});

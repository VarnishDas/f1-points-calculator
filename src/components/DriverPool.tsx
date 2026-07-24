import { memo, useMemo, useState } from "react";

import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import type { Team } from "../types/team";
import DriverTile from "./DriverTile";
import EmptyState from "./EmptyState";

type DriverPoolProps = {
  drivers: Driver[];
  teams: Team[];
  activeDriverIds: string[];
  races: Race[];
};

const DriverPool = memo(function DriverPool({
  drivers,
  teams,
  activeDriverIds,
  races,
}: DriverPoolProps) {
  const [query, setQuery] = useState("");
  const teamById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );
  const activeDriverIdSet = useMemo(
    () => new Set(activeDriverIds),
    [activeDriverIds],
  );
  const assignedDriverIds = useMemo(() => {
    const ids = new Set<string>();
    for (const race of races) {
      if (race.status !== "upcoming") continue;
      for (const driverId of race.prediction ?? []) {
        if (driverId) ids.add(driverId);
      }
      for (const driverId of race.sprintPrediction ?? []) {
        if (driverId) ids.add(driverId);
      }
    }
    return ids;
  }, [races]);

  const activeDrivers = useMemo(() => {
    const filtered = drivers.filter((driver) =>
      activeDriverIdSet.has(driver.id),
    );
    const needle = query.trim().toLocaleLowerCase();
    const searched = needle
      ? filtered.filter((driver) => {
          const teamName = teamById.get(driver.teamId)?.name ?? "";
          return `${driver.firstName} ${driver.lastName} ${driver.code} ${teamName}`
            .toLocaleLowerCase()
            .includes(needle);
        })
      : filtered;
    return searched.sort((a, b) => {
      const aAssigned = assignedDriverIds.has(a.id) ? 1 : 0;
      const bAssigned = assignedDriverIds.has(b.id) ? 1 : 0;
      if (aAssigned !== bAssigned) return aAssigned - bAssigned;
      return a.lastName.localeCompare(b.lastName);
    });
  }, [activeDriverIdSet, assignedDriverIds, drivers, query, teamById]);

  const assignedCount = activeDrivers.filter((driver) =>
    assignedDriverIds.has(driver.id),
  ).length;

  return (
    <section className="surface-card shrink-0 overflow-hidden rounded-xl">
      <div className="flex flex-col gap-2 border-b border-white/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black uppercase tracking-[0.12em] text-neutral-100">
              Driver Pool
            </h2>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-neutral-400">
              {activeDrivers.length}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            Drag a driver onto the board
            {assignedCount > 0
              ? ` · ${assignedCount} already placed`
              : ""}
          </p>
        </div>
        <label className="relative block w-full sm:max-w-[14rem]">
          <span className="sr-only">Filter drivers</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter drivers…"
            className="driver-search-input h-9 w-full rounded-md border border-white/10 bg-black/25 px-3 pr-8 text-xs text-white placeholder:text-neutral-600"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-1 my-auto grid h-7 w-7 place-items-center rounded text-neutral-500 hover:text-neutral-200"
              aria-label="Clear driver filter"
            >
              ×
            </button>
          ) : null}
        </label>
      </div>
      {activeDrivers.length === 0 ? (
        <div className="p-2.5 sm:p-2">
          <EmptyState
            title={query ? "No matching drivers" : "Driver pool is empty"}
            description={
              query
                ? "Try a different name, code, or team."
                : "There are no active drivers available to place right now."
            }
          />
        </div>
      ) : (
        <div className="custom-scrollbar grid grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] gap-2 overflow-visible p-2.5 sm:gap-1.5 sm:p-2 lg:max-h-40 lg:overflow-auto xl:max-h-none xl:overflow-visible">
          {activeDrivers.map((driver) => (
            <DriverTile
              key={driver.id}
              driver={driver}
              team={teamById.get(driver.teamId)}
              isAssigned={assignedDriverIds.has(driver.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
});

export default DriverPool;

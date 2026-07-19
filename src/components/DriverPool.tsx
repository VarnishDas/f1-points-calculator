import { useMemo } from "react";

import type { Driver } from "../types/driver";
import type { Team } from "../types/team";
import DriverTile from "./DriverTile";

type DriverPoolProps = {
  drivers: Driver[];
  teams: Team[];
  activeDriverIds: string[];
};

export default function DriverPool({
  drivers,
  teams,
  activeDriverIds,
}: DriverPoolProps) {
  const teamById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );
  const activeDriverIdSet = useMemo(
    () => new Set(activeDriverIds),
    [activeDriverIds],
  );
  const activeDrivers = useMemo(
    () => drivers.filter((driver) => activeDriverIdSet.has(driver.id)),
    [activeDriverIdSet, drivers],
  );
  return (
    <section className="shrink-0 rounded-md border border-white/10 bg-neutral-950/75 shadow-2xl shadow-black/25">
      <div className="flex flex-col gap-0.5 border-b border-white/10 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-3">
        <h2 className="text-xs font-black uppercase tracking-[0.12em] text-neutral-100">
          Driver Pool
        </h2>
        <p className="text-[11px] text-neutral-500">
          Drag a driver to a prediction position
        </p>
      </div>
      <div className="custom-scrollbar grid grid-cols-[repeat(auto-fill,minmax(6.25rem,1fr))] gap-2 overflow-visible p-2.5 sm:gap-1.5 sm:p-2 lg:max-h-36 lg:overflow-auto xl:max-h-none xl:overflow-visible">
        {activeDrivers.map((driver) => (
          <DriverTile
            key={driver.id}
            driver={driver}
            team={teamById.get(driver.teamId)}
          />
        ))}
      </div>
    </section>
  );
}

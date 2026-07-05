import type { Driver } from "../types/driver";
import type { Team } from "../types/team";
import DriverTile from "./DriverTile";

type DriverPoolProps = {
  drivers: Driver[];
  teams: Team[];
};

export default function DriverPool({ drivers, teams }: DriverPoolProps) {
  const teamById = new Map(teams.map((team) => [team.id, team]));

  return (
    <section className="rounded-md border border-white/10 bg-neutral-950/75 shadow-2xl shadow-black/25">
      <div className="flex flex-col gap-1 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-neutral-100">
          Driver Pool
        </h2>
        <p className="text-xs text-neutral-500">
          Drag a driver into any editable race cell
        </p>
      </div>
      <div className="grid max-h-48 grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2 overflow-y-auto p-3 sm:grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] xl:max-h-36">
        {drivers.map((driver) => (
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

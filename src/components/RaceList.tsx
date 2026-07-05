import type { Race } from "../types/race";
import type { Driver } from "../types/driver";
import type { Team } from "../types/team";
import RaceCard from "./RaceCard";
import { sortRacesByRound } from "./raceUtils";

type RaceListProps = {
  races: Race[];
  drivers: Driver[];
  teams: Team[];
  /** Driver IDs in current projected standings order, for initial prediction order. */
  driverOrder: string[];
};

export default function RaceList({ races, drivers, teams, driverOrder }: RaceListProps) {
  const sortedRaces = sortRacesByRound(races);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {sortedRaces.map((race) => (
        <RaceCard
          key={race.id}
          race={race}
          drivers={drivers}
          teams={teams}
          driverOrder={driverOrder}
        />
      ))}
    </div>
  );
}

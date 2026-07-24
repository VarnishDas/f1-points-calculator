import type { Driver } from "../types/driver";
import type { Team } from "../types/team";
import type { Race } from "../types/race";

import teamsData from "./teams.json";
import driversData from "./drivers.json";
import racesData from "./races.json";
import metadataData from "./metadata.json";

export type DataMetadata = {
  season: number;
  source: string;
  generatedAt: string;
  warnings: string[];
};

export const teams: Team[] = teamsData as Team[];
export const drivers: Driver[] = driversData as Driver[];
export const races: Race[] = racesData as Race[];
export const metadata: DataMetadata = metadataData as DataMetadata;
export const activeDriverIds = drivers.map((driver) => driver.id);

/** Number of races with official Grand Prix results loaded from the F1 data source. */
export const completedRaceCount = races.filter(
  (race) => race.status === "completed",
).length;

import type { Driver } from "../types/driver";
import type { Team } from "../types/team";
import type { Race } from "../types/race";

import teamsData from "./teams.json";
import driversData from "./drivers.json";
import racesData from "./races.json";

export const teams: Team[] = teamsData as Team[];
export const drivers: Driver[] = driversData as Driver[];
export const races: Race[] = racesData as Race[];

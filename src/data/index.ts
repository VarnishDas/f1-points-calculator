import type { ActiveDriver, Driver } from "../types/driver";
import type { Team } from "../types/team";
import type { Race } from "../types/race";

import teamsData from "./teams.json";
import driversData from "./drivers.json";
import racesData from "./races.json";
import activeDriversData from "./active-drivers.json";

export const teams: Team[] = teamsData as Team[];
export const drivers: Driver[] = driversData as Driver[];
export const races: Race[] = racesData as Race[];
export const activeDrivers: ActiveDriver[] = activeDriversData as ActiveDriver[];
export const activeDriverIds = activeDrivers.map((activeDriver) => {
  const driver = drivers.find((candidate) => candidate.sourceId === activeDriver.sourceId);
  if (!driver) {
    throw new Error(
      `Active driver ${activeDriver.sourceId} is missing from generated driver data`,
    );
  }
  return driver.id;
});

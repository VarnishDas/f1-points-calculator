import type { Driver } from "../types/driver";
import type { Race } from "../types/race";
import type { WdcStatus } from "../types/standings";
import type { Team } from "../types/team";
import type { DriverChampionshipEntry } from "./standingsAggregation";

import { getPointsForSessionPosition } from "./calculateRacePoints";
import { getClassificationSize } from "../utils/classification";
import { isPredictionSessionEditable } from "../utils/predictionSession";
import {
  compareChampionshipPerformance,
  resolveChampionshipOrder,
} from "./resolveTies";
import { aggregateChampionshipEntries } from "./standingsAggregation";

export type WdcStatusByDriverId = Record<string, WdcStatus>;

function addPositionCount(
  positionCounts: readonly number[],
  position: number,
): number[] {
  const counts = [...positionCounts];
  counts[position - 1] = (counts[position - 1] ?? 0) + 1;
  return counts;
}

function bestAvailableSessionPosition(
  prediction: readonly string[] | null | undefined,
  driverId: string,
  classificationSize: number,
): number | null {
  if (prediction?.includes(driverId)) return null;

  for (let index = 0; index < classificationSize; index++) {
    if (!prediction?.[index]) return index + 1;
  }

  return null;
}

function sessionHasEmptySlot(
  prediction: readonly string[] | null | undefined,
  classificationSize: number,
): boolean {
  for (let index = 0; index < classificationSize; index++) {
    if (!prediction?.[index]) return true;
  }
  return false;
}

function applyBestCaseRace(
  bestCase: DriverChampionshipEntry,
  race: Race,
  driverId: string,
  classificationSize: number,
): DriverChampionshipEntry {
  if (race.status !== "upcoming") return bestCase;

  let nextCase = bestCase;

  if (isPredictionSessionEditable(race, "grandPrix")) {
    const gpPosition = bestAvailableSessionPosition(
      race.prediction,
      driverId,
      classificationSize,
    );
    if (gpPosition !== null) {
      nextCase = {
        ...nextCase,
        points: nextCase.points + getPointsForSessionPosition(gpPosition, "grandPrix"),
        positionCounts: addPositionCount(nextCase.positionCounts, gpPosition),
      };
    }
  }

  if (isPredictionSessionEditable(race, "sprint")) {
    const sprintPosition = bestAvailableSessionPosition(
      race.sprintPrediction,
      driverId,
      classificationSize,
    );
    if (sprintPosition !== null) {
      nextCase = {
        ...nextCase,
        points: nextCase.points + getPointsForSessionPosition(sprintPosition, "sprint"),
      };
    }
  }

  return nextCase;
}

function canStillWinWdc(
  driverId: string,
  races: readonly Race[],
  entries: readonly DriverChampionshipEntry[],
  classificationSize: number,
): boolean {
  const entry = entries.find((candidate) => candidate.driverId === driverId);
  if (!entry) return false;

  let bestCase: DriverChampionshipEntry = { ...entry };

  for (const race of races) {
    bestCase = applyBestCaseRace(bestCase, race, driverId, classificationSize);
  }

  return entries.every((rival) => {
    if (rival.driverId === driverId) return true;
    return compareChampionshipPerformance(bestCase, rival) >= 0;
  });
}

function raceHasUnresolvedSlots(
  race: Race,
  classificationSize: number,
): boolean {
  if (race.status !== "upcoming") return false;

  if (
    isPredictionSessionEditable(race, "grandPrix") &&
    sessionHasEmptySlot(race.prediction, classificationSize)
  ) {
    return true;
  }

  if (isPredictionSessionEditable(race, "sprint")) {
    return sessionHasEmptySlot(race.sprintPrediction, classificationSize);
  }

  return false;
}

function hasResolvedChampion(entries: readonly DriverChampionshipEntry[]): string | null {
  const ordered = resolveChampionshipOrder(entries);
  const leader = ordered[0];
  const runnerUp = ordered[1];

  if (!leader) return null;
  if (!runnerUp) return leader.driverId;

  return compareChampionshipPerformance(leader, runnerUp) > 0
    ? leader.driverId
    : null;
}

/**
 * Calculate conservative World Drivers' Championship status.
 *
 * For each driver, unresolved race slots are modeled in that driver's best
 * case: they take the best still-empty classification position and rivals
 * receive no additional points. If even that cannot put them ahead on points
 * or race countback, they are out. If race countback cannot separate a tie,
 * the driver remains in contention because this app does not model
 * qualifying-result tie-breaks.
 */
export function calculateWdcStatus(
  races: readonly Race[],
  drivers: readonly Driver[],
  teams: readonly Team[],
): WdcStatusByDriverId {
  const entries = aggregateChampionshipEntries(
    races,
    drivers,
    teams,
    "officialAndPredicted",
  ).drivers;
  const classificationSize = getClassificationSize(races);
  const statuses: WdcStatusByDriverId = Object.fromEntries(
    drivers.map((driver) => [driver.id, "inContention" satisfies WdcStatus]),
  );

  const canWinByDriverId = new Map(
    entries.map((entry) => [
      entry.driverId,
      canStillWinWdc(entry.driverId, races, entries, classificationSize),
    ]),
  );

  const currentLeader = resolveChampionshipOrder(entries)[0];
  const championId =
    races.every(
      (race) =>
        race.status !== "upcoming" || !raceHasUnresolvedSlots(race, classificationSize),
    )
      ? hasResolvedChampion(entries)
      : currentLeader &&
          entries.every(
            (rival) =>
              rival.driverId === currentLeader.driverId ||
              !canWinByDriverId.get(rival.driverId),
          )
        ? currentLeader.driverId
        : null;

  for (const entry of entries) {
    if (entry.driverId === championId) {
      statuses[entry.driverId] = "champion";
    } else if (!canWinByDriverId.get(entry.driverId)) {
      statuses[entry.driverId] = "outOfContention";
    }
  }

  return statuses;
}

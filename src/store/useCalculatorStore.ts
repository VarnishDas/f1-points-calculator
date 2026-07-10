import { create } from "zustand";

import type { Driver } from "../types/driver";
import type { PredictionSessionType, Race } from "../types/race";
import type { Team } from "../types/team";
import type { ScenarioPredictionsBySession } from "../utils/encodeScenario";

import {
  activeDriverIds as initialActiveDriverIds,
  drivers as initialDrivers,
  races as initialRaces,
  teams as initialTeams,
} from "../data";
import { getClassificationSize } from "../utils/classification";
import { isPredictionSessionEditable } from "../utils/predictionSession";

const PREDICTION_FIELD: Record<PredictionSessionType, keyof Pick<Race, "prediction" | "sprintPrediction">> = {
  grandPrix: "prediction",
  sprint: "sprintPrediction",
};

export interface CalculatorState {
  races: Race[];
  drivers: Driver[];
  teams: Team[];
  activeDriverIds: string[];
  updatePrediction: (
    raceId: string,
    session: PredictionSessionType,
    orderedDriverIds: string[],
  ) => void;
  clearPredictionPosition: (
    raceId: string,
    session: PredictionSessionType,
    positionIndex: number,
  ) => void;
  applyScenario: (scenario: ScenarioPredictionsBySession) => void;
  resetPredictions: () => void;
}

/**
 * Copy the imported race data so the store never mutates the JSON module
 * in place. Result arrays are cloned to keep them independent.
 */
function cloneRaces(races: Race[]): Race[] {
  return races.map((race) => ({
    ...race,
    grandPrixResult: race.grandPrixResult
      ? race.grandPrixResult.map((entry) => ({ ...entry }))
      : null,
    sprintResult: race.sprintResult
      ? race.sprintResult.map((entry) => ({ ...entry }))
      : race.sprintResult,
    prediction: race.prediction ? race.prediction.slice() : null,
    sprintPrediction: race.sprintPrediction ? race.sprintPrediction.slice() : null,
  }));
}

function applyEntriesToPrediction(
  entries: { p: number; d: string }[] | undefined,
  allowedDriverIds: ReadonlySet<string>,
  classificationSize: number,
): string[] | null {
  if (!entries?.length) return null;

  const nextResult: string[] = [];
  const usedPositions = new Set<number>();
  for (const entry of entries) {
    const positionIndex = entry.p - 1;
    if (
      !Number.isInteger(entry.p) ||
      positionIndex < 0 ||
      positionIndex >= classificationSize ||
      usedPositions.has(positionIndex)
    ) {
      continue;
    }
    usedPositions.add(positionIndex);
    nextResult[positionIndex] = entry.d;
  }

  return normalizePrediction(nextResult, allowedDriverIds, classificationSize);
}

function normalizePrediction(
  prediction: readonly string[],
  allowedDriverIds: ReadonlySet<string>,
  classificationSize: number,
): string[] | null {
  const normalized: string[] = [];
  const usedDrivers = new Set<string>();

  for (let index = 0; index < Math.min(prediction.length, classificationSize); index++) {
    const driverId = prediction[index];
    if (
      !driverId ||
      !allowedDriverIds.has(driverId) ||
      usedDrivers.has(driverId)
    ) {
      continue;
    }
    usedDrivers.add(driverId);
    normalized[index] = driverId;
  }

  trimEmptyTrailingPositions(normalized);
  return normalized.length ? normalized : null;
}

function trimEmptyTrailingPositions(prediction: string[]): void {
  while (prediction.length > 0 && prediction[prediction.length - 1] === undefined) {
    prediction.length -= 1;
  }
}

export const useCalculatorStore = create<CalculatorState>()((set) => ({
  races: cloneRaces(initialRaces),
  drivers: initialDrivers,
  teams: initialTeams,
  activeDriverIds: initialActiveDriverIds,

  updatePrediction: (raceId, session, orderedDriverIds) =>
    set((state) => {
      const race = state.races.find((r) => r.id === raceId);
      if (!race || !isPredictionSessionEditable(race, session)) return state;
      const field = PREDICTION_FIELD[session];
      const normalized = normalizePrediction(
        orderedDriverIds,
        new Set(state.activeDriverIds),
        getClassificationSize(state.races),
      );
      return {
        races: state.races.map((r) =>
          r.id === raceId ? { ...r, [field]: normalized } : r,
        ),
      } as { races: Race[] };
    }),

  clearPredictionPosition: (raceId, session, positionIndex) =>
    set((state) => {
      const race = state.races.find((r) => r.id === raceId);
      if (!race || !isPredictionSessionEditable(race, session)) return state;
      const field = PREDICTION_FIELD[session];
      const current = race[field] as string[] | null;
      if (!current || positionIndex < 0 || positionIndex >= getClassificationSize(state.races)) {
        return state;
      }

      const nextResult = current.slice();
      delete nextResult[positionIndex];
      trimEmptyTrailingPositions(nextResult);

      return {
        races: state.races.map((r) =>
          r.id === raceId
            ? { ...r, [field]: nextResult.length ? nextResult : null }
            : r,
        ),
      } as { races: Race[] };
    }),

  applyScenario: ({ predictions, sprintPredictions }) =>
    set((state) => {
      const allowedDriverIds = new Set(state.activeDriverIds);
      const classificationSize = getClassificationSize(state.races);
      return {
        races: state.races.map((race) => {
          if (race.status !== "upcoming") return race;

          return {
            ...race,
            prediction: isPredictionSessionEditable(race, "grandPrix")
              ? applyEntriesToPrediction(
                  predictions[race.id],
                  allowedDriverIds,
                  classificationSize,
                )
              : null,
            sprintPrediction: isPredictionSessionEditable(race, "sprint")
              ? applyEntriesToPrediction(
                  sprintPredictions[race.id],
                  allowedDriverIds,
                  classificationSize,
                )
              : null,
          };
        }),
      };
    }),

  resetPredictions: () =>
    set((state) => ({
      races: state.races.map((r) =>
        r.status === "upcoming"
          ? { ...r, prediction: null, sprintPrediction: null }
          : r,
      ),
    })),
}));

import { create } from "zustand";

import type { Driver } from "../types/driver";
import type { PredictionSessionType, Race } from "../types/race";
import type { DriverStanding, TeamStanding } from "../types/standings";
import type { Team } from "../types/team";
import type { ScenarioPredictionsBySession } from "../utils/encodeScenario";

import { drivers as initialDrivers, races as initialRaces, teams as initialTeams } from "../data";
import { calculateStandings } from "../engine/calculateStandings";

const PREDICTION_FIELD: Record<PredictionSessionType, keyof Pick<Race, "prediction" | "sprintPrediction">> = {
  grandPrix: "prediction",
  sprint: "sprintPrediction",
};

export interface CalculatorState {
  races: Race[];
  drivers: Driver[];
  teams: Team[];
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

function canMutatePrediction(race: Race, session: PredictionSessionType): boolean {
  if (race.status !== "upcoming") return false;
  if (session === "sprint" && !race.hasSprint) return false;
  if (session === "sprint" && race.sprintResult?.length) return false;
  return true;
}

function applyEntriesToPrediction(
  race: Race,
  session: PredictionSessionType,
  entries: { p: number; d: string }[] | undefined,
): Race {
  const field = PREDICTION_FIELD[session];
  if (!entries || entries.length === 0) {
    return { ...race, [field]: null } as Race;
  }

  const nextResult: string[] = [];
  for (const entry of entries) {
    nextResult[entry.p - 1] = entry.d;
  }
  while (nextResult.length > 0 && nextResult[nextResult.length - 1] === undefined) {
    nextResult.length -= 1;
  }

  return { ...race, [field]: nextResult.length ? nextResult : null } as Race;
}

export const useCalculatorStore = create<CalculatorState>()((set) => ({
  races: cloneRaces(initialRaces),
  drivers: initialDrivers,
  teams: initialTeams,

  updatePrediction: (raceId, session, orderedDriverIds) =>
    set((state) => {
      const race = state.races.find((r) => r.id === raceId);
      if (!race || !canMutatePrediction(race, session)) return state;
      const field = PREDICTION_FIELD[session];
      return {
        races: state.races.map((r) =>
          r.id === raceId ? { ...r, [field]: orderedDriverIds.slice() } : r,
        ),
      } as { races: Race[] };
    }),

  clearPredictionPosition: (raceId, session, positionIndex) =>
    set((state) => {
      const race = state.races.find((r) => r.id === raceId);
      if (!race || !canMutatePrediction(race, session)) return state;
      const field = PREDICTION_FIELD[session];
      const current = race[field] as string[] | null;
      if (!current) return state;

      const nextResult = current.slice();
      delete nextResult[positionIndex];
      while (nextResult.length > 0 && nextResult[nextResult.length - 1] === undefined) {
        nextResult.length -= 1;
      }

      return {
        races: state.races.map((r) =>
          r.id === raceId
            ? { ...r, [field]: nextResult.length ? nextResult : null }
            : r,
        ),
      } as { races: Race[] };
    }),

  applyScenario: ({ predictions, sprintPredictions }) =>
    set((state) => ({
      races: state.races.map((race) => {
        if (race.status !== "upcoming") return race;

        let nextRace = applyEntriesToPrediction(race, "grandPrix", predictions[race.id]);
        if (race.hasSprint) {
          nextRace = applyEntriesToPrediction(nextRace, "sprint", sprintPredictions[race.id]);
        }
        return nextRace;
      }),
    })),

  resetPredictions: () =>
    set((state) => ({
      races: state.races.map((r) =>
        r.status === "upcoming"
          ? { ...r, prediction: null, sprintPrediction: null }
          : r,
      ),
    })),
}));

/**
 * Selectors keep the store as the single source of truth for computed
 * standings. They derive driver/constructor standings from current state.
 */
export function selectDriverStandings(state: CalculatorState): DriverStanding[] {
  return calculateStandings(state.races, state.drivers, state.teams).drivers;
}

export function selectTeamStandings(state: CalculatorState): TeamStanding[] {
  return calculateStandings(state.races, state.drivers, state.teams).teams;
}

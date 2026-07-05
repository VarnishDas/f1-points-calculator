import { describe, it, expect, beforeEach } from "vitest";
import {
  selectDriverStandings,
  selectTeamStandings,
  useCalculatorStore,
} from "../useCalculatorStore";
import { calculateStandings } from "../../engine/calculateStandings";
import { drivers as staticDrivers, races as staticRaces, teams as staticTeams } from "../../data";
import { RACE_CLASSIFICATION_SIZE } from "../../constants/race";
import type { ScenarioPredictions } from "../../utils/encodeScenario";

describe("useCalculatorStore", () => {
  beforeEach(() => {
    useCalculatorStore.getState().resetPredictions();
  });

  it("initializes from the static JSON data without mutating it", () => {
    const { races } = useCalculatorStore.getState();
    expect(races).toHaveLength(staticRaces.length);
    expect(useCalculatorStore.getState().drivers).toEqual(staticDrivers);
    expect(useCalculatorStore.getState().teams).toEqual(staticTeams);
    // Imported JSON official result arrays must remain untouched.
    staticRaces.forEach((race) => {
      const storeRace = races.find((r) => r.id === race.id);
      expect(storeRace).not.toBe(race);
      if (race.grandPrixResult) {
        expect(storeRace?.grandPrixResult).not.toBe(race.grandPrixResult);
      }
      if (race.sprintResult) expect(storeRace?.sprintResult).not.toBe(race.sprintResult);
      if (race.prediction) expect(storeRace?.prediction).not.toBe(race.prediction);
    });
  });

  it("updatePrediction replaces the prediction of an upcoming race", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    useCalculatorStore
      .getState()
      .updatePrediction(upcoming.id, ["norris", "piastri", "verstappen"]);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toEqual(["norris", "piastri", "verstappen"]);
  });

  it("updatePrediction preserves empty prediction slots for arbitrary positions", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    const prediction: string[] = [];
    prediction[4] = "norris";
    useCalculatorStore.getState().updatePrediction(upcoming.id, prediction);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toHaveLength(5);
    expect(updated?.prediction?.[0]).toBeUndefined();
    expect(updated?.prediction?.[4]).toBe("norris");
  });

  it("updatePrediction preserves all configured classified finishing positions", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    const prediction: string[] = [];
    prediction[RACE_CLASSIFICATION_SIZE - 1] = "norris";
    useCalculatorStore.getState().updatePrediction(upcoming.id, prediction);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toHaveLength(RACE_CLASSIFICATION_SIZE);
    expect(updated?.prediction?.[RACE_CLASSIFICATION_SIZE - 1]).toBe("norris");
  });

  it("updatePrediction does not modify completed races", () => {
    const completed = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "completed");
    if (!completed) throw new Error("expected at least one completed race");
    const originalResult = completed.grandPrixResult
      ? completed.grandPrixResult.map((entry) => ({ ...entry }))
      : null;

    useCalculatorStore.getState().updatePrediction(completed.id, ["norris", "piastri"]);

    const after = useCalculatorStore
      .getState()
      .races.find((r) => r.id === completed.id);
    expect(after?.status).toBe("completed");
    expect(after?.grandPrixResult).toEqual(originalResult);
    expect(after?.prediction).toBeNull();
  });

  it("updatePrediction leaves state unchanged for an unknown race id", () => {
    const before = useCalculatorStore.getState();
    useCalculatorStore.getState().updatePrediction("does-not-exist", ["norris"]);
    expect(useCalculatorStore.getState()).toBe(before);
  });

  it("clearPredictionPosition removes one driver from an upcoming race", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    useCalculatorStore
      .getState()
      .updatePrediction(upcoming.id, ["norris", "piastri", "verstappen"]);
    useCalculatorStore.getState().clearPredictionPosition(upcoming.id, 1);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toHaveLength(3);
    expect(updated?.prediction?.[0]).toBe("norris");
    expect(updated?.prediction?.[1]).toBeUndefined();
    expect(updated?.prediction?.[2]).toBe("verstappen");
  });

  it("clearPredictionPosition resets an upcoming race to null when no positions remain", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    useCalculatorStore.getState().updatePrediction(upcoming.id, ["norris"]);
    useCalculatorStore.getState().clearPredictionPosition(upcoming.id, 0);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toBeNull();
  });

  it("clearPredictionPosition does not modify completed races", () => {
    const completed = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "completed");
    if (!completed) throw new Error("expected at least one completed race");
    const originalResult = completed.grandPrixResult
      ? completed.grandPrixResult.map((entry) => ({ ...entry }))
      : null;

    useCalculatorStore.getState().clearPredictionPosition(completed.id, 0);

    const after = useCalculatorStore
      .getState()
      .races.find((r) => r.id === completed.id);
    expect(after?.status).toBe("completed");
    expect(after?.grandPrixResult).toEqual(originalResult);
    expect(after?.prediction).toBeNull();
  });

  it("resetPredictions clears upcoming race predictions but preserves completed results", () => {
    const state = useCalculatorStore.getState();
    const upcoming = state.races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");
    state.updatePrediction(upcoming.id, ["norris", "piastri", "verstappen"]);

    useCalculatorStore.getState().resetPredictions();

    const after = useCalculatorStore.getState().races;
    after.forEach((r) => {
      if (r.status === "upcoming") expect(r.prediction).toBeNull();
    });
    const completedWithResults = after.filter(
      (r) => r.status === "completed" && r.grandPrixResult,
    );
    expect(completedWithResults.length).toBeGreaterThan(0);
  });

  it("selectDriverStandings matches calculateStandings on the store's races", () => {
    const state = useCalculatorStore.getState();
    const expected = calculateStandings(state.races, state.drivers, state.teams).drivers;
    expect(selectDriverStandings(state)).toEqual(expected);
  });
});

describe("selectTeamStandings", () => {
  it("returns a sorted TeamStanding[] for all generated teams", () => {
    const state = useCalculatorStore.getState();
    const teamStandings = selectTeamStandings(state);
    const points = teamStandings.map((t) => t.points);
    expect(teamStandings).toHaveLength(state.teams.length);
    expect(points).toEqual([...points].sort((a, b) => b - a));
    teamStandings.forEach((row, index) => {
      expect(row.position).toBe(index + 1);
    });
  });

  it("produces non-negative constructor points", () => {
    const state = useCalculatorStore.getState();
    const teamStandings = selectTeamStandings(state);
    expect(teamStandings.every((standing) => standing.points >= 0)).toBe(true);
  });

  it("matches the team standings produced by calculateStandings", () => {
    const state = useCalculatorStore.getState();
    const expected = calculateStandings(state.races, state.drivers, state.teams).teams;
    expect(selectTeamStandings(state)).toEqual(expected);
  });
});

describe("applyScenario", () => {
  beforeEach(() => {
    useCalculatorStore.getState().resetPredictions();
  });

  it("applies decoded predictions to upcoming races", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    const predictions: ScenarioPredictions = {
      [upcoming.id]: [
        { p: 1, d: "norris" },
        { p: 2, d: "piastri" },
        { p: 3, d: "verstappen" },
      ],
    };

    useCalculatorStore.getState().applyScenario(predictions);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toEqual(["norris", "piastri", "verstappen"]);
  });

  it("preserves empty gaps when applying sparse predictions", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    const predictions: ScenarioPredictions = {
      [upcoming.id]: [{ p: 5, d: "norris" }],
    };

    useCalculatorStore.getState().applyScenario(predictions);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toHaveLength(5);
    expect(updated?.prediction?.[0]).toBeUndefined();
    expect(updated?.prediction?.[4]).toBe("norris");
  });

  it("clears unrelated upcoming races so the scenario is authoritative", () => {
    const races = useCalculatorStore.getState().races;
    const firstUpcoming = races.find((r) => r.status === "upcoming");
    const secondUpcoming = races.find((r) => r.status === "upcoming" && r.id !== firstUpcoming?.id);
    if (!firstUpcoming || !secondUpcoming) throw new Error("expected at least two upcoming races");

    useCalculatorStore
      .getState()
      .updatePrediction(secondUpcoming.id, ["norris", "piastri"]);

    const predictions: ScenarioPredictions = {
      [firstUpcoming.id]: [{ p: 1, d: "verstappen" }],
    };

    useCalculatorStore.getState().applyScenario(predictions);

    const first = useCalculatorStore.getState().races.find((r) => r.id === firstUpcoming.id);
    const second = useCalculatorStore.getState().races.find((r) => r.id === secondUpcoming.id);
    expect(first?.prediction).toEqual(["verstappen"]);
    expect(second?.prediction).toBeNull();
  });

  it("does not modify completed races", () => {
    const completed = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "completed");
    if (!completed) throw new Error("expected at least one completed race");
    const originalResult = completed.grandPrixResult
      ? completed.grandPrixResult.map((entry) => ({ ...entry }))
      : null;

    const predictions: ScenarioPredictions = {
      [completed.id]: [{ p: 1, d: "norris" }],
    };

    useCalculatorStore.getState().applyScenario(predictions);

    const after = useCalculatorStore
      .getState()
      .races.find((r) => r.id === completed.id);
    expect(after?.status).toBe("completed");
    expect(after?.grandPrixResult).toEqual(originalResult);
    expect(after?.prediction).toBeNull();
  });

  it("resets all upcoming races when given an empty scenario", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    useCalculatorStore.getState().updatePrediction(upcoming.id, ["norris", "piastri"]);

    useCalculatorStore.getState().applyScenario({});

    const after = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(after?.prediction).toBeNull();
  });

  it("supports the maximum classified finishing position", () => {
    const upcoming = useCalculatorStore
      .getState()
      .races.find((r) => r.status === "upcoming");
    if (!upcoming) throw new Error("expected at least one upcoming race");

    const predictions: ScenarioPredictions = {
      [upcoming.id]: [{ p: RACE_CLASSIFICATION_SIZE, d: "norris" }],
    };

    useCalculatorStore.getState().applyScenario(predictions);

    const updated = useCalculatorStore
      .getState()
      .races.find((r) => r.id === upcoming.id);
    expect(updated?.prediction).toHaveLength(RACE_CLASSIFICATION_SIZE);
    expect(updated?.prediction?.[RACE_CLASSIFICATION_SIZE - 1]).toBe("norris");
  });
});

import { describe, expect, it } from "vitest";

import type { Race } from "../../types/race";
import {
  getDefaultMobileSession,
  getInitialMobileRaceId,
  hasMobileSprintSession,
} from "../mobilePredictionBoardState";

function makeRace(round: number, status: Race["status"]): Race {
  return {
    id: `race-${round}`,
    round,
    name: `Race ${round}`,
    circuit: "Circuit",
    date: "2026-01-01",
    status,
    grandPrixResult: null,
    sprintResult: null,
    prediction: null,
    sprintPrediction: null,
  };
}

describe("getInitialMobileRaceId", () => {
  it("opens the first upcoming race", () => {
    const races = [
      makeRace(1, "completed"),
      makeRace(2, "upcoming"),
      makeRace(3, "upcoming"),
    ];

    expect(getInitialMobileRaceId(races)).toBe("race-2");
  });

  it("falls back to the final race after the season is complete", () => {
    const races = [makeRace(1, "completed"), makeRace(2, "completed")];

    expect(getInitialMobileRaceId(races)).toBe("race-2");
  });

  it("handles an empty calendar", () => {
    expect(getInitialMobileRaceId([])).toBeUndefined();
  });
});

describe("getDefaultMobileSession", () => {
  it("defaults unfinished sprint weekends to the Sprint", () => {
    expect(getDefaultMobileSession(makeRace(1, "upcoming"))).toBe("grandPrix");
    expect(
      getDefaultMobileSession({
        ...makeRace(2, "upcoming"),
        hasSprint: true,
      }),
    ).toBe("sprint");
  });

  it("defaults to the Grand Prix after the Sprint is complete", () => {
    expect(
      getDefaultMobileSession({
        ...makeRace(1, "upcoming"),
        hasSprint: true,
        sprintResult: [{ position: 1, driverId: "a", teamId: "team" }],
      }),
    ).toBe("grandPrix");
  });
});

describe("hasMobileSprintSession", () => {
  it("keeps Sprint and Grand Prix available after a sprint weekend is complete", () => {
    const completedSprintRace = {
      ...makeRace(1, "completed"),
      hasSprint: true,
      sprintResult: [{ position: 1, driverId: "a", teamId: "team" }],
      grandPrixResult: [{ position: 1, driverId: "b", teamId: "team" }],
    };

    expect(getDefaultMobileSession(completedSprintRace)).toBe("grandPrix");
    expect(hasMobileSprintSession(completedSprintRace)).toBe(true);
  });

  it("recognizes persisted sprint data even without the calendar flag", () => {
    expect(
      hasMobileSprintSession({
        ...makeRace(1, "completed"),
        sprintResult: [{ position: 1, driverId: "a", teamId: "team" }],
      }),
    ).toBe(true);
  });

  it("does not show a Sprint session for a Grand Prix-only weekend", () => {
    expect(hasMobileSprintSession(makeRace(1, "completed"))).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { RACE_CLASSIFICATION_SIZE } from "../../constants/race";
import {
  getPredictionMoveSource,
  getPredictionRemovalSource,
  getPredictionDroppableId,
  getPredictionDraggableId,
  placeDriverAtPredictionPosition,
} from "../predictionDnd";

describe("getPredictionDroppableId", () => {
  it("produces unique ids for GP and Sprint cells of the same race and position", () => {
    const gpId = getPredictionDroppableId("chinese-2026", "grandPrix", 0);
    const sprintId = getPredictionDroppableId("chinese-2026", "sprint", 0);

    expect(gpId).not.toBe(sprintId);
    expect(gpId).toBe("cell:chinese-2026:grandPrix:0");
    expect(sprintId).toBe("cell:chinese-2026:sprint:0");
  });

  it("produces unique ids for different positions of the same session", () => {
    const p1 = getPredictionDroppableId("chinese-2026", "grandPrix", 0);
    const p2 = getPredictionDroppableId("chinese-2026", "grandPrix", 1);

    expect(p1).not.toBe(p2);
  });

  it("produces unique ids for different races", () => {
    const china = getPredictionDroppableId("chinese-2026", "grandPrix", 0);
    const miami = getPredictionDroppableId("miami-2026", "grandPrix", 0);

    expect(china).not.toBe(miami);
  });
});

describe("getPredictionDraggableId", () => {
  it("produces unique ids for GP and Sprint cells of the same race and driver", () => {
    const gpId = getPredictionDraggableId("chinese-2026", "grandPrix", "norris");
    const sprintId = getPredictionDraggableId("chinese-2026", "sprint", "norris");

    expect(gpId).not.toBe(sprintId);
    expect(gpId).toBe("pick:chinese-2026:grandPrix:norris");
    expect(sprintId).toBe("pick:chinese-2026:sprint:norris");
  });
});

describe("placeDriverAtPredictionPosition", () => {
  it("places a driver directly into a lower empty finishing position", () => {
    const result = placeDriverAtPredictionPosition(null, "norris", 4);

    expect(result).toHaveLength(5);
    expect(result[0]).toBeUndefined();
    expect(result[4]).toBe("norris");
  });

  it("supports the final classified finishing position", () => {
    const result = placeDriverAtPredictionPosition(
      null,
      "norris",
      RACE_CLASSIFICATION_SIZE - 1,
    );

    expect(RACE_CLASSIFICATION_SIZE).toBe(22);
    expect(result).toHaveLength(22);
    expect(result[21]).toBe("norris");
  });

  it("moves an existing driver without compacting empty positions", () => {
    const current: string[] = [];
    current[0] = "norris";

    const result = placeDriverAtPredictionPosition(current, "norris", 6);

    expect(result).toHaveLength(7);
    expect(result[0]).toBeUndefined();
    expect(result[6]).toBe("norris");
  });

  it("trims trailing empty positions after a move", () => {
    const current: string[] = [];
    current[5] = "norris";

    const result = placeDriverAtPredictionPosition(current, "norris", 1);

    expect(result).toHaveLength(2);
    expect(result[1]).toBe("norris");
  });
});

describe("getPredictionRemovalSource", () => {
  const placedDriver = {
    type: "prediction-driver" as const,
    driverId: "norris",
    raceId: "belgian-2026",
    session: "grandPrix" as const,
    index: 0,
  };

  it("removes a placed driver when it is released outside a placement cell", () => {
    expect(getPredictionRemovalSource(placedDriver, undefined)).toEqual({
      raceId: "belgian-2026",
      session: "grandPrix",
      index: 0,
    });
  });

  it("removes a placed driver when it is released over a non-editable cell", () => {
    expect(
      getPredictionRemovalSource(placedDriver, {
        type: "prediction-cell",
        raceId: "australian-2026",
        session: "grandPrix",
        index: 0,
        editable: false,
      }),
    ).toEqual({
      raceId: "belgian-2026",
      session: "grandPrix",
      index: 0,
    });
  });

  it("keeps a placed driver when it is released over an editable cell", () => {
    expect(
      getPredictionRemovalSource(placedDriver, {
        type: "prediction-cell",
        raceId: "belgian-2026",
        session: "grandPrix",
        index: 1,
        editable: true,
      }),
    ).toBeNull();
  });

  it("does not remove a driver dragged from the pool", () => {
    expect(
      getPredictionRemovalSource(
        { type: "pool-driver", driverId: "norris" },
        undefined,
      ),
    ).toBeNull();
  });
});

describe("getPredictionMoveSource", () => {
  const placedDriver = {
    type: "prediction-driver" as const,
    driverId: "norris",
    raceId: "belgian-2026",
    session: "grandPrix" as const,
    index: 0,
  };

  it("returns the original position when moving to another race", () => {
    expect(
      getPredictionMoveSource(placedDriver, {
        type: "prediction-cell",
        raceId: "hungarian-2026",
        session: "grandPrix",
        index: 1,
        editable: true,
      }),
    ).toEqual({
      raceId: "belgian-2026",
      session: "grandPrix",
      index: 0,
    });
  });

  it("returns the original position when moving between GP and Sprint", () => {
    expect(
      getPredictionMoveSource(placedDriver, {
        type: "prediction-cell",
        raceId: "belgian-2026",
        session: "sprint",
        index: 1,
        editable: true,
      }),
    ).toEqual({
      raceId: "belgian-2026",
      session: "grandPrix",
      index: 0,
    });
  });

  it("does not separately clear the source when reordering one session", () => {
    expect(
      getPredictionMoveSource(placedDriver, {
        type: "prediction-cell",
        raceId: "belgian-2026",
        session: "grandPrix",
        index: 1,
        editable: true,
      }),
    ).toBeNull();
  });

  it("does not clear a source for a driver dragged from the pool", () => {
    expect(
      getPredictionMoveSource(
        { type: "pool-driver", driverId: "norris" },
        {
          type: "prediction-cell",
          raceId: "hungarian-2026",
          session: "grandPrix",
          index: 1,
          editable: true,
        },
      ),
    ).toBeNull();
  });
});

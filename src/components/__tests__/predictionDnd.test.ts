import { describe, expect, it } from "vitest";
import type {
  Active,
  ClientRect,
  CollisionDetection,
  DroppableContainer,
  Over,
} from "@dnd-kit/core";

import { RACE_CLASSIFICATION_SIZE } from "../../constants/race";
import {
  createPredictionDragAnnouncements,
  getPredictionMoveSource,
  getPredictionRemovalSource,
  getPredictionDroppableId,
  getPredictionDraggableId,
  placeDriverAtPredictionPosition,
  predictionCollisionDetection,
  predictionScreenReaderInstructions,
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

describe("predictionCollisionDetection", () => {
  const nearRect: ClientRect = {
    top: 0,
    left: 0,
    width: 10,
    height: 10,
    bottom: 10,
    right: 10,
  };
  const farRect: ClientRect = {
    top: 100,
    left: 100,
    width: 10,
    height: 10,
    bottom: 110,
    right: 110,
  };
  const baseArgs = {
    active: {} as Active,
    collisionRect: nearRect,
    droppableContainers: [
      { id: "cell:near" },
      { id: "cell:far" },
    ] as unknown as DroppableContainer[],
    droppableRects: new Map([
      ["cell:near", nearRect],
      ["cell:far", farRect],
    ]) as unknown as Parameters<CollisionDetection>[0]["droppableRects"],
  };

  it("uses pointerWithin when pointer coordinates exist", () => {
    const collisions = predictionCollisionDetection({
      ...baseArgs,
      pointerCoordinates: { x: 105, y: 105 },
    });

    expect(collisions.map((collision) => collision.id)).toEqual(["cell:far"]);
  });

  it("falls back to closestCenter for keyboard drags without a pointer", () => {
    const collisions = predictionCollisionDetection({
      ...baseArgs,
      pointerCoordinates: null,
    });

    expect(collisions[0]?.id).toBe("cell:near");
  });
});

describe("predictionScreenReaderInstructions", () => {
  it("explains how to operate a draggable with the keyboard", () => {
    expect(predictionScreenReaderInstructions.draggable).toContain("Enter");
    expect(predictionScreenReaderInstructions.draggable).toContain("space");
    expect(predictionScreenReaderInstructions.draggable).toContain("Escape");
  });
});

describe("createPredictionDragAnnouncements", () => {
  const announcements = createPredictionDragAnnouncements({
    getDriverName: (driverId) =>
      driverId === "norris" ? "Lando Norris" : driverId,
    getEventName: (raceId, session) =>
      `${raceId}${session === "sprint" ? " Sprint" : ""}`,
  });
  const fakeActive = (data: unknown) =>
    ({ data: { current: data } }) as unknown as Active;
  const fakeOver = (data: unknown) =>
    ({ data: { current: data } }) as unknown as Over;
  const poolDrag = { type: "pool-driver", driverId: "norris" };
  const placedDrag = {
    type: "prediction-driver",
    driverId: "norris",
    raceId: "belgian-2026",
    session: "grandPrix",
    index: 0,
  };
  const targetCell = {
    type: "prediction-cell",
    raceId: "belgian-2026",
    session: "grandPrix",
    index: 2,
    editable: true,
  };

  it("announces picking up a driver from the pool", () => {
    expect(announcements.onDragStart({ active: fakeActive(poolDrag) })).toBe(
      "Picked up Lando Norris from the driver pool.",
    );
  });

  it("announces picking up a driver from a prediction position", () => {
    expect(announcements.onDragStart({ active: fakeActive(placedDrag) })).toBe(
      "Picked up Lando Norris from belgian-2026, position 1.",
    );
  });

  it("announces the position the driver is hovering over", () => {
    expect(
      announcements.onDragOver?.({
        active: fakeActive(poolDrag),
        over: fakeOver(targetCell),
      }),
    ).toBe("Lando Norris is over belgian-2026, position 3.");
  });

  it("announces when the driver is not over a position", () => {
    expect(
      announcements.onDragOver?.({ active: fakeActive(poolDrag), over: null }),
    ).toBe("Lando Norris is not over a prediction position.");
  });

  it("announces a successful drop", () => {
    expect(
      announcements.onDragEnd({
        active: fakeActive(poolDrag),
        over: fakeOver(targetCell),
      }),
    ).toBe("Lando Norris was dropped on belgian-2026, position 3.");
  });

  it("announces a drop outside any position", () => {
    expect(
      announcements.onDragEnd({ active: fakeActive(poolDrag), over: null }),
    ).toBe("Lando Norris was dropped outside a prediction position.");
  });

  it("announces a cancelled drag", () => {
    expect(
      announcements.onDragCancel({ active: fakeActive(poolDrag), over: null }),
    ).toBe("Dragging Lando Norris was cancelled.");
  });

  it("returns undefined for draggables without prediction data", () => {
    const unknown = fakeActive(undefined);
    expect(announcements.onDragStart({ active: unknown })).toBeUndefined();
    expect(
      announcements.onDragEnd({ active: unknown, over: null }),
    ).toBeUndefined();
    expect(
      announcements.onDragCancel({ active: unknown, over: null }),
    ).toBeUndefined();
  });
});

import type {
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";

import type { PredictionSessionType } from "../types/race";

export type { PredictionSessionType };

export type PredictionDragData =
  | {
      type: "pool-driver";
      driverId: string;
    }
  | {
      type: "prediction-driver";
      driverId: string;
      raceId: string;
      session: PredictionSessionType;
      index: number;
    };

export type PredictionDropData = {
  type: "prediction-cell";
  session: PredictionSessionType;
  raceId: string;
  index: number;
  editable: boolean;
};

export function getPredictionDragPayload(event: DragEndEvent) {
  return {
    active: event.active.data.current as PredictionDragData | undefined,
    over: event.over?.data.current as PredictionDropData | undefined,
  };
}

export function getPredictionDragStartPayload(event: DragStartEvent) {
  return (event.active.data.current as PredictionDragData | undefined) ?? null;
}

export function getPredictionRemovalSource(
  active: PredictionDragData | undefined,
  over: PredictionDropData | undefined,
): Pick<
  Extract<PredictionDragData, { type: "prediction-driver" }>,
  "raceId" | "session" | "index"
> | null {
  if (active?.type !== "prediction-driver" || (over && over.editable)) {
    return null;
  }

  return {
    raceId: active.raceId,
    session: active.session,
    index: active.index,
  };
}

export function placeDriverAtPredictionPosition(
  currentOrder: string[] | null,
  driverId: string,
  targetIndex: number,
) {
  const nextOrder = currentOrder ? currentOrder.slice() : [];
  const existingIndex = nextOrder.indexOf(driverId);

  if (existingIndex === targetIndex) return nextOrder;

  if (existingIndex >= 0) delete nextOrder[existingIndex];
  nextOrder[targetIndex] = driverId;
  trimEmptyTrailingPositions(nextOrder);

  return nextOrder;
}

function trimEmptyTrailingPositions(order: string[]) {
  while (order.length > 0 && order[order.length - 1] === undefined) {
    order.length -= 1;
  }
}

/**
 * Build a unique droppable id for a prediction cell.
 *
 * Grand Prix and Sprint sessions for the same race share the same race id, so
 * the session must be part of the id to avoid collisions that break DnD on
 * sprint weekends.
 */
export function getPredictionDroppableId(
  raceId: string,
  session: PredictionSessionType,
  positionIndex: number,
): string {
  return `cell:${raceId}:${session}:${positionIndex}`;
}

/**
 * Build a unique draggable id for a predicted driver inside a cell.
 *
 * The same driver can be predicted in both the GP and the Sprint of the same
 * race, so the session must be included to keep draggable ids unique.
 */
export function getPredictionDraggableId(
  raceId: string,
  session: PredictionSessionType,
  driverId: string,
): string {
  return `pick:${raceId}:${session}:${driverId}`;
}

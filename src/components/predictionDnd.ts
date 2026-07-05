import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

export type PredictionDragData =
  | {
      type: "pool-driver";
      driverId: string;
    }
  | {
      type: "prediction-driver";
      driverId: string;
      raceId: string;
      index: number;
    };

export type PredictionDropData = {
  type: "prediction-cell";
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

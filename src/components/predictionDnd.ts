import {
  closestCenter,
  pointerWithin,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
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

type PredictionSource = Pick<
  Extract<PredictionDragData, { type: "prediction-driver" }>,
  "raceId" | "session" | "index"
>;

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
): PredictionSource | null {
  if (active?.type !== "prediction-driver" || (over && over.editable)) {
    return null;
  }

  return {
    raceId: active.raceId,
    session: active.session,
    index: active.index,
  };
}

export function getPredictionMoveSource(
  active: PredictionDragData,
  over: PredictionDropData,
): PredictionSource | null {
  if (
    active.type !== "prediction-driver" ||
    (active.raceId === over.raceId && active.session === over.session)
  ) {
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

/**
 * Collision detection for mixed pointer/keyboard dragging.
 *
 * `pointerWithin` only works when the drag has pointer coordinates, so
 * keyboard drags (which have none) fall back to `closestCenter`. Pointer
 * behaviour is unchanged.
 */
export const predictionCollisionDetection: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);

export const predictionScreenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "To pick up a driver, press Enter or space. While dragging, use the arrow keys to move the driver over a prediction position. Press Enter or space to drop the driver, or press Escape to cancel.",
};

type PredictionDragLabels = {
  getDriverName: (driverId: string) => string;
  getEventName: (raceId: string, session: PredictionSessionType) => string;
};

/**
 * Build screen reader announcements for prediction drags, using human
 * readable driver and event names instead of dnd-kit's raw id announcements.
 */
export function createPredictionDragAnnouncements({
  getDriverName,
  getEventName,
}: PredictionDragLabels): Announcements {
  const describeTarget = (over: PredictionDropData | undefined) =>
    over
      ? `${getEventName(over.raceId, over.session)}, position ${over.index + 1}`
      : undefined;

  return {
    onDragStart({ active }) {
      const data = active.data.current as PredictionDragData | undefined;
      if (!data) return undefined;
      const driverName = getDriverName(data.driverId);
      if (data.type === "prediction-driver") {
        return `Picked up ${driverName} from ${getEventName(data.raceId, data.session)}, position ${data.index + 1}.`;
      }
      return `Picked up ${driverName} from the driver pool.`;
    },
    onDragOver({ active, over }) {
      const data = active.data.current as PredictionDragData | undefined;
      if (!data) return undefined;
      const driverName = getDriverName(data.driverId);
      const target = describeTarget(
        over?.data.current as PredictionDropData | undefined,
      );
      return target
        ? `${driverName} is over ${target}.`
        : `${driverName} is not over a prediction position.`;
    },
    onDragEnd({ active, over }) {
      const data = active.data.current as PredictionDragData | undefined;
      if (!data) return undefined;
      const driverName = getDriverName(data.driverId);
      const target = describeTarget(
        over?.data.current as PredictionDropData | undefined,
      );
      return target
        ? `${driverName} was dropped on ${target}.`
        : `${driverName} was dropped outside a prediction position.`;
    },
    onDragCancel({ active }) {
      const data = active.data.current as PredictionDragData | undefined;
      if (!data) return undefined;
      return `Dragging ${getDriverName(data.driverId)} was cancelled.`;
    },
  };
}

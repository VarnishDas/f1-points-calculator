import { useDraggable, useDroppable } from "@dnd-kit/core";

import type { Driver } from "../types/driver";
import type { PredictionSessionType } from "../types/race";
import type { Team } from "../types/team";
import { DriverCellTile, StaticDriverCellTile } from "./DriverTile";
import {
  getPredictionDroppableId,
  getPredictionDraggableId,
} from "./predictionDnd";

type PredictionCellProps = {
  raceId: string;
  raceName: string;
  session: PredictionSessionType;
  positionIndex: number;
  driver?: Driver;
  team?: Team;
  editable: boolean;
};

export default function PredictionCell({
  raceId,
  raceName,
  session,
  positionIndex,
  driver,
  team,
  editable,
}: PredictionCellProps) {
  const eventName = session === "sprint" ? `${raceName} Sprint` : raceName;
  const positionName = `position ${positionIndex + 1}`;
  const { setNodeRef, isOver } = useDroppable({
    id: getPredictionDroppableId(raceId, session, positionIndex),
    disabled: !editable,
    data: {
      type: "prediction-cell",
      session,
      raceId,
      index: positionIndex,
      editable,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={
        isOver
          ? "grid h-11 place-items-center rounded border border-amber-400/70 bg-amber-400/10 lg:h-8"
          : editable
            ? "grid h-11 place-items-center rounded border border-dashed border-white/15 bg-black/20 lg:h-8"
            : "grid h-11 place-items-center rounded border border-white/[0.06] bg-white/[0.025] lg:h-8"
      }
      aria-label={
        driver
          ? `${driver.firstName} ${driver.lastName}, ${eventName}, ${positionName}`
          : editable
            ? `Empty ${eventName} ${positionName}`
            : `${eventName} ${positionName} result`
      }
    >
      {driver ? (
        editable ? (
          <DraggableCellDriver
            raceId={raceId}
            session={session}
            positionIndex={positionIndex}
            driver={driver}
            team={team}
          />
        ) : (
          <StaticCellDriver driver={driver} team={team} />
        )
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
      )}
    </div>
  );
}

type CellDriverProps = {
  raceId: string;
  session: PredictionSessionType;
  positionIndex: number;
  driver: Driver;
  team?: Team;
};

function DraggableCellDriver({
  raceId,
  session,
  positionIndex,
  driver,
  team,
}: CellDriverProps) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({
      id: getPredictionDraggableId(raceId, session, driver.id),
      data: {
        type: "prediction-driver",
        driverId: driver.id,
        raceId,
        session,
        index: positionIndex,
      },
    });

  return (
    <DriverCellTile
      ref={setNodeRef}
      driver={driver}
      team={team}
      isDragging={isDragging}
      aria-label={`Drag ${driver.firstName} ${driver.lastName}`}
      {...attributes}
      {...listeners}
      tabIndex={-1}
    />
  );
}

function StaticCellDriver({ driver, team }: Pick<CellDriverProps, "driver" | "team">) {
  return <StaticDriverCellTile driver={driver} team={team} />;
}

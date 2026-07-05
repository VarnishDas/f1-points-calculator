import { useDraggable, useDroppable } from "@dnd-kit/core";

import type { Driver } from "../types/driver";
import type { Team } from "../types/team";
import { DriverCellTile, StaticDriverCellTile } from "./DriverTile";

type PredictionCellProps = {
  raceId: string;
  positionIndex: number;
  driver?: Driver;
  team?: Team;
  editable: boolean;
};

export default function PredictionCell({
  raceId,
  positionIndex,
  driver,
  team,
  editable,
}: PredictionCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell:${raceId}:${positionIndex}`,
    disabled: !editable,
    data: {
      type: "prediction-cell",
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
          ? "grid h-9 place-items-center rounded border border-amber-400/70 bg-amber-400/10"
          : editable
            ? "grid h-9 place-items-center rounded border border-dashed border-white/15 bg-black/20"
            : "grid h-9 place-items-center rounded border border-white/[0.06] bg-white/[0.025]"
      }
    >
      {driver ? (
        editable ? (
          <DraggableCellDriver
            raceId={raceId}
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
  positionIndex: number;
  driver: Driver;
  team?: Team;
};

function DraggableCellDriver({
  raceId,
  positionIndex,
  driver,
  team,
}: CellDriverProps) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({
      id: `pick:${raceId}:${driver.id}`,
      data: {
        type: "prediction-driver",
        driverId: driver.id,
        raceId,
        index: positionIndex,
      },
    });

  return (
    <DriverCellTile
      ref={setNodeRef}
      driver={driver}
      team={team}
      isDragging={isDragging}
      {...attributes}
      {...listeners}
    />
  );
}

function StaticCellDriver({ driver, team }: Pick<CellDriverProps, "driver" | "team">) {
  return <StaticDriverCellTile driver={driver} team={team} />;
}

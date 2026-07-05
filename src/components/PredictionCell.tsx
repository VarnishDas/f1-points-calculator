import type { CSSProperties } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { Driver } from "../types/driver";
import type { Team } from "../types/team";

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
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `pick:${raceId}:${driver.id}`,
      data: {
        type: "prediction-driver",
        driverId: driver.id,
        raceId,
        index: positionIndex,
      },
    });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      className="h-full w-full touch-none select-none rounded border border-white/10 bg-white/[0.06] text-[11px] font-black tracking-[0.08em] shadow-sm transition hover:border-white/25 active:cursor-grabbing"
      style={{ ...style, color: team?.color ?? "#f5f5f5" }}
      {...attributes}
      {...listeners}
    >
      {driver.code}
    </button>
  );
}

function StaticCellDriver({ driver, team }: Pick<CellDriverProps, "driver" | "team">) {
  return (
    <span
      className="grid h-full w-full place-items-center rounded border border-white/[0.06] bg-white/[0.035] text-[11px] font-black tracking-[0.08em]"
      style={{ color: team?.color ?? "#f5f5f5" }}
    >
      {driver.code}
    </span>
  );
}

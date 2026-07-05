import type { CSSProperties } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { Driver } from "../types/driver";
import type { Team } from "../types/team";

type DriverTileProps = {
  driver: Driver;
  team?: Team;
};

export default function DriverTile({ driver, team }: DriverTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `pool:${driver.id}`,
      data: {
        type: "pool-driver",
        driverId: driver.id,
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
      style={style}
      className="relative min-h-14 min-w-28 touch-none select-none overflow-hidden rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-left shadow-sm transition hover:border-white/20 hover:bg-white/[0.07] active:cursor-grabbing sm:min-w-32"
      {...attributes}
      {...listeners}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-2 left-2 w-1 rounded-full"
        style={{ backgroundColor: team?.color ?? "#737373" }}
      />
      <span className="block pl-3 text-sm font-black tracking-[0.15em] text-white">
        {driver.code}
      </span>
      <span className="mt-1 block truncate pl-3 text-[11px] font-semibold text-neutral-400">
        {team?.name ?? driver.teamId}
      </span>
    </button>
  );
}

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { useDraggable } from "@dnd-kit/core";

import type { Driver } from "../types/driver";
import type { Team } from "../types/team";

type DriverTileProps = {
  driver: Driver;
  team?: Team;
};

export default function DriverTile({ driver, team }: DriverTileProps) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({
      id: `pool:${driver.id}`,
      data: {
        type: "pool-driver",
        driverId: driver.id,
      },
    });

  return (
    <DriverTileSurface
      ref={setNodeRef}
      driver={driver}
      team={team}
      isDragging={isDragging}
      {...attributes}
      {...listeners}
    />
  );
}

type DriverTileSurfaceProps = {
  driver: Driver;
  team?: Team;
  isDragging?: boolean;
};

export function DriverTilePreview({ driver, team }: DriverTileProps) {
  return <DriverTileSurface driver={driver} team={team} isOverlay />;
}

type DriverTileButtonProps = DriverTileSurfaceProps & {
  isOverlay?: boolean;
};

const DriverTileSurface = forwardRef<
  HTMLButtonElement,
  DriverTileButtonProps & ComponentPropsWithoutRef<"button">
>(function DriverTileSurface(
  { driver, team, isDragging = false, isOverlay = false, ...buttonProps },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={
        isOverlay
          ? "relative min-h-14 min-w-32 select-none overflow-hidden rounded-md border border-amber-400/50 bg-neutral-900 px-3 py-2 text-left shadow-2xl shadow-black/40 ring-1 ring-amber-400/30"
          : "relative min-h-14 min-w-28 touch-none select-none overflow-hidden rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-left shadow-sm transition hover:border-white/20 hover:bg-white/[0.07] active:cursor-grabbing sm:min-w-32"
      }
      style={{ opacity: isDragging ? 0.65 : 1 }}
      {...buttonProps}
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
});

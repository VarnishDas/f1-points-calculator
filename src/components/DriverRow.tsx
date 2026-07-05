import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { Driver } from "../types/driver";
import type { Team } from "../types/team";

type DriverRowProps = {
  driverId: string;
  position: number;
  driver?: Driver;
  team?: Team;
  points: number;
  /** When false the row is locked (completed races). When true it is draggable. */
  draggable: boolean;
};

export default function DriverRow(props: DriverRowProps) {
  return props.draggable ? <SortableRow {...props} /> : <StaticRow {...props} />;
}

type SortableApi = ReturnType<typeof useSortable>;

type RowContentProps = {
  driverId: string;
  position: number;
  driver?: Driver;
  team?: Team;
  points: number;
  draggable: boolean;
  attributes?: SortableApi["attributes"];
  listeners?: SortableApi["listeners"];
};

function RowContent({
  driverId,
  position,
  driver,
  team,
  points,
  draggable,
  attributes,
  listeners,
}: RowContentProps) {
  return (
    <>
      <td className="w-9 py-2 pl-4 pr-1 text-right tabular-nums text-neutral-400 sm:py-1.5">
        {position}
      </td>
      <td className="py-2 pr-2 sm:py-1.5">
        <div className="flex items-center gap-2">
          {draggable && (
            <button
              type="button"
              aria-label="Drag to reorder"
              className="flex h-6 w-4 shrink-0 cursor-grab touch-none select-none items-center justify-center text-neutral-500 hover:text-neutral-300 active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <span aria-hidden="true" className="leading-none">⋮⋮</span>
            </button>
          )}
          {team && (
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: team.color }}
            />
          )}
          <span className="truncate text-white">
            {driver ? `${driver.firstName} ${driver.lastName}` : driverId}
          </span>
        </div>
      </td>
      <td className="hidden py-2 pr-2 text-neutral-500 tabular-nums sm:table-cell sm:py-1.5">
        {driver?.code ?? "—"}
      </td>
      <td className="hidden py-2 pr-2 text-neutral-500 sm:table-cell sm:py-1.5">
        {team?.name ?? "—"}
      </td>
      <td className="w-12 py-2 pl-2 pr-4 text-right tabular-nums text-neutral-300 sm:py-1.5">
        {points > 0 ? points : "—"}
      </td>
    </>
  );
}

function StaticRow({ driverId, position, driver, team, points }: DriverRowProps) {
  return (
    <tr className="border-b border-neutral-800/40 last:border-b-0">
      <RowContent
        driverId={driverId}
        position={position}
        driver={driver}
        team={team}
        points={points}
        draggable={false}
      />
    </tr>
  );
}

function SortableRow({ driverId, position, driver, team, points }: DriverRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: driverId,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? "border-b border-neutral-800/40 last:border-b-0 bg-neutral-800/80 shadow-lg ring-1 ring-neutral-700"
          : "border-b border-neutral-800/40 last:border-b-0"
      }
    >
      <RowContent
        driverId={driverId}
        position={position}
        driver={driver}
        team={team}
        points={points}
        draggable
        attributes={attributes}
        listeners={listeners}
      />
    </tr>
  );
}

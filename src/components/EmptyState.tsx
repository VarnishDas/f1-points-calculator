import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
};

export default function EmptyState({
  title,
  description,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
      <span
        aria-hidden="true"
        className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-neutral-500"
      >
        {icon ?? <DefaultFlagIcon />}
      </span>
      <p className="text-xs font-black uppercase tracking-[0.12em] text-neutral-300">
        {title}
      </p>
      {description ? (
        <p className="max-w-xs text-[11px] leading-relaxed text-neutral-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function DefaultFlagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-5 w-5"
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 21V4m0 1.5c2-1.5 4-1.5 6 0s4 1.5 6 0V12c-2 1.5-4 1.5-6 0s-4-1.5-6 0"
      />
    </svg>
  );
}

import { useEffect, useRef, useState } from "react";

import { useCalculatorStore } from "../store/useCalculatorStore";
import { encodeScenarioHash } from "../utils/encodeScenario";

type AppHeaderProps = {
  onReset: () => void;
};

export default function AppHeader({ onReset }: AppHeaderProps) {
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetStatusTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetStatusTimerRef.current !== null) {
        window.clearTimeout(resetStatusTimerRef.current);
      }
    },
    [],
  );

  const handleShare = async () => {
    const { races } = useCalculatorStore.getState();
    const hash = encodeScenarioHash(races);
    const base = window.location.pathname + window.location.search;
    if (base + hash !== base + window.location.hash) {
      window.history.replaceState(null, "", base + hash);
    }

    const url = window.location.href;
    let copied: boolean;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      copied = copyToClipboardFallback(url);
    }

    setShareStatus(copied ? "copied" : "failed");
    if (resetStatusTimerRef.current !== null) {
      window.clearTimeout(resetStatusTimerRef.current);
    }
    resetStatusTimerRef.current = window.setTimeout(
      () => setShareStatus("idle"),
      1500,
    );
  };

  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-white/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between lg:px-4">
      <div className="min-w-0">
        <h1 className="text-base font-black tracking-tight text-white sm:text-lg">
          Formula 1 Points Calculator
        </h1>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          Drag drivers to simulate the championship
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          aria-label="Reset all predictions"
          className="inline-flex h-10 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.07] sm:h-8"
        >
          <span aria-hidden="true" className="text-base leading-none">
            ↺
          </span>
          Reset
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-red-600 px-3 text-xs font-bold text-white shadow-[0_0_22px_rgba(220,38,38,0.25)] transition hover:bg-red-500 sm:h-8"
          aria-label={
            shareStatus === "copied"
              ? "Scenario URL copied to clipboard"
              : shareStatus === "failed"
                ? "Could not copy scenario URL"
                : "Share scenario URL"
          }
        >
          <span aria-hidden="true" className="text-base leading-none">
            ⤴
          </span>
          {shareStatus === "copied"
            ? "Copied"
            : shareStatus === "failed"
              ? "Copy failed"
              : "Share"}
        </button>
        <span className="sr-only" role="status" aria-live="polite">
          {shareStatus === "copied"
            ? "Scenario URL copied to clipboard."
            : shareStatus === "failed"
              ? "Could not copy the scenario URL."
              : ""}
        </span>
      </div>
    </header>
  );
}

function copyToClipboardFallback(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  let copied: boolean;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}

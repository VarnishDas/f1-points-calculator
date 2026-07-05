import { useState } from "react";

import { useCalculatorStore } from "../store/useCalculatorStore";
import { encodeScenarioHash } from "../utils/encodeScenario";

type AppHeaderProps = {
  onReset: () => void;
};

export default function AppHeader({ onReset }: AppHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const { races } = useCalculatorStore.getState();
    const hash = encodeScenarioHash(races);
    const base = window.location.pathname + window.location.search;
    if (base + hash !== base + window.location.hash) {
      window.history.replaceState(null, "", base + hash);
    }

    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      copyToClipboardFallback(url);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
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
          aria-label={copied ? "Scenario URL copied to clipboard" : "Share scenario URL"}
        >
          <span aria-hidden="true" className="text-base leading-none">
            ⤴
          </span>
          {copied ? "Copied" : "Share"}
        </button>
      </div>
    </header>
  );
}

function copyToClipboardFallback(text: string): void {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } catch {
    // Clipboard unavailable; nothing more we can do safely.
  }
  document.body.removeChild(textarea);
}


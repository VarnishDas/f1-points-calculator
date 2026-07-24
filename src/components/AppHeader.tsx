import { useEffect, useRef, useState } from "react";

import { APP_SEASON } from "../config/season";
import { useCalculatorStore } from "../store/useCalculatorStore";
import {
  shareScenario,
  shareStatusMessage,
  type ShareStatus,
} from "../utils/shareScenario";

type AppHeaderProps = {
  onReset: () => void;
  leaderName?: string;
  leaderPoints?: number;
  leaderTeamColor?: string;
};

export default function AppHeader({
  onReset,
  leaderName,
  leaderPoints,
  leaderTeamColor,
}: AppHeaderProps) {
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const [shareMessage, setShareMessage] = useState("");
  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [lastShareUrl, setLastShareUrl] = useState<string | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const cancelResetButtonRef = useRef<HTMLButtonElement | null>(null);
  const shareUrlInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(
    () => () => {
      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isResetConfirmationOpen) return;

    cancelResetButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsResetConfirmationOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isResetConfirmationOpen]);

  useEffect(() => {
    if (!isShareSheetOpen) return;
    shareUrlInputRef.current?.select();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsShareSheetOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isShareSheetOpen]);

  const flashStatus = (status: ShareStatus, message: string) => {
    setShareStatus(status);
    setShareMessage(message);
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = window.setTimeout(() => {
      setShareStatus("idle");
      setShareMessage("");
    }, 2800);
  };

  const handleShare = async () => {
    const { races } = useCalculatorStore.getState();
    const result = await shareScenario(races);
    flashStatus(result.status, shareStatusMessage(result));

    if (result.url && (result.status === "copied" || result.status === "shared")) {
      setLastShareUrl(result.url);
    }

    // Open the link sheet when clipboard is the path (desktop / no native share)
    // so the user can see and re-copy the URL. Native share already presents UI.
    if (result.status === "copied" && result.url) {
      setIsShareSheetOpen(true);
    }
  };

  const handleCopyFromSheet = async () => {
    if (!lastShareUrl) return;
    try {
      await navigator.clipboard.writeText(lastShareUrl);
      flashStatus("copied", "Prediction link copied.");
    } catch {
      flashStatus("failed", "Could not copy the scenario link.");
    }
  };

  const confirmReset = () => {
    onReset();
    setIsResetConfirmationOpen(false);
  };

  const shareButtonLabel =
    shareStatus === "copied"
      ? "Copied"
      : shareStatus === "shared"
        ? "Shared"
        : shareStatus === "empty"
          ? "Nothing to share"
          : shareStatus === "failed"
            ? "Copy failed"
            : shareStatus === "cancelled"
              ? "Share"
              : "Share";

  const shareAriaLabel =
    shareStatus === "copied"
      ? "Scenario URL copied to clipboard"
      : shareStatus === "shared"
        ? "Scenario shared"
        : shareStatus === "empty"
          ? "Add a prediction before sharing"
          : shareStatus === "failed"
            ? "Could not share scenario URL"
            : "Share scenario URL";

  const toastTone =
    shareStatus === "copied" || shareStatus === "shared"
      ? "success"
      : shareStatus === "empty" || shareStatus === "cancelled"
        ? "neutral"
        : "error";

  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-neutral-950/60 px-3 py-2.5 backdrop-blur-md lg:px-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-black tracking-tight text-white sm:text-lg">
              Formula 1 Points Calculator
            </h1>
            <span className="hidden shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-300 sm:inline">
              {APP_SEASON}
            </span>
          </div>
          <p className="mt-0.5 hidden truncate text-xs text-neutral-500 md:block">
            Drag drivers to simulate the championship
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {leaderName && leaderPoints !== undefined ? (
            <div
              className="hidden max-w-[11rem] items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1.5 pr-2.5 sm:flex"
              title={`Projected leader: ${leaderName}, ${leaderPoints} points`}
            >
              <span
                aria-hidden="true"
                className="grid h-6 w-6 place-items-center rounded-full bg-amber-400/15 text-[9px] font-black text-amber-300 ring-1 ring-amber-400/30"
              >
                P1
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-2 w-0.5 shrink-0 rounded-full"
                    style={{ backgroundColor: leaderTeamColor ?? "#737373" }}
                  />
                  <span className="truncate text-[11px] font-black text-neutral-100">
                    {leaderName}
                  </span>
                </span>
                <span className="block pl-2 text-[10px] font-bold tabular-nums text-amber-400/90">
                  {leaderPoints} pts
                </span>
              </span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setIsResetConfirmationOpen(true)}
            aria-label="Reset all predictions"
            className="inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:h-9 sm:w-auto sm:px-3"
          >
            <span aria-hidden="true" className="text-base leading-none">
              ↺
            </span>
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-md bg-red-600 text-xs font-bold text-white shadow-[0_0_22px_rgba(220,38,38,0.25)] transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:h-9 sm:w-auto sm:px-3"
            aria-label={shareAriaLabel}
          >
            <span aria-hidden="true" className="text-base leading-none">
              ⤴
            </span>
            <span className="hidden sm:inline">{shareButtonLabel}</span>
          </button>
          <span className="sr-only" role="status" aria-live="polite">
            {shareMessage}
          </span>
        </div>
      </header>

      {shareStatus !== "idle" && shareMessage ? (
        <div
          role="status"
          className={
            toastTone === "success"
              ? "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex min-h-11 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-emerald-400/25 bg-emerald-950/95 px-4 text-sm font-bold text-emerald-200 shadow-2xl shadow-black/50"
              : toastTone === "neutral"
                ? "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex min-h-11 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-neutral-900/95 px-4 text-sm font-bold text-neutral-100 shadow-2xl shadow-black/50"
                : "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex min-h-11 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-red-400/25 bg-red-950/95 px-4 text-sm font-bold text-red-200 shadow-2xl shadow-black/50"
          }
        >
          <span aria-hidden="true" className="text-base">
            {toastTone === "success" ? "✓" : toastTone === "neutral" ? "·" : "!"}
          </span>
          {shareMessage}
        </div>
      ) : null}

      {isShareSheetOpen && lastShareUrl ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-amber-400"
            onClick={() => setIsShareSheetOpen(false)}
            aria-label="Close share dialog"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-sheet-title"
            aria-describedby="share-sheet-description"
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-neutral-950 p-5 shadow-2xl shadow-black"
          >
            <h2
              id="share-sheet-title"
              className="text-base font-black text-white"
            >
              Share your scenario
            </h2>
            <p
              id="share-sheet-description"
              className="mt-1 text-sm leading-relaxed text-neutral-400"
            >
              Anyone with this link opens the same predictions on top of the
              latest official results.
            </p>
            <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Link
              <input
                ref={shareUrlInputRef}
                type="text"
                readOnly
                value={lastShareUrl}
                className="mt-1.5 h-11 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsShareSheetOpen(false)}
                className="h-11 rounded-md border border-white/10 bg-white/[0.04] text-sm font-bold text-neutral-200 transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                Done
              </button>
              <button
                type="button"
                onClick={handleCopyFromSheet}
                className="h-11 rounded-md bg-red-600 text-sm font-black text-white shadow-[0_0_22px_rgba(220,38,38,0.2)] transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                Copy link
              </button>
            </div>
          </div>
        </>
      ) : null}

      {isResetConfirmationOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-amber-400"
            onClick={() => setIsResetConfirmationOpen(false)}
            aria-label="Cancel reset"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-confirmation-title"
            aria-describedby="reset-confirmation-description"
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-neutral-950 p-5 shadow-2xl shadow-black"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-red-500/25 bg-red-500/10 text-xl text-red-300"
              >
                ↺
              </span>
              <div>
                <h2
                  id="reset-confirmation-title"
                  className="text-base font-black text-white"
                >
                  Reset all predictions?
                </h2>
                <p
                  id="reset-confirmation-description"
                  className="mt-1 text-sm leading-relaxed text-neutral-400"
                >
                  This clears every Grand Prix and Sprint prediction. This action
                  cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                ref={cancelResetButtonRef}
                type="button"
                onClick={() => setIsResetConfirmationOpen(false)}
                className="h-11 rounded-md border border-white/10 bg-white/[0.04] text-sm font-bold text-neutral-200 transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReset}
                className="h-11 rounded-md bg-red-600 text-sm font-black text-white shadow-[0_0_22px_rgba(220,38,38,0.2)] transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                Reset predictions
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

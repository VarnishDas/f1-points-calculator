import { useEffect, useRef } from "react";

import { useCalculatorStore } from "../store/useCalculatorStore";
import { decodeScenarioFromHash } from "../utils/decodeScenario";
import { encodeScenarioHash } from "../utils/encodeScenario";

/**
 * Keeps `window.location.hash` in sync with the current prediction scenario
 * and hydrates the store from a shared URL on initial load.
 *
 * Behaviour:
 *   - On mount, decode the current hash and apply valid predictions to the
 *     store once (hydration). A guard prevents double-apply under React
 *     strict mode.
 *   - After hydration, subscribe to the store and rewrite the hash (via
 *     `history.replaceState` to avoid history spam) whenever predictions
 *     change. The hash is cleared when there are no predictions.
 *   - A `ready` guard ensures the subscription never overwrites the hash with
 *     empty/default state before the decoded scenario has been applied.
 *
 * The hook is side-effect only and does not subscribe the calling component
 * to store state, so it will not trigger re-renders.
 */
export function useShareableUrl(): void {
  const hydratedRef = useRef(false);
  const readyRef = useRef(false);
  const lastHashRef = useRef<string>("");

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const { races, drivers, applyScenario } = useCalculatorStore.getState();
    const decoded = decodeScenarioFromHash(window.location.hash, { races, drivers });
    if (decoded) {
      applyScenario(decoded);
    }

    // Canonicalize the URL once to match the now-current state: this clears
    // malformed/unsupported hashes and trims unknown ids that were filtered
    // out during decode. Uses replaceState so no history entry is added.
    const normalized = encodeScenarioHash(useCalculatorStore.getState().races);
    lastHashRef.current = normalized;
    if (normalized !== window.location.hash) {
      const url = window.location.pathname + window.location.search + normalized;
      window.history.replaceState(null, "", url);
    }

    readyRef.current = true;
  }, []);

  useEffect(() => {
    const writeHash = (races: ReturnType<typeof useCalculatorStore.getState>["races"]) => {
      if (!readyRef.current) return;
      const nextHash = encodeScenarioHash(races);
      if (nextHash === lastHashRef.current) return;
      lastHashRef.current = nextHash;
      const url = window.location.pathname + window.location.search + nextHash;
      window.history.replaceState(null, "", url);
    };

    const unsubscribe = useCalculatorStore.subscribe((state) => {
      writeHash(state.races);
    });
    return unsubscribe;
  }, []);
}

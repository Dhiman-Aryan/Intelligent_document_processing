import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * True only after the client has hydrated. Used to defer rendering of
 * anything that depends on browser-only state (theme, localStorage)
 * so the server-rendered HTML and the first client render always
 * match. Implemented with useSyncExternalStore instead of a
 * useState+useEffect "mounted" flag, since setting state directly
 * inside an effect body is flagged by react-hooks/set-state-in-effect.
 */
export function useHasMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

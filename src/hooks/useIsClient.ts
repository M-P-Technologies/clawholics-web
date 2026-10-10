import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False during the server render and hydration, true after. Use it for output that can
// only be built in the browser, so the first client render matches the server HTML.
export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

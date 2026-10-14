import { useEffect, useState } from "react";

/** `value`, once it has stopped changing for `delayMs`: for a search box that asks the server, so
 *  a request goes out when typing pauses rather than on every key */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}

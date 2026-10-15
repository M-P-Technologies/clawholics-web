"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Fills an editor's form from a query's data: once it arrives, and again when a newer copy comes
 * from the server, but never while the form has unsaved changes (that would overwrite them).
 * Returns `filledWith(data)`, for a copy the form already shows (e.g. what was just saved), so it
 * isn't filled from it again.
 */
export function useFillForm<T>(data: T | undefined, dirty: boolean, fill: (data: T) => void) {
  const filled = useRef<T | undefined>(undefined);

  useEffect(() => {
    if (data === undefined || data === filled.current || (dirty && filled.current !== undefined)) return;
    filled.current = data;
    fill(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fill only sets the form's state
  }, [data, dirty]);

  return useCallback((shown: T) => {
    filled.current = shown;
  }, []);
}

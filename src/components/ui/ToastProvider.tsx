"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import clsx from "clsx";
import Button from "./Button";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastApi {
  /** Shows a short message that goes away on its own. Say what happened, and what happens next. */
  show: (kind: ToastKind, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const COLORS = { success: "text-success", error: "text-danger", info: "text-crimson" };
// Errors stay longer, since they usually need an action
const DURATION_MS = { success: 6000, info: 6000, error: 10000 };

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = nextId++;
      setToasts((all) => [...all.slice(-2), { id, kind, title, message }]);
      setTimeout(() => dismiss(id), DURATION_MS[kind]);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[200] flex flex-col items-end gap-2 sm:left-auto sm:right-4 sm:w-96"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className="drawer-panel pointer-events-auto flex w-full items-start gap-4 rounded-sm border border-crimson-light bg-light-orange p-4 shadow-xl shadow-crimson/20"
            >
              <Icon size={24} aria-hidden="true" className={clsx("shrink-0", COLORS[t.kind])} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-sm font-bold text-gray-red">{t.title}</p>
                {t.message && <p className="text-sm leading-relaxed text-gray-red/80">{t.message}</p>}
              </div>
              <Button
                variant="bare"
                type="button"
                aria-label="Dismiss message"
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-gray-red transition-colors hover:text-crimson"
              >
                <X size={16} aria-hidden="true" />
              </Button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  // Outside a provider (for example in a unit test) the messages are simply dropped
  return ctx ?? { show: () => {} };
}

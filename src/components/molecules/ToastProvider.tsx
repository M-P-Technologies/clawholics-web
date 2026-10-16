"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import clsx from "clsx";
import { Button } from "@/components/atoms";

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
// Each kind's icon sits in a soft circle of its colour (like the cards' icons), and a thin stripe
// of the same colour runs down the toast's left edge
const COLORS = { success: "bg-success/15 text-success-ink", error: "bg-danger/10 text-danger-ink", info: "bg-crimson-light/40 text-berry" };
const STRIPES = { success: "border-l-success", error: "border-l-danger", info: "border-l-crimson" };
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
        className="pointer-events-none fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-200 lg:bottom-4 flex flex-col items-end gap-3 sm:left-auto sm:right-4 sm:w-96"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className={clsx(
                "drawer-panel pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-l-4 border-crimson-light/40 bg-milk p-3 shadow-petal",
                STRIPES[t.kind],
              )}
            >
              <span aria-hidden="true" className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", COLORS[t.kind])}>
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-sm font-bold text-gray-red">{t.title}</p>
                {t.message && <p className="copy-note">{t.message}</p>}
              </div>
              <Button
                variant="bare"
                type="button"
                aria-label="Dismiss message"
                onClick={() => dismiss(t.id)}
                className="shrink-0 self-start rounded-full p-1.5 text-gray-red transition-colors hover:bg-crimson-light/40 hover:text-gray-red"
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

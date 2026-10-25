import type { ChangeEvent } from "react";
import clsx from "clsx";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/atoms";
import { SectionHeader } from "@/components/molecules";
import { field as fieldTokens } from "@/components/tokens";

type Field = {
  id: string;
  name: string;
  label: string;
  type: "text";
  autoComplete: string;
  maxLength: number;
  placeholder?: string;
  value: string;
  status: "idle" | "saving" | "saved" | "error";
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
};

// Each handle's brand icon, and the "@" an Instagram name starts with
const LOOK: Record<string, { Icon: typeof InstagramIcon; prefix?: string }> = {
  instagram_handle: { Icon: InstagramIcon, prefix: "@" },
  facebook_handle: { Icon: FacebookIcon },
};

// Instagram/Facebook for a client whose profile has neither yet (useContactHandles saves them)
export default function ContactHandlesFields({ fields }: { fields: Field[] }) {
  if (fields.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <SectionHeader size="label" title="How can we reach you?" />
        <p className="text-sm text-gray-red">Add your socials so the salon can message you about your visit. They&apos;re saved to your profile as you type.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map(({ status, label, ...input }) => {
          const { Icon, prefix } = LOOK[input.name] ?? LOOK.facebook_handle;
          const errorId = `${input.id}-error`;
          return (
            <div key={input.id} className="flex flex-col gap-1.5">
              <label htmlFor={input.id} className={clsx(fieldTokens.label, "flex items-center justify-between")}>
                {label}
                <span className="text-xs font-normal text-gray-red">Optional</span>
              </label>
              <div
                className={clsx(
                  "flex items-center gap-2 rounded-xl border bg-milk px-2 py-1.5 transition-[border-color,box-shadow]",
                  "focus-within:ring-2",
                  status === "error"
                    ? "border-danger focus-within:ring-danger/30"
                    : "border-crimson-light focus-within:border-crimson focus-within:ring-crimson/30",
                )}
              >
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-crimson-light/30 text-crimson-ink">
                  <Icon className="size-4" />
                </span>
                {prefix && <span aria-hidden="true" className="-mr-1.5 text-base text-gray-red">{prefix}</span>}
                <input
                  {...input}
                  aria-invalid={status === "error" ? true : undefined}
                  aria-describedby={status === "error" ? errorId : undefined}
                  className="min-w-0 flex-1 bg-transparent py-1 text-base text-gray-red outline-none placeholder:text-gray-red/50 sm:text-sm"
                />
                {/* The save, at a glance; read out once it's done */}
                <span aria-live="polite" className="flex size-6 shrink-0 items-center justify-center">
                  {status === "saving" && <Loader2 aria-label="Saving" className="size-4 animate-spin text-gray-red" />}
                  {status === "saved" && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-success/25 text-success-ink" title="Saved to your profile">
                      <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                      <span className="sr-only">Saved to your profile</span>
                    </span>
                  )}
                  {status === "error" && <AlertCircle aria-hidden="true" className="size-4 text-danger-ink" />}
                </span>
              </div>
              {status === "error" && (
                <p id={errorId} className="text-xs text-danger-ink">
                  We couldn&apos;t save this. Check your connection, then click outside the field to try again.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import type { ComponentType, ReactNode } from "react";
import clsx from "clsx";
import { Avatar } from "@/components/atoms";
import { surface } from "../tokens";

export interface ProfileRow {
  label: string;
  value: string | null | undefined;
  icon?: ComponentType<{ className?: string }>;
}

export interface ProfilePanelProps {
  /** Names the panel for screen readers, e.g. "Client profile" */
  label: string;
  name: string;
  imageUrl?: string;
  /** Small labels under the name, e.g. <Badge>Client</Badge> */
  badges?: ReactNode;
  /** The highlighted box (the next visit): its title, icon, the big line and a detail, or `empty` when there is nothing */
  highlight?: { title: string; icon?: ComponentType<{ className?: string; size?: number }>; value?: string; detail?: string; empty: string };
  /** The heading over the rows, e.g. "Client info" */
  rowsTitle: string;
  /** Rows with no value are left out */
  rows: ProfileRow[];
  /** Actions under the rows, e.g. Edit details */
  children?: ReactNode;
  className?: string;
}

// A person's panel (the admin's client page, the client's own profile): who they are, a highlighted
// box such as their next visit, their details, and actions.
export default function ProfilePanel({ label, name, imageUrl, badges, highlight, rowsTitle, rows, children, className }: ProfilePanelProps) {
  const HighlightIcon = highlight?.icon;
  return (
    <aside aria-label={label} className={clsx("flex min-w-0 flex-col gap-5 p-5", surface.card, className)}>
      <div className="flex items-center gap-3">
        <Avatar name={name} imageUrl={imageUrl} size="xl" decorative />
        <div className="min-w-0">
          <h2 className="break-words font-display text-2xl font-normal leading-tight text-gray-red">{name}</h2>
          {badges && <div className="mt-1 flex flex-wrap gap-1.5">{badges}</div>}
        </div>
      </div>

      {highlight && (
        <div className="flex flex-col gap-1 rounded-xl border border-crimson-light/60 bg-light-orange/40 p-4">
          <p className="flex items-center justify-between text-[12px] text-gray-red/70">
            {highlight.title}
            {HighlightIcon && <HighlightIcon size={14} aria-hidden="true" className="text-berry" />}
          </p>
          {highlight.value ? (
            <>
              <p className="font-display text-xl text-berry">{highlight.value}</p>
              {highlight.detail && <p className="text-[13px] text-gray-red/80">{highlight.detail}</p>}
            </>
          ) : (
            <p className="text-[13px] text-gray-red/70">{highlight.empty}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-crimson-light/50 pt-4">
        <h3 className="font-display text-lg font-normal text-gray-red">{rowsTitle}</h3>
        <dl className="flex flex-col gap-3">
          {rows
            .filter((row) => row.value)
            .map(({ label: rowLabel, value, icon: Icon }) => (
              <div key={rowLabel} className="flex flex-col gap-0.5">
                <dt className="text-[12px] text-gray-red/70">{rowLabel}</dt>
                <dd className="flex min-w-0 items-center gap-2 text-sm font-medium text-gray-red">
                  {Icon && <Icon className="h-4 w-4 shrink-0 text-berry" />}
                  <span className="min-w-0 break-words">{value}</span>
                </dd>
              </div>
            ))}
        </dl>
      </div>

      {children && <div className="flex flex-col gap-2 border-t border-crimson-light/50 pt-4">{children}</div>}
    </aside>
  );
}

import type { ComponentType, ReactNode } from "react";
import clsx from "clsx";
import { Avatar } from "@/components/atoms";
import { surface } from "../tokens";

export interface ProfileRow {
  label: string;
  value: string | null | undefined;
  icon?: ComponentType<{ className?: string }>;
  /** Makes the value a link: tel:, sms: and mailto: open the phone's own apps, a web address a new tab */
  href?: string | null;
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
  /** Extra classes for the actions' row, e.g. `max-lg:hidden` when they're drawn elsewhere on phones */
  actionsClassName?: string;
  className?: string;
}

// A person's panel (the admin's client page, the client's own profile): who they are, a highlighted
// box such as their next visit, their details, and actions.
export default function ProfilePanel({ label, name, imageUrl, badges, highlight, rowsTitle, rows, children, actionsClassName, className }: ProfilePanelProps) {
  const HighlightIcon = highlight?.icon;
  return (
    <aside aria-label={label} className={clsx("flex min-w-0 flex-col gap-6 p-6", surface.card, className)}>
      {/* The photo and the name are one row on a phone (the badges wrap under the name); in the narrow
          panel beside the table from `lg` they wrap onto two lines. A badge longer than the panel is cut
          off at its edge rather than running past it */}
      <div className="flex min-w-0 items-center gap-3 lg:flex-wrap">
        <Avatar name={name} imageUrl={imageUrl} size="xl" decorative />
        <div className="min-w-0 max-w-full flex-1 overflow-hidden lg:flex-none">
          <h2 className="wrap-break-word font-display text-2xl font-normal leading-tight text-gray-red">{name}</h2>
          {badges && <div className="mt-1 flex min-w-0 flex-wrap gap-1.5 overflow-hidden [&>*]:max-w-full [&>*]:overflow-hidden">{badges}</div>}
        </div>
      </div>

      {highlight && (
        <div className="flex flex-col gap-1 rounded-xl border border-crimson-light/60 bg-light-orange/40 p-3">
          <p className="flex items-center justify-between text-xs text-gray-red">
            {highlight.title}
            {HighlightIcon && <HighlightIcon size={16} aria-hidden="true" className="text-berry" />}
          </p>
          {highlight.value ? (
            <>
              <p className="font-display text-xl text-berry">{highlight.value}</p>
              {highlight.detail && <p className="text-[13px] text-gray-red">{highlight.detail}</p>}
            </>
          ) : (
            <p className="text-[13px] text-gray-red">{highlight.empty}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-crimson-light/50 pt-3">
        <h3 className="font-display text-lg font-normal text-gray-red">{rowsTitle}</h3>
        <dl className="flex flex-col gap-3">
          {rows
            .filter((row) => row.value)
            .map(({ label: rowLabel, value, icon: Icon, href }) => (
              <div key={rowLabel} className="flex flex-col gap-0.5">
                <dt className="text-xs text-gray-red">{rowLabel}</dt>
                <dd className="flex min-w-0 items-center gap-3 text-sm font-medium text-gray-red">
                  {Icon && <Icon className="h-4 w-4 shrink-0 text-berry" />}
                  {href ? (
                    <a
                      href={href}
                      {...(/^https?:/i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="min-w-0 wrap-break-word underline decoration-crimson-light underline-offset-4 hover:text-berry"
                    >
                      {value}
                      {/^https?:/i.test(href) && <span className="sr-only"> (opens in a new tab)</span>}
                    </a>
                  ) : (
                    <span className="min-w-0 wrap-break-word">{value}</span>
                  )}
                </dd>
              </div>
            ))}
        </dl>
      </div>

      {children && <div className={clsx("flex flex-col gap-3 border-t border-crimson-light/50 pt-3", actionsClassName)}>{children}</div>}
    </aside>
  );
}

import {
  ArrowRight,
  Mail as EmailIcon,
  Phone as TelephoneIcon,
} from "lucide-react";
import clsx from "clsx";
import { Link } from "@/lib/router";
import type { DirectoryUser } from "@/services/directoryService";
import { parseServerTime } from "@/services/serverTime";
import { Avatar, Button } from "@/components/atoms";

export type { DirectoryUser };

/** From Clerk (GET /directory/profiles): the photo they uploaded, when they joined, their last sign-in */
export interface DirectoryProfile {
  imageUrl: string | null;
  joinedAt: string | null;
  lastSignInAt: string | null;
}

const DAY = 24 * 60 * 60 * 1000;

// Shared with the directory table
export const nameOf = (user: DirectoryUser) =>
  (
    user.fullName ||
    user.name ||
    `${user.firstName} ${user.lastName}`.trim() ||
    "Unnamed client"
  )
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export function roleOf(role?: string) {
  const normalized = role?.trim().toLowerCase();
  if (!normalized || normalized === "customer" || normalized === "client")
    return "Client";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function monthYear(value?: string | null) {
  const time = value ? Date.parse(value) : NaN;
  return Number.isNaN(time)
    ? ""
    : new Date(time).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
}

// "today", "yesterday", "3 days ago", or a date after a month
export function relativeDay(value?: string | null) {
  const time = value ? Date.parse(value) : NaN;
  if (Number.isNaN(time)) return "";
  const days = Math.floor((Date.now() - time) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortDate(value?: string | null) {
  const time = parseServerTime(value);
  return Number.isNaN(time)
    ? ""
    : new Date(time).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

interface Props {
  user: DirectoryUser;
  profile?: DirectoryProfile;
  /** The client's page, for a client with an account */
  clientHref?: string;
  onEdit?: (user: DirectoryUser) => void;
  onDelete?: (user: DirectoryUser) => void;
  onNotes?: (user: DirectoryUser) => void;
}

// The selected person in the Admin or Client Directory: their photo in a square frame, name and
// role, three numbers (a client's visits, or an admin's role, with when they joined and were last
// active), how to reach them, and what can be done (client page, notes, edit, delete).
export default function DirectoryProfileCard({
  user,
  profile,
  clientHref,
  onEdit,
  onDelete,
  onNotes,
}: Props) {
  const name = nameOf(user);
  const role = roleOf(user.role);
  const isAdmin = role === "Admin";
  const stats = [
    ...(isAdmin
      ? []
      : [
          {
            label: "Visits",
            value:
              typeof user.visit_count === "number"
                ? String(user.visit_count)
                : "",
          },
        ]),
    { label: "Joined", value: monthYear(profile?.joinedAt) },
    { label: "Last active", value: relativeDay(profile?.lastSignInAt) },
    ...(isAdmin ? [{ label: "Role", value: role }] : []),
  ];
  const lastVisit = shortDate(user.last_visit);
  const phones = [user.phoneNumber, user.altPhone].filter((p): p is string =>
    Boolean(p && p.trim()),
  );
  const hasContact = Boolean(user.email) || phones.length > 0;

  return (
    <section
      aria-label={name}
      className="flex min-w-0 flex-col overflow-clip rounded-2xl border border-crimson-light/40 bg-milk text-center shadow-petal lg:h-full"
    >
      {/* The banner the round photo sits on. On desktop it takes the room the card has left, so the
          card matches the table's height beside it */}
      <div
        data-testid="banner"
        aria-hidden="true"
        className="h-24 shrink-0 bg-linear-to-br from-berry via-crimson to-crimson-light lg:min-h-20 lg:flex-1"
      />

      <div className="flex w-full flex-col items-center gap-3 px-6 pb-6">
        <div className="-mt-12">
          <Avatar name={name} imageUrl={profile?.imageUrl ?? ""} size="hero" decorative={!profile?.imageUrl} />
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <h2 className="font-display text-2xl font-normal leading-tight text-gray-red">
            {name}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span
              className={clsx(
                "rounded-full px-3 py-0.5 text-xs font-bold",
                isAdmin
                  ? "bg-berry text-pearl"
                  : "bg-crimson-light/50 text-berry",
              )}
            >
              {role}
            </span>
            {user.is_recurring && (
              <span className="rounded-full bg-sand px-3 py-0.5 text-xs font-bold text-gray-red">
                Recurring
              </span>
            )}
          </div>
        </div>

        {/* Three numbers, like the reference card's Projects / Tasks / Position */}
        <ul
          aria-label="At a glance"
          className="grid w-full grid-cols-3 divide-x divide-crimson-light/60 rounded-xl bg-crimson-light/15 py-3"
        >
          {stats.map((s) => (
            <li
              key={s.label}
              className="flex min-w-0 flex-col items-center gap-0.5 px-1"
            >
              <span className="text-xs text-gray-red">{s.label}</span>
              <span className="max-w-full truncate font-display text-lg leading-tight text-berry">
                {s.value || "–"}
              </span>
            </li>
          ))}
        </ul>

        <ul
          aria-label="Contact"
          className="flex w-full flex-col gap-3 text-left"
        >
          {user.email && (
            <li className="flex min-w-0 items-center gap-3">
              <EmailIcon
                size={18}
                aria-hidden="true"
                className="shrink-0 text-crimson"
              />
              <a
                href={`mailto:${user.email}`}
                className="min-w-0 truncate text-sm text-gray-red decoration-crimson-light underline-offset-4 hover:underline"
              >
                {user.email}
              </a>
            </li>
          )}
          {phones.map((phone) => (
            <li key={phone} className="flex min-w-0 items-center gap-3">
              <TelephoneIcon
                size={18}
                aria-hidden="true"
                className="shrink-0 text-crimson"
              />
              <a
                href={`tel:${phone}`}
                className="min-w-0 truncate text-sm text-gray-red decoration-crimson-light underline-offset-4 hover:underline"
              >
                {phone}
              </a>
            </li>
          ))}
          {!hasContact && (
            <li className="text-[13px] text-gray-red">
              No contact details yet.
            </li>
          )}
        </ul>

        {(user.preferredContactMethod || lastVisit) && (
          <div className="flex w-full flex-wrap gap-1.5">
            {user.preferredContactMethod && (
              <span className="rounded-full border border-crimson-light px-3 py-0.5 text-xs font-medium text-gray-red">
                Prefers {user.preferredContactMethod}
              </span>
            )}
            {lastVisit && (
              <span className="rounded-full border border-crimson-light px-3 py-0.5 text-xs font-medium text-gray-red">
                Last visit: {lastVisit}
              </span>
            )}
          </div>
        )}

        {clientHref && (
          <Link
            to={clientHref}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-crimson-light/60 px-3 py-3 text-sm font-bold text-berry transition-colors hover:bg-crimson-light/20"
          >
            View client page
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}

        {(onNotes || onEdit || onDelete) && (
          <div className="flex w-full flex-wrap justify-center gap-3 border-t border-dotted border-crimson-light pt-3">
            {onNotes && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => onNotes(user)}
                className="px-3! py-1.5!"
              >
                Notes
              </Button>
            )}
            {onEdit && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => onEdit(user)}
                className="px-3! py-1.5!"
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => onDelete(user)}
                className="border-danger! px-3! py-1.5! text-danger-ink! hover:bg-danger! hover:text-pearl!"
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

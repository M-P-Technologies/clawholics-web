import { useEffect, useState } from "react";
import clsx from "clsx";
import { useTableLayout } from "../../hooks/useMinWidth";
import TablePager, { paginate } from "./dashboard/TablePager";
import { CardFields, RowCard, RowCards } from "./RowCards";
import { initialsOf } from "@/components/atoms";
import { monthYear, nameOf, relativeDay, roleOf, type DirectoryProfile, type DirectoryUser } from "./DirectoryProfileCard";

const ROWS = 5;

interface Props {
  /** The table's name, e.g. "Clients" */
  label: string;
  users: DirectoryUser[];
  /** Clerk details by Clerk id, for the photos and dates */
  profiles: Record<string, DirectoryProfile>;
  selectedId: string | null;
  onSelect: (user: DirectoryUser) => void;
  /** A Visits column, for clients; admins get a Role column instead */
  showVisits?: boolean;
}

// The people in a directory, five to a page: photo, name and email, phone, joined, last active, and
// visits (or role). A row selects that person for the profile card beside the table. On a phone
// each person is a card, five to a page.
export default function DirectoryTable({ label, users, profiles, selectedId, onSelect, showVisits = false }: Props) {
  const [page, setPage] = useState(1);
  // A new search or list starts again on the first page
  useEffect(() => setPage(1), [users]);
  const view = paginate(users, page, ROWS); // five to a page keeps the table beside the profile card short
  // The same rows as the appointments table: dotted lines, round photos, no row pill
  const cell = "border-t border-dotted border-crimson-light py-3 pr-3";
  const asTable = useTableLayout();

  const photo = (user: DirectoryUser, name: string) => {
    const profile = profiles[user.clerk_id ?? user.id];
    return profile?.imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- Clerk's image host
      <img src={profile.imageUrl} alt={name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
    ) : (
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crimson-light/50 font-display text-sm text-berry">
        {initialsOf(name)}
      </span>
    );
  };
  const roleBadge = (user: DirectoryUser) => (
    <span className="rounded-full bg-crimson-light/50 px-2.5 py-0.5 text-[11px] font-bold text-berry">{roleOf(user.role)}</span>
  );

  if (!asTable) {
    return (
      <section aria-label={`${label} list`} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-crimson-light/40 bg-milk p-4 shadow-petal">
        <RowCards label={label}>
          {view.rows.map((user) => {
            const name = nameOf(user);
            const profile = profiles[user.clerk_id ?? user.id];
            const selected = user.id === selectedId;
            return (
              <RowCard key={user.id} selected={selected} className="p-0">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(user)}
                  className="flex flex-col gap-3 rounded-xl p-4 text-left focus-visible:outline-2 focus-visible:outline-crimson"
                >
                  <span className="flex items-center gap-3">
                    {photo(user, name)}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{name}</span>
                      {user.email && <span className="block truncate text-[12px] text-gray-red/70">{user.email}</span>}
                    </span>
                    {!showVisits && roleBadge(user)}
                  </span>
                  <CardFields
                    fields={[
                      ["Phone", user.phoneNumber || "–"],
                      ["Joined", monthYear(profile?.joinedAt) || "–"],
                      ["Last active", relativeDay(profile?.lastSignInAt) || "–"],
                      ...(showVisits ? [["Visits", typeof user.visit_count === "number" ? user.visit_count : "–"] as [string, string | number]] : []),
                    ]}
                  />
                </button>
              </RowCard>
            );
          })}
        </RowCards>
        <TablePager view={view} onPage={setPage} />
      </section>
    );
  }

  return (
    <section aria-label={`${label} list`} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-crimson-light/40 bg-milk p-5 shadow-petal lg:h-full">
      {/* Grows with the card beside it, keeping the pager at the bottom */}
      <div className="-mx-5 flex-1 overflow-x-auto px-5">
        <table aria-label={label} className="w-full min-w-[640px] border-separate border-spacing-0 text-sm text-gray-red">
          <thead>
            <tr className="text-left text-[12px] text-gray-red/70">
              {["Name", "Phone", "Joined", "Last active", showVisits ? "Visits" : "Role"].map((h) => (
                <th key={h} scope="col" className={clsx("pb-2 pr-3 font-medium", h === "Visits" && "text-right")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.rows.map((user) => {
              const name = nameOf(user);
              const profile = profiles[user.clerk_id ?? user.id];
              const selected = user.id === selectedId;
              return (
                <tr
                  key={user.id}
                  aria-selected={selected}
                  onClick={() => onSelect(user)}
                  className={clsx("cursor-pointer transition-colors", selected ? "bg-crimson-light/20" : "hover:bg-crimson-light/10")}
                >
                  <th scope="row" className={clsx(cell, "pl-2 text-left font-normal")}>
                    <span className="flex items-center gap-3">
                      {photo(user, name)}
                      <span className="min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(user);
                          }}
                          className="block max-w-full truncate text-left font-bold text-gray-red hover:text-berry focus-visible:outline-2 focus-visible:outline-crimson"
                        >
                          {name}
                        </button>
                        {user.email && <span className="block truncate text-[12px] text-gray-red/70">{user.email}</span>}
                      </span>
                    </span>
                  </th>
                  <td className={clsx(cell, "whitespace-nowrap")}>{user.phoneNumber || "–"}</td>
                  <td className={clsx(cell, "whitespace-nowrap")}>{monthYear(profile?.joinedAt) || "–"}</td>
                  <td className={clsx(cell, "whitespace-nowrap")}>{relativeDay(profile?.lastSignInAt) || "–"}</td>
                  <td className={clsx(cell, showVisits && "text-right font-bold")}>
                    {showVisits ? (typeof user.visit_count === "number" ? user.visit_count : "–") : roleBadge(user)}
                  </td>
                </tr>
              );
            })}
            {/* A short last page keeps room for five rows, so the table, the pager and the profile card
                beside it keep their height from page to page */}
            {view.pages > 1 &&
              Array.from({ length: ROWS - view.rows.length }, (_, i) => (
                <tr key={`filler-${i}`} data-filler aria-hidden="true">
                  <td colSpan={5} className="border-t border-dotted border-transparent py-3">
                    <span className="block h-9" />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <TablePager view={view} onPage={setPage} />
    </section>
  );
}

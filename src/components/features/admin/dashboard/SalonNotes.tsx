import { Check, Lightbulb, Trophy, TriangleAlert, type LucideIcon } from "lucide-react";
import Bow from "@/assets/bow.svg";
import { Link } from "@/lib/router";
import { buildInsights, type Insight, type Tip } from "@/lib/dashboardInsights";
import type { DashboardResponse } from "@/services/dashboardTypes";
import { PERIOD_LABELS } from "@/components/features/admin/dashboard/PeriodSwitch";

// Each group has an icon and a heading as well as a color, so the meaning never rests on color alone
const TONES = {
  success: { dot: "bg-success", icon: "bg-success/20 text-gray-red" },
  danger: { dot: "bg-danger", icon: "bg-danger/15 text-danger-ink" },
  crimson: { dot: "bg-crimson", icon: "bg-crimson/20 text-berry" },
} as const;

interface GroupProps {
  title: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  items: (Insight | Tip)[];
}

function Group({ title, icon: Icon, tone, items }: GroupProps) {
  const style = TONES[tone];
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.icon}`}>
          <Icon size={14} />
        </span>
        <h3 className="font-display text-base font-normal leading-none text-gray-red">{title}</h3>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const tip = item as Tip;
          return (
            <li key={item.id} className="flex items-start gap-3 text-sm leading-snug text-gray-red">
              <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
              <span className="min-w-0">
                {item.text}
                {tip.to && tip.cta && (
                  <Link to={tip.to} className="mt-1 block font-bold text-berry underline decoration-crimson-light underline-offset-4">
                    {tip.cta}
                  </Link>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// The words on the dashboard, kept apart from the figures: what needs doing now, then what went
// well, what to watch and what to try. Empty groups are left out, and nothing the stat cards
// already say is repeated here. Rules, not a model: see lib/dashboardInsights.ts.
export default function SalonNotes({ data }: { data: DashboardResponse }) {
  const insights = buildInsights(data, { repeatKpis: false });
  const todos = [
    { label: "Today's appointments", count: data.attention.today, to: "/schedule" },
    { label: "Bookings to confirm", count: data.attention.toConfirm, to: "/clients?status=AWAITING_CONFIRMATION" },
    { label: "Proofs to review", count: data.attention.proofsToReview, to: "/clients?status=PROOF_PENDING" },
    { label: "Pending payments", count: data.attention.unpaid, to: "/clients?status=PENDING" },
    { label: "Warm leads", count: data.attention.warmLeads, to: "/clients?view=leads" },
  ].filter((todo) => todo.count > 0);

  // Waiting payment proofs are already a row under Needs attention, with its own link
  const notTodo = <T extends Insight>(items: T[]) => items.filter((item) => item.id !== "proofs");
  const groups = [
    { title: "Wins", icon: Trophy, tone: "success" as const, items: insights.wins },
    { title: "Watch-outs", icon: TriangleAlert, tone: "danger" as const, items: notTodo(insights.watch) },
    { title: "Try this", icon: Lightbulb, tone: "crimson" as const, items: notTodo(insights.tips) },
  ].filter((group) => group.items.length > 0);

  const message =
    insights.status !== "normal"
      ? insights.headline
      : groups.length === 0
        ? "Nothing new beyond the numbers above."
        : null;

  return (
    <section aria-label="Salon notes" className="relative flex shrink-0 flex-col overflow-hidden rounded-2xl border border-crimson-light/60 bg-milk shadow-petal">
      {/* The top part, in the pink gradient: the title and what needs doing now */}
      <div className="relative flex flex-col gap-6 bg-linear-to-br from-crimson-light via-light-orange to-crimson-light/60 p-6">
        {/* The brand bow, tied once in the corner (decoration only) */}
        <div aria-hidden="true" className="bow-pop pointer-events-none absolute right-4 top-3">
          <Bow className="h-12 w-10 rotate-12 text-crimson drop-shadow-[0_4px_6px_rgb(184_58_98/0.25)]" />
        </div>

        <header className="pr-12">
          <h2 className="font-display text-2xl font-normal leading-tight text-gray-red lg:text-xl xl:text-2xl">Salon notes</h2>
          <p className="text-sm text-gray-red">{PERIOD_LABELS[data.range]}</p>
        </header>

        <section aria-label="Needs attention" className="flex flex-col gap-3">
          <h3 className="text-[13px] font-medium text-gray-red">Needs attention</h3>
          {todos.length === 0 ? (
            <p className="flex items-center gap-3 text-sm text-gray-red">
              <Check size={16} aria-hidden="true" className="shrink-0 text-success-ink" />
              All caught up.
            </p>
          ) : (
            todos.map((todo) => (
              <Link
                key={todo.label}
                to={todo.to}
                className="flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl bg-milk/70 py-1.5 pl-1.5 pr-3 transition-colors hover:bg-milk"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-milk font-display text-base leading-none text-berry shadow-petal">
                  {todo.count}
                </span>
                <span className="min-w-0 truncate text-sm font-bold leading-snug text-gray-red">{todo.label}</span>
              </Link>
            ))
          )}
        </section>
      </div>

      {/* The insights, on plain milk */}
      <div className="flex flex-col gap-6 p-6">
        {message && <p className="text-sm text-gray-red">{message}</p>}
        {insights.status === "no-data" && (
          <p className="-mt-3 text-xs text-gray-red">Insights appear once there are a few bookings to compare.</p>
        )}

        {groups.map((group) => (
          <Group key={group.title} title={group.title} icon={group.icon} tone={group.tone} items={group.items} />
        ))}
      </div>
    </section>
  );
}

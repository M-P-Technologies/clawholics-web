import { parseServerTime } from "../../services/serverTime";
import type { AttentionResponse, AttentionTab } from "../../services/dashboardTypes";

// The dashboard's queue of what to act on: each kind's words, colour and action, and where it leads

/** The most rows the queue is sent; the dashboard shows as many as fit beside the notes (5 when stacked) */
export const ATTENTION_MOST = 15;
export const ATTENTION_ROWS = 5;

type Item = AttentionResponse["items"][number];
type Kind = Item["kind"];

export const ATTENTION_TABS: { value: AttentionTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "confirm", label: "To confirm" },
  { value: "complete", label: "To complete" },
  { value: "leads", label: "Leads" },
];

const KINDS: Record<Kind, { need: string; tone: string; action: string; list: string; actionName: (name: string) => string }> = {
  confirm: { need: "Confirm booking", tone: "bg-warning/15 text-warning-ink", action: "Confirm", list: "/clients?status=AWAITING_CONFIRMATION", actionName: (n) => `Confirm ${n}'s booking` },
  review: { need: "Review screenshot", tone: "bg-warning/15 text-warning-ink", action: "Review", list: "/clients?status=PROOF_PENDING", actionName: (n) => `Review ${n}'s screenshot` },
  complete: { need: "Complete visit", tone: "bg-crimson-light/50 text-berry", action: "Complete", list: "/clients?status=TO_COMPLETE", actionName: (n) => `Complete ${n}'s visit` },
  photos: { need: "Add photo", tone: "bg-info/15 text-gray-red", action: "Add photo", list: "/clients?status=PHOTOS_TO_ADD", actionName: (n) => `Add a photo for ${n}'s visit` },
  lead: { need: "Follow up", tone: "bg-sand text-gray-red", action: "Open", list: "/clients?view=leads", actionName: (n) => `Open ${n}` },
};

export const attentionKind = (kind: Kind) => KINDS[kind];

/** Where the row's action leads: the client's page, or for the walk-in guest (who has none) the list it's in */
export const attentionLink = (item: Item) => (item.user_id ? `/clients/${item.user_id}` : KINDS[item.kind].list);

/** A tab's whole list and how many are in it; none for All, which mixes kinds */
export function attentionViewAll(tab: AttentionTab, counts: AttentionResponse["counts"]): { to: string; count: number } | null {
  if (tab === "confirm") return { to: KINDS.confirm.list, count: counts.confirm + counts.review };
  if (tab === "complete") return { to: KINDS.complete.list, count: counts.complete + counts.photos };
  if (tab === "leads") return { to: KINDS.lead.list, count: counts.leads };
  return null;
}

/** How long it has waited: "12 min", "3 h", "1 day", "4 days" */
export function waitingLabel(since: string, now = Date.now()): string {
  const time = parseServerTime(since);
  if (Number.isNaN(time)) return "";
  const minutes = Math.max(0, Math.floor((now - time) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}

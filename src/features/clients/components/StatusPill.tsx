import clsx from "clsx";
import { statusOf } from "../lib/clientPage";

// An appointment's status as a coloured pill
export default function StatusPill({ status, className }: { status: string; className?: string }) {
  const { label, className: colours } = statusOf(status);
  return <span className={clsx("rounded-full px-2.5 py-0.5 text-[12px] font-bold", colours, className)}>{label}</span>;
}

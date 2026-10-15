import { Link } from "@/lib/router";
import type { DashboardResponse } from "@/services/dashboardTypes";

const formatDay = (ymd: string) => {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

export default function NextAppointments({ items }: { items: DashboardResponse["next"] }) {
  if (items.length === 0) return <p className="text-sm text-gray-red">No upcoming confirmed appointments.</p>;
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 rounded-2xl bg-crimson-light/20 px-3 py-3">
            <span className="w-28 shrink-0 text-[13px] text-gray-red">
              <span className="block font-display text-base text-berry">{formatDay(item.appointment_date)}</span>
              {item.appointment_time}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold text-gray-red">{item.client_name}</span>
              <span className="block truncate text-[13px] text-gray-red">{item.service_name} · {item.nailist_name}</span>
            </span>
          </li>
        ))}
      </ul>
      <Link to="/schedule" className="self-start text-sm font-bold text-berry underline decoration-crimson-light underline-offset-4">
        Open the schedule
      </Link>
    </div>
  );
}

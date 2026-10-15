import type { Appointment, AppointmentPage, AppointmentPageParams } from "@/features/appointments/api/appointmentService";

// A stand-in for the paged admin list (GET /booking/appointments?page=…) in component tests: it
// filters, searches, sorts and pages a list of appointments the way the server does, so the
// tests can keep checking what the screens show. The SQL itself is tested against Postgres in
// tests/db/bookingPayments.test.ts (TC-BK-08c).

const upper = (value?: string | null) => (value ?? "").trim().toUpperCase();
const clientName = (a: Appointment) => `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim();

export function pageOf(all: Appointment[], params: AppointmentPageParams): AppointmentPage {
  const search = params.search?.trim().toLowerCase();
  const rows = all
    .filter((a) => !params.statuses?.length || params.statuses.includes(upper(a.status)))
    .filter((a) => !params.proofToReview || (upper(a.status) === "AWAITING_PROOF" && a.latest_proof?.status === "PENDING"))
    .filter((a) => !params.on || a.appointment_date === params.on)
    .filter((a) => !params.from || a.appointment_date >= params.from)
    .filter((a) => !params.artist || a.nailist_name === params.artist)
    .filter((a) => !search || [String(a.id), `#${a.id}`, clientName(a), a.email, a.service_name, a.nailist_name].some((v) => (v ?? "").toLowerCase().includes(search)))
    .sort((a, b) => {
      const start = (x: Appointment) => `${x.appointment_date} ${x.appointment_time}`;
      const booked = (x: Appointment) => x.created_at ?? "";
      switch (params.sort) {
        case "latest":
          return start(b).localeCompare(start(a)) || a.id - b.id;
        case "booked_newest":
          return booked(b).localeCompare(booked(a)) || b.id - a.id;
        case "booked_oldest":
          return booked(a).localeCompare(booked(b)) || a.id - b.id;
        default:
          return start(a).localeCompare(start(b)) || a.id - b.id;
      }
    });
  const visits = (userId: number) => all.filter((a) => a.user_id === userId && upper(a.status) === "COMPLETED").length;
  const start = (params.page - 1) * params.pageSize;
  return {
    rows: rows.slice(start, start + params.pageSize).map((a) => ({ client_visits: visits(a.user_id), ...a })),
    total: rows.length,
    page: params.page,
    pageSize: params.pageSize,
  };
}

/** A dashboard loader (useBookingsLoader's shape) over a function that returns every appointment */
export const paged = (load: () => Promise<Appointment[]>) => async (params: AppointmentPageParams) => pageOf(await load(), params);

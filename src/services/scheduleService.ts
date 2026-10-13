import { API_BASE_URL } from "../apiConfig";

const BASE_URL = `${API_BASE_URL}/booking/schedule`;

export interface ScheduleAppointment {
  id: number;
  user_id?: number | null;
  nailist_id: number;
  nailist_name: string;
  appointment_date: string;
  appointment_time: string;
  service_name: string;
  status: string;
  client_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface DayOff {
  nailist_id: number;
  day_off_type: "REGULAR" | "CUSTOM";
  day_of_week?: number | null;
  date?: string | null;
}

interface TimeSlot {
  nailist_id: number;
  start_time: string;
  end_time: string;
}

export interface NailArtist {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
}

export interface MonthlySchedule {
  appointments: ScheduleAppointment[];
  dayOffs: DayOff[];
  nailists: NailArtist[];
  timeSlots: TimeSlot[];
}

export const fetchMonthlySchedule = async (
  month: string,
  token?: string | null,
  clerkId?: string | null
): Promise<MonthlySchedule> => {
  const load = () =>
    fetch(`${BASE_URL}?month=${month}&t=${Date.now()}`, {
      headers: {
        "Content-Type": "application/json",
        "x-clawholics-origin": "frontend",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(clerkId ? { clerk_id: clerkId } : {}),
      },
    });
  let res = await load();
  // 503: the server gave up waiting for the database and has opened new connections by now,
  // so asking once more usually works
  if (res.status === 503) res = await load();

  if (!res.ok) {
    if (res.status === 403) window.location.href = "/";
    throw new Error("Failed to fetch monthly schedule");
  }

  return res.json();
};

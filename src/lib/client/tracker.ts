import { trackerSteps, type TrackInput, type TrackerStep } from "@/lib/bookingTracker";
import type { Appointment } from "@/utils/profile";

// The client's appointment as the tracker's input. The client gets no payment record or review
// time, so those stay empty, and a confirmed booking reads "Downpayment received".
export const clientTrackInput = (a: Appointment): TrackInput => ({
  status: a.status,
  service_name: a.service_name,
  nailist_name: a.nailist_name,
  appointment_date: a.appointment_date,
  appointment_time: a.appointment_time,
  booked_at: a.created_at ?? null,
  proof_status: a.latest_proof?.status ?? null,
  proof_sent_at: a.latest_proof?.created_at ?? null,
});

export const clientTrackerSteps = (a: Appointment): TrackerStep[] =>
  trackerSteps(clientTrackInput(a), { settledDetail: "Downpayment received" });

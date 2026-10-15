import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StepTracker } from "@/components/molecules";
import { trackerSteps, type TrackerStep } from "@/lib/bookingTracker";
import { clientTrackerSteps } from "@/lib/client/tracker";
import type { Appointment } from "@/utils/profile";

const steps: TrackerStep[] = [
  { key: "booked", title: "Booked", detail: "Oct 1", state: "done" },
  { key: "downpayment", title: "Downpayment", detail: "Waiting for the payment proof", state: "current" },
  { key: "confirmed", title: "Confirmed", detail: "", state: "upcoming" },
  { key: "completed", title: "Completed", detail: "", state: "upcoming" },
];

describe("StepTracker", () => {
  it("lists the steps in order, marks the current one and reads out each state", () => {
    render(<StepTracker label="Booking progress" steps={steps} />);
    const list = screen.getByRole("list", { name: "Booking progress" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).toHaveTextContent("Booked: done");
    expect(items[1]).toHaveTextContent("Downpayment: in progress");
    expect(items[2]).toHaveTextContent("Confirmed: not yet");
  });
});

const visit = { service_name: "Hard Gel", nailist_name: "Max", appointment_date: "2026-10-20", appointment_time: "9:00 AM" };

describe("tracker input", () => {
  it("takes only the fields it needs, and words a confirmed booking without a payment record as asked", () => {
    const s = trackerSteps({ ...visit, status: "CONFIRMED" }, { settledDetail: "Downpayment received" });
    expect(s.find((x) => x.key === "downpayment")).toMatchObject({ state: "done", detail: "Downpayment received" });
  });

  it("keeps the admin's wording by default", () => {
    const s = trackerSteps({ ...visit, status: "CONFIRMED" });
    expect(s.find((x) => x.key === "downpayment")?.detail).toBe("Settled with the salon");
  });

  it("maps a client's appointment: its proof waiting for review is the current step", () => {
    const appt = {
      id: 1, nailist_id: 2, ...visit, status: "AWAITING_PROOF", created_at: "2026-10-10 05:00:00",
      latest_proof: { id: 9, status: "PENDING", image_url: "x", created_at: "2026-10-11 02:00:00" },
    } as Appointment;
    const s = clientTrackerSteps(appt);
    expect(s.find((x) => x.key === "downpayment")).toMatchObject({ state: "current", detail: "Payment proof sent, waiting for review" });
    expect(s.find((x) => x.key === "booked")?.state).toBe("done");
  });
});

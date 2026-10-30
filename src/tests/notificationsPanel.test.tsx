import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotificationsPanel from "@/components/features/client/profile/NotificationsPanel";

const base = { waiting: [], loading: false, failed: false, leaving: false, onLeave: vi.fn(), rebookEmails: true, savingRebook: false, onRebookEmails: vi.fn() };
const day = { id: 3, service_id: 4, service_name: "Gel Manicure", nailist_id: null, nailist_name: null, appointment_date: "2026-11-05" };

describe("the Reminders tab", () => {
  it("lists the days being waited for and lets the client leave one", () => {
    const onLeave = vi.fn();
    render(<NotificationsPanel {...base} waiting={[day, { ...day, id: 4, nailist_id: 2, nailist_name: "Maxine" }]} onLeave={onLeave} />);
    expect(screen.getByText(/any available artist/)).toBeInTheDocument();
    expect(screen.getByText(/with Maxine/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /Stop waiting for Gel Manicure/ })[0]);
    expect(onLeave).toHaveBeenCalledWith(3);
  });

  it("says when nothing is being waited for", () => {
    render(<NotificationsPanel {...base} />);
    expect(screen.getByText(/not waiting for any day/)).toBeInTheDocument();
  });

  it("turns the rebooking emails back on", () => {
    const onRebookEmails = vi.fn();
    render(<NotificationsPanel {...base} rebookEmails={false} onRebookEmails={onRebookEmails} />);
    const box = screen.getByLabelText("Send me rebooking emails");
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(onRebookEmails).toHaveBeenCalledWith(true);
  });
});

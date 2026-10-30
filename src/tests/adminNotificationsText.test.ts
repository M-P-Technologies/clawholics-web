import { describe, expect, it } from "vitest";
import { notificationLink, notificationTitle } from "@/lib/admin/notifications";
import type { AdminNotification } from "@/services/notificationService";

const note = (over: Partial<AdminNotification>): AdminNotification => ({
  id: 1, kind: "visit_to_complete", appointment_id: 7, client_user_id: 3, client_name: "Ana Cruz", service_name: "Gel",
  nailist_name: "Maxine", appointment_date: "2026-10-21", appointment_time: "13:00-15:00", created_at: "2026-10-21 07:00:00", unread: true, ...over,
});

describe("the bell's visit to complete", () => {
  it("says a visit is waiting to be completed and opens the client's page", () => {
    expect(notificationTitle(note({}))).toBe("Visit to complete");
    expect(notificationLink(note({}))).toBe("/clients/3");
  });

  it("opens the list of visits to complete for a walk-in, who has no page", () => {
    expect(notificationLink(note({ client_user_id: null }))).toBe("/clients?status=TO_COMPLETE");
  });

  it("says a refund is waiting to be sent by hand and opens the client's page, or the list for a walk-in", () => {
    expect(notificationTitle(note({ kind: "refund_to_send" }))).toBe("Refund to send");
    expect(notificationLink(note({ kind: "refund_to_send" }))).toBe("/clients/3");
    expect(notificationLink(note({ kind: "refund_to_send", client_user_id: null }))).toBe("/clients");
  });

  it("keeps the other kinds' words and links", () => {
    expect(notificationTitle(note({ kind: "proof_uploaded" }))).toBe("Payment proof to review");
    expect(notificationTitle(note({ kind: "booking_paid" }))).toBe("New booking paid");
    expect(notificationLink(note({ kind: "booking_paid" }))).toBe("/clients/3");
    expect(notificationLink(note({ kind: "booking_paid", client_user_id: null }))).toBe("/clients?status=CONFIRMED");
  });
});

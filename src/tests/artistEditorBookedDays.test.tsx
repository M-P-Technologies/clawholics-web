import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ArtistEditor from "@/components/features/admin/catalog/ArtistEditor";

// Its own file: useDayOffs keeps the appointment list in a module-level cache for 30s,
// so the list must be the first one fetched in the module.

const now = new Date();
const dayKey = (day: number) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show: vi.fn() }) }));
vi.mock("@/services/nailistService", () => ({
  fetchNailistDayOffs: vi.fn().mockResolvedValue({ regularDays: [], customDates: [] }),
  fetchNailistServices: vi.fn().mockResolvedValue([1]),
  fetchNailistTimeSlots: vi.fn().mockResolvedValue(["08:00-10:00"]),
  fetchNailistGallery: vi.fn().mockResolvedValue([]),
  updateNailist: vi.fn(),
  updateNailistDayOffs: vi.fn(),
  updateNailistServices: vi.fn(),
  updateNailistTimeSlots: vi.fn(),
  deleteNailist: vi.fn(),
  createNailist: vi.fn(),
  addNailistGalleryImage: vi.fn(),
  deleteNailistGalleryImage: vi.fn(),
}));
vi.mock("@/services/serviceService", () => ({ fetchServices: vi.fn().mockResolvedValue([{ id: 1, name: "Gel Polish" }]) }));
vi.mock("@/services/appointmentService", () => ({
  ADMIN_APPOINTMENTS_KEY: ["admin", "appointments"],
  fetchAppointments: vi.fn().mockImplementation(async () => [
    { nailist_id: 7, status: "CONFIRMED", appointment_date: dayKey(14) },
    { nailist_id: 7, status: "Cancelled", appointment_date: dayKey(15) },
    { nailist_id: 7, status: "rejected", appointment_date: dayKey(16) },
    { nailist_id: 8, status: "CONFIRMED", appointment_date: dayKey(17) },
  ]),
}));
vi.mock("@/services/uploadService", () => ({
  PHOTO_UPLOAD_OPTIONS: { maxWidthOrHeight: 1600, maxSizeKB: 400 },
  uploadImage: vi.fn(),
}));

const artist = { id: 7, name: "Mara", position: "Master Technician", specialty: "Chrome", bio: "", image: "", service_ids: [1] };
const dayCell = (day: number) => screen.getByRole("button", { name: new RegExp(`\\b${day}(st|nd|rd|th)?,`) }).parentElement!;

describe("artist editor day off calendar", () => {
  it("marks only the artist's active bookings as booked", async () => {
    render(<ArtistEditor nailist={artist} tokenFetcher={vi.fn().mockResolvedValue("tok")} clerkId="clerk_1" onNailistUpdated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Mara/ }));
    await screen.findByText("08:00 AM");

    await waitFor(() => expect(dayCell(14)).toHaveClass("[&>button]:bg-danger/40!"));
    for (const day of [15, 16, 17]) {
      expect(dayCell(day)).not.toHaveClass("[&>button]:bg-danger/40!");
      expect(dayCell(day)).toHaveClass("[&>button]:bg-success/50!");
    }
  });
});

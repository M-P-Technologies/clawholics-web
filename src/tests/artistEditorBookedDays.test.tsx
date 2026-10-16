import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ArtistEditor from "@/components/features/admin/catalog/ArtistEditor";

// The booked days come from the artist's taken times for the month shown (/booking/slots-range),
// which the server already limits to that artist's bookings that hold their slot.

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
const fetchBookedSlotsRange = vi.fn().mockImplementation(async () => [
  { appointment_date: dayKey(14), appointment_time: "08:00-10:00" },
  { appointment_date: dayKey(14), appointment_time: "10:00-12:00" },
]);
vi.mock("@/services/bookingService", () => ({
  fetchBookedSlotsRange: (...args: unknown[]) => fetchBookedSlotsRange(...args),
  fetchBookedSlotsDetailed: vi.fn(),
  fetchNailists: vi.fn(),
}));
vi.mock("@/services/uploadService", () => ({
  PHOTO_UPLOAD_OPTIONS: { maxWidthOrHeight: 1600, maxSizeKB: 400 },
  uploadImage: vi.fn(),
}));

const artist = { id: 7, name: "Mara", position: "Master Technician", specialty: "Chrome", bio: "", image: "", service_ids: [1] };
const dayCell = (day: number) => screen.getByRole("button", { name: new RegExp(`\\b${day}(st|nd|rd|th)?,`) }).parentElement!;

describe("artist editor day off calendar", () => {
  it("marks the days the artist is booked in the month shown", async () => {
    render(<ArtistEditor nailist={artist} tokenFetcher={vi.fn().mockResolvedValue("tok")} clerkId="clerk_1" onNailistUpdated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Mara/ }));
    await screen.findByText("08:00 AM");

    await waitFor(() => expect(dayCell(14)).toHaveClass("[&>button]:bg-danger/40!"));
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    expect(fetchBookedSlotsRange).toHaveBeenCalledWith(7, dayKey(1), dayKey(lastDay));
    for (const day of [15, 16, 17]) {
      expect(dayCell(day)).not.toHaveClass("[&>button]:bg-danger/40!");
      expect(dayCell(day)).toHaveClass("[&>button]:bg-success/50!");
    }
  });
});

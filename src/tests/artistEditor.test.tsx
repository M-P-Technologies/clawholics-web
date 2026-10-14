import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NailArtistDropdown from "@/components/features/admin/catalog/NailArtistDropdown";

const show = vi.fn();
const nailist = {
  fetchNailistDayOffs: vi.fn(),
  fetchNailistServices: vi.fn(),
  fetchNailistTimeSlots: vi.fn(),
  updateNailist: vi.fn(),
  updateNailistDayOffs: vi.fn(),
  updateNailistServices: vi.fn(),
  updateNailistTimeSlots: vi.fn(),
  deleteNailist: vi.fn(),
  createNailist: vi.fn(),
};

vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show }) }));
vi.mock("@/services/nailistService", () => ({
  fetchNailistDayOffs: (...a: unknown[]) => nailist.fetchNailistDayOffs(...a),
  fetchNailistServices: (...a: unknown[]) => nailist.fetchNailistServices(...a),
  fetchNailistTimeSlots: (...a: unknown[]) => nailist.fetchNailistTimeSlots(...a),
  updateNailist: (...a: unknown[]) => nailist.updateNailist(...a),
  updateNailistDayOffs: (...a: unknown[]) => nailist.updateNailistDayOffs(...a),
  updateNailistServices: (...a: unknown[]) => nailist.updateNailistServices(...a),
  updateNailistTimeSlots: (...a: unknown[]) => nailist.updateNailistTimeSlots(...a),
  deleteNailist: (...a: unknown[]) => nailist.deleteNailist(...a),
  createNailist: (...a: unknown[]) => nailist.createNailist(...a),
  fetchNailistGallery: vi.fn().mockResolvedValue([]),
  addNailistGalleryImage: vi.fn(),
  deleteNailistGalleryImage: vi.fn(),
}));
vi.mock("@/services/serviceService", () => ({
  fetchServices: vi.fn().mockResolvedValue([
    { id: 1, name: "Gel Polish" },
    { id: 2, name: "Nail Art" },
  ]),
}));
vi.mock("@/services/appointmentService", () => ({ fetchAppointments: vi.fn().mockResolvedValue([]) }));
vi.mock("@/services/uploadService", () => ({
  PHOTO_UPLOAD_OPTIONS: { maxWidthOrHeight: 1600, maxSizeKB: 400 },
  uploadImage: vi.fn(),
}));

const artist = {
  id: 7,
  name: "Mara",
  position: "Master Technician",
  specialty: "Chrome",
  bio: "Ten years of nails",
  image: "https://img/nailists/mara.webp",
  service_ids: [1],
};
const tokenFetcher = vi.fn().mockResolvedValue("tok");

const renderArtist = async (onNailistUpdated = vi.fn()) => {
  render(<NailArtistDropdown nailist={artist} tokenFetcher={tokenFetcher} clerkId="clerk_1" onNailistUpdated={onNailistUpdated} />);
  fireEvent.click(screen.getByRole("button", { name: /Mara/ }));
  await screen.findByLabelText("Gel Polish");
  await screen.findByText("08:00 AM");
  await waitFor(() => expect(screen.getByLabelText("Wed")).toBeChecked());
  return onNailistUpdated;
};

const textbox = (label: string) => {
  const heading = screen.getByRole("heading", { name: label });
  return within(heading.parentElement!.parentElement!).getByRole("textbox") as HTMLTextAreaElement;
};

beforeEach(() => {
  vi.clearAllMocks();
  nailist.fetchNailistServices.mockResolvedValue([1]);
  nailist.fetchNailistDayOffs.mockResolvedValue({ regularDays: [3], customDates: [] });
  nailist.fetchNailistTimeSlots.mockResolvedValue(["08:00-10:00"]);
  nailist.updateNailist.mockImplementation(async (_id, name, position, specialty, bio, image) => ({ ...artist, name, position, specialty, bio, image }));
  nailist.updateNailistServices.mockImplementation(async (_id, ids) => ids);
  nailist.updateNailistDayOffs.mockImplementation(async (_id, d) => d);
  nailist.updateNailistTimeSlots.mockImplementation(async (_id, s) => s);
});

describe("artist editor", () => {
  it("shows the artist and every section", async () => {
    await renderArtist();
    expect(screen.getByText("Mara", { selector: "span" })).toBeInTheDocument();
    expect(textbox("Name")).toHaveValue("Mara");
    expect(textbox("Name")).toBeDisabled();
    expect(screen.getByText("Master Technician")).toBeInTheDocument();
    expect(textbox("Specialty")).toHaveValue("Chrome");
    expect(textbox("Bio")).toHaveValue("Ten years of nails");
    expect(screen.getByText("Services Offered")).toBeInTheDocument();
    expect(screen.getByLabelText("Gel Polish")).toBeChecked();
    expect(screen.getByLabelText("Nail Art")).not.toBeChecked();
    expect(screen.getByText("Day Off")).toBeInTheDocument();
    expect(screen.getByText("Time Slots")).toBeInTheDocument();
    expect(screen.getByText("08:00 AM")).toBeInTheDocument();
    expect(screen.getByText("10:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Photo")).toBeInTheDocument();
    expect(screen.getByText("mara.webp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("saves a new name and shows it", async () => {
    const onUpdated = await renderArtist();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(textbox("Name"), { target: { value: "Mara Lee" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(nailist.updateNailist).toHaveBeenCalledTimes(1));
    expect(nailist.updateNailist).toHaveBeenCalledWith(7, "Mara Lee", "Master Technician", "Chrome", "Ten years of nails", artist.image, "tok", "clerk_1");
    await screen.findByRole("button", { name: "Edit" });
    expect(textbox("Name")).toHaveValue("Mara Lee");
    expect(screen.getByRole("button", { name: /Mara Lee/ })).toBeInTheDocument();
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ name: "Mara Lee" }));
    expect(show).toHaveBeenCalledWith("success", "Artist saved", expect.any(String));
  });

  it("puts the old value back on Cancel and calls nothing", async () => {
    await renderArtist();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(textbox("Name"), { target: { value: "Someone Else" } });
    expect(textbox("Name")).toHaveValue("Someone Else");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(textbox("Name")).toHaveValue("Mara");
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(nailist.updateNailist).not.toHaveBeenCalled();
    expect(nailist.updateNailistServices).not.toHaveBeenCalled();
    expect(nailist.updateNailistDayOffs).not.toHaveBeenCalled();
    expect(nailist.updateNailistTimeSlots).not.toHaveBeenCalled();
  });

  it("adds a regular and a one-off day off, then removes one", async () => {
    await renderArtist();
    expect(screen.getByLabelText("Fri")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByLabelText("Fri"));
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-28`;
    fireEvent.click(screen.getByRole("button", { name: /28(st|nd|rd|th)?,/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(nailist.updateNailistDayOffs).toHaveBeenCalledTimes(1));
    expect(nailist.updateNailistDayOffs).toHaveBeenCalledWith(7, { regularDays: [3, 5], customDates: [key] }, "tok", "clerk_1");

    await screen.findByRole("button", { name: "Edit" });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByLabelText("Wed"));
    fireEvent.click(screen.getByRole("button", { name: /28(st|nd|rd|th)?,/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(nailist.updateNailistDayOffs).toHaveBeenCalledTimes(2));
    expect(nailist.updateNailistDayOffs).toHaveBeenLastCalledWith(7, { regularDays: [5], customDates: [] }, "tok", "clerk_1");
  });

  it("adds a time slot and removes one", async () => {
    await renderArtist();
    expect(screen.queryByRole("button", { name: "ADD" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    // the existing slot's two pickers, then the new-slot pair (re-queried: the pickers remount on every render)
    const times = () => document.querySelectorAll<HTMLInputElement>('input[type="time"]');
    expect(times()).toHaveLength(4);
    fireEvent.change(times()[2], { target: { value: "13:00" } });
    fireEvent.change(times()[3], { target: { value: "15:00" } });
    fireEvent.click(screen.getByRole("button", { name: "ADD" }));
    await screen.findAllByDisplayValue("13:00");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(nailist.updateNailistTimeSlots).toHaveBeenCalledTimes(1));
    expect(nailist.updateNailistTimeSlots).toHaveBeenCalledWith(7, ["08:00-10:00", "13:00-15:00"], "tok", "clerk_1");

    await screen.findByRole("button", { name: "Edit" });
    expect(screen.getByText("01:00 PM")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const slotsSection = screen.getByText("Start Time").parentElement!;
    const removeButtons = slotsSection.querySelectorAll<SVGElement>("svg.lucide-x");
    // the first remove icon belongs to the first slot (08:00-10:00)
    fireEvent.click(removeButtons[0].closest("button")!);
    expect(screen.queryByText("08:00 AM")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(nailist.updateNailistTimeSlots).toHaveBeenCalledTimes(2));
    expect(nailist.updateNailistTimeSlots).toHaveBeenLastCalledWith(7, ["13:00-15:00"], "tok", "clerk_1");
  });

  it("saves the services the artist offers after toggling", async () => {
    await renderArtist();
    expect(screen.getByLabelText("Nail Art")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByLabelText("Nail Art"));
    fireEvent.click(screen.getByLabelText("Gel Polish"));
    expect(screen.getByLabelText("Nail Art")).toBeChecked();
    expect(screen.getByLabelText("Gel Polish")).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(nailist.updateNailistServices).toHaveBeenCalledTimes(1));
    expect(nailist.updateNailistServices).toHaveBeenCalledWith(7, [2], "tok", "clerk_1");
  });

  it("shows the error and keeps the edits when saving fails", async () => {
    nailist.updateNailist.mockRejectedValue(new Error("Server said no"));
    await renderArtist();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(textbox("Name"), { target: { value: "Mara Lee" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(show).toHaveBeenCalledWith("error", "Artist not saved", "Server said no"));
    expect(textbox("Name")).toHaveValue("Mara Lee");
    expect(textbox("Name")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(nailist.updateNailistServices).not.toHaveBeenCalled();
  });
});

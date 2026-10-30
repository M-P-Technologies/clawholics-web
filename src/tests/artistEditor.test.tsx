import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ArtistEditor from "@/components/features/admin/catalog/ArtistEditor";

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
  fetchNailistGallery: vi.fn(),
};
const uploadImage = vi.fn();

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
  fetchNailistGallery: (...a: unknown[]) => nailist.fetchNailistGallery(...a),
  fetchArtistRoles: async () => [{ id: 1, name: "Master Technician", is_master: 1, artists: 1 }, { id: 2, name: "Junior Technician", is_master: 0, artists: 0 }],
  createArtistRole: vi.fn(),
  updateArtistRole: vi.fn(),
  deleteArtistRole: vi.fn(),
  addNailistGalleryImage: vi.fn(),
  deleteNailistGalleryImage: vi.fn(),
}));
vi.mock("@/services/serviceService", () => ({
  fetchServices: vi.fn().mockResolvedValue([
    { id: 1, name: "Gel Polish" },
    { id: 2, name: "Nail Art" },
  ]),
}));
vi.mock("@/services/appointmentService", () => ({ ADMIN_APPOINTMENTS_KEY: ["admin", "appointments"] }));
vi.mock("@/services/uploadService", () => ({
  PHOTO_UPLOAD_OPTIONS: { maxWidthOrHeight: 1600, maxSizeKB: 400 },
  uploadImage: (...a: unknown[]) => uploadImage(...a),
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
  render(<ArtistEditor nailist={artist} tokenFetcher={tokenFetcher} clerkId="clerk_1" onNailistUpdated={onNailistUpdated} />);
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

const writes = () =>
  nailist.updateNailist.mock.calls.length +
  nailist.updateNailistServices.mock.calls.length +
  nailist.updateNailistDayOffs.mock.calls.length +
  nailist.updateNailistTimeSlots.mock.calls.length;
// the time pickers remount on every render, so they are always queried afresh
const times = () => Array.from(document.querySelectorAll<HTMLInputElement>('input[type="time"]'));
const slotGrid = () => screen.getByText("Start Time").parentElement!;
const removeSlot = (index: number) =>
  fireEvent.click(slotGrid().querySelectorAll("svg.lucide-x")[index].closest("button")!);
const removePhoto = () => {
  const row = screen.getByText(/\.webp$/, { selector: "button" }).parentElement!;
  fireEvent.click(row.querySelectorAll("button")[1]);
};
const setNewSlot = (start: string, end: string) => {
  const n = times().length;
  fireEvent.change(times()[n - 2], { target: { value: start } });
  fireEvent.change(times()[n - 1], { target: { value: end } });
};
const addSlot = (start: string, end: string) => {
  setNewSlot(start, end);
  fireEvent.click(screen.getByRole("button", { name: "Add time slot" }));
};

beforeEach(() => {
  vi.clearAllMocks();
  nailist.fetchNailistGallery.mockResolvedValue([]);
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

  it("lists the roles the admin set up, and saves an artist hiding their role", async () => {
    nailist.updateNailist.mockResolvedValue({ ...artist, hide_position: 1 });
    await renderArtist();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByText("Master Technician"));
    expect(await screen.findByRole("option", { name: "Junior Technician" })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    fireEvent.click(screen.getByLabelText("Hide this role on the site"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(nailist.updateNailist).toHaveBeenCalled());
    expect(nailist.updateNailist).toHaveBeenLastCalledWith(7, "Mara", "Master Technician", "Chrome", "Ten years of nails", artist.image, "tok", "clerk_1", true);
  });

  it("opens Manage roles with each role and what it charges", async () => {
    await renderArtist();
    fireEvent.click(screen.getByRole("button", { name: "Manage roles" }));
    expect(await screen.findByDisplayValue("Junior Technician")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Senior Technician")).toBeInTheDocument();
    // A role in use can't be removed
    expect(screen.getAllByRole("button", { name: "Remove" })[0]).toBeDisabled();
  });

  it("saves a new name and shows it", async () => {
    const onUpdated = await renderArtist();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(textbox("Name"), { target: { value: "Mara Lee" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(nailist.updateNailist).toHaveBeenCalledTimes(1));
    expect(nailist.updateNailist).toHaveBeenCalledWith(7, "Mara Lee", "Master Technician", "Chrome", "Ten years of nails", artist.image, "tok", "clerk_1", false);
    await screen.findByRole("button", { name: "Edit" });
    expect(textbox("Name")).toHaveValue("Mara Lee");
    expect(screen.getByRole("button", { name: /Mara Lee/ })).toBeInTheDocument();
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ name: "Mara Lee" }));
    expect(show).toHaveBeenCalledWith("success", "Mara Lee saved", expect.any(String));
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
    expect(screen.queryByRole("button", { name: "Add time slot" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    // the existing slot's two pickers, then the new-slot pair (re-queried: the pickers remount on every render)
    const times = () => document.querySelectorAll<HTMLInputElement>('input[type="time"]');
    expect(times()).toHaveLength(4);
    fireEvent.change(times()[2], { target: { value: "13:00" } });
    fireEvent.change(times()[3], { target: { value: "15:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Add time slot" }));
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
    await waitFor(() => expect(show).toHaveBeenCalledWith("error", "Mara Lee not saved", "Server said no"));
    expect(textbox("Name")).toHaveValue("Mara Lee");
    expect(textbox("Name")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(nailist.updateNailistServices).not.toHaveBeenCalled();
  });

  it("shows the gallery section and loads the gallery of the artist", async () => {
    await renderArtist();
    expect(screen.getByText(/Photos of their work \(0\//)).toBeInTheDocument();
    expect(nailist.fetchNailistGallery).toHaveBeenCalledWith(7);
  });

  it("puts every section back on Cancel and writes nothing", async () => {
    await renderArtist();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByLabelText("Fri"));
    fireEvent.click(screen.getByLabelText("Gel Polish"));
    removeSlot(0);
    expect(screen.queryByText("08:00 AM")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByLabelText("Fri")).not.toBeChecked();
    expect(screen.getByLabelText("Gel Polish")).toBeChecked();
    expect(screen.getByText("08:00 AM")).toBeInTheDocument();
    expect(writes()).toBe(0);
  });

  it("sends days, slots and services sorted", async () => {
    await renderArtist();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByLabelText("Mon"));
    addSlot("06:00", "07:00");
    // while editing the slots are time inputs; the new slot comes first, ahead of 08:00
    expect(times().slice(0, 4).map((t) => t.value)).toEqual(["06:00", "07:00", "08:00", "10:00"]);
    fireEvent.click(screen.getByLabelText("Nail Art"));
    fireEvent.click(screen.getByLabelText("Gel Polish"));
    fireEvent.click(screen.getByLabelText("Gel Polish"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(nailist.updateNailistTimeSlots).toHaveBeenCalledTimes(1));
    expect(nailist.updateNailistDayOffs).toHaveBeenCalledWith(7, { regularDays: [1, 3], customDates: [] }, "tok", "clerk_1");
    expect(nailist.updateNailistTimeSlots).toHaveBeenCalledWith(7, ["06:00-07:00", "08:00-10:00"], "tok", "clerk_1");
    expect(nailist.updateNailistServices).toHaveBeenCalledWith(7, [1, 2], "tok", "clerk_1");
  });

  it("keeps two artists apart and saves only the one edited", async () => {
    const other = { ...artist, id: 8, name: "Noor", service_ids: [2] };
    nailist.fetchNailistDayOffs.mockImplementation(async (id: number) => ({ regularDays: id === 8 ? [2] : [3], customDates: [] }));
    nailist.fetchNailistTimeSlots.mockImplementation(async (id: number) => (id === 8 ? ["09:00-11:00"] : ["08:00-10:00"]));
    nailist.fetchNailistServices.mockImplementation(async (id: number) => (id === 8 ? [2] : [1]));
    render(
      <>
        <ArtistEditor nailist={artist} tokenFetcher={tokenFetcher} clerkId="clerk_1" />
        <ArtistEditor nailist={other} tokenFetcher={tokenFetcher} clerkId="clerk_1" />
      </>,
    );
    await screen.findByText("09:00 AM");
    await screen.findByText("08:00 AM");
    const [c7, c8] = screen.getAllByText("Time Slots").map((el) => el.closest("div.rounded-xl") as HTMLElement);
    await waitFor(() => expect(within(c7).getByLabelText("Wed")).toBeChecked());
    await waitFor(() => expect(within(c8).getByLabelText("Tue")).toBeChecked());
    expect(within(c7).getByLabelText("Tue")).not.toBeChecked();
    expect(within(c8).getByLabelText("Wed")).not.toBeChecked();
    expect(within(c7).getByText("08:00 AM")).toBeInTheDocument();
    expect(within(c8).getByText("09:00 AM")).toBeInTheDocument();
    await waitFor(() => expect(within(c8).getByLabelText("Nail Art")).toBeChecked());
    expect(within(c7).getByLabelText("Gel Polish")).toBeChecked();
    for (const f of ["fetchNailistDayOffs", "fetchNailistTimeSlots", "fetchNailistServices", "fetchNailistGallery"] as const) {
      expect(nailist[f]).toHaveBeenCalledWith(7);
      expect(nailist[f]).toHaveBeenCalledWith(8);
    }
    fireEvent.click(within(c8).getByRole("button", { name: "Edit" }));
    fireEvent.click(within(c8).getByLabelText("Fri"));
    fireEvent.click(within(c8).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(nailist.updateNailistTimeSlots).toHaveBeenCalledTimes(1));
    expect(nailist.updateNailist.mock.calls[0][0]).toBe(8);
    expect(nailist.updateNailistServices.mock.calls[0][0]).toBe(8);
    expect(nailist.updateNailistDayOffs.mock.calls[0][0]).toBe(8);
    expect(nailist.updateNailistTimeSlots.mock.calls[0][0]).toBe(8);
    expect(nailist.updateNailistDayOffs.mock.calls[0][1]).toEqual({ regularDays: [2, 5], customDates: [] });
    expect(nailist.updateNailist).toHaveBeenCalledTimes(1);
    expect(nailist.updateNailistServices).toHaveBeenCalledTimes(1);
    expect(nailist.updateNailistDayOffs).toHaveBeenCalledTimes(1);
  });

  describe("create mode", () => {
    const renderCreate = () => {
      const onCreated = vi.fn();
      render(<ArtistEditor mode="create" tokenFetcher={tokenFetcher} clerkId="clerk_1" onNailistCreated={onCreated} />);
      fireEvent.click(screen.getByRole("button", { name: /Add Artist/ }));
      return onCreated;
    };
    const fill = () => {
      fireEvent.change(textbox("Name"), { target: { value: "Ines" } });
      fireEvent.change(textbox("Specialty"), { target: { value: "French tips" } });
      fireEvent.change(textbox("Bio"), { target: { value: "Loves detail" } });
      fireEvent.click(screen.getByText("Select position"));
      fireEvent.click(screen.getByRole("option", { name: "Junior Technician" }));
    };
    const withPhoto = async () => {
      uploadImage.mockResolvedValue({ key: "k", imageUrl: "https://img/nailists/ines.webp" });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [new File(["x"], "ines.png", { type: "image/png" })] } });
      await screen.findByText("ines.webp");
    };

    it("shows the add form without day offs or time slots", async () => {
      renderCreate();
      expect(screen.getAllByText("Add Artist").length).toBeGreaterThan(0);
      expect(screen.queryByText("Day Off")).not.toBeInTheDocument();
      expect(screen.queryByText("Time Slots")).not.toBeInTheDocument();
      expect(screen.getByText(/once visits by this artist are completed/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
      expect(await screen.findByLabelText("Nail Art")).toBeEnabled();
    });

    it("creates the artist with its services and resets the form", async () => {
      nailist.createNailist.mockResolvedValue({ ...artist, id: 9, name: "Ines" });
      nailist.updateNailistServices.mockResolvedValue([2]);
      const onCreated = renderCreate();
      await screen.findByLabelText("Nail Art");
      fill();
      await withPhoto();
      fireEvent.click(screen.getByLabelText("Nail Art"));
      fireEvent.click(screen.getByRole("button", { name: "Add" }));
      await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
      expect(nailist.createNailist).toHaveBeenCalledWith("Ines", "Junior Technician", "French tips", "Loves detail", "https://img/nailists/ines.webp", "tok", "clerk_1", false);
      expect(nailist.updateNailistServices).toHaveBeenCalledWith(9, [2], "tok", "clerk_1");
      expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 9, service_ids: [2] }));
      expect(show).toHaveBeenCalledWith("success", "Ines added", expect.stringContaining("Ines"));
      expect(textbox("Name")).toHaveValue("");
      expect(screen.getByLabelText("Nail Art")).not.toBeChecked();
      expect(screen.getByText("Select position")).toBeInTheDocument();
    });

    it("says the artist was not created when it fails", async () => {
      nailist.createNailist.mockRejectedValue(new Error("Nope"));
      renderCreate();
      await screen.findByLabelText("Nail Art");
      fill();
      await withPhoto();
      fireEvent.click(screen.getByRole("button", { name: "Add" }));
      await waitFor(() => expect(show).toHaveBeenCalledWith("error", "Ines not created", "Nope"));
      expect(textbox("Name")).toHaveValue("Ines");
      expect(nailist.updateNailistServices).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deletes after confirming", async () => {
      const onDeleted = vi.fn();
      nailist.deleteNailist.mockResolvedValue(undefined);
      render(<ArtistEditor nailist={artist} tokenFetcher={tokenFetcher} clerkId="clerk_1" onNailistDeleted={onDeleted} />);
      await screen.findByLabelText("Gel Polish");
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).getByText("Delete artist?")).toBeInTheDocument();
      // The question names who would be deleted
      expect(within(dialog).getByText("Mara")).toBeInTheDocument();
      expect(nailist.deleteNailist).not.toHaveBeenCalled();
      fireEvent.click(within(dialog).getByRole("button", { name: "Delete artist" }));
      await waitFor(() => expect(nailist.deleteNailist).toHaveBeenCalledWith(7, "tok", "clerk_1"));
      await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(7));
      expect(show).toHaveBeenCalledWith("success", "Mara deleted", expect.stringContaining("Mara"));
    });

    it("keeps the dialog open and says so when deleting fails", async () => {
      const onDeleted = vi.fn();
      nailist.deleteNailist.mockRejectedValue(new Error("x"));
      render(<ArtistEditor nailist={artist} tokenFetcher={tokenFetcher} clerkId="clerk_1" onNailistDeleted={onDeleted} />);
      await screen.findByLabelText("Gel Polish");
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      const dialog = await screen.findByRole("alertdialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "Delete artist" }));
      await waitFor(() => expect(show).toHaveBeenCalledWith("error", "Mara not deleted", expect.stringContaining("Mara")));
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(onDeleted).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("refuses an empty field and an empty photo, writing nothing", async () => {
      await renderArtist();
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      fireEvent.change(textbox("Bio"), { target: { value: "  " } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() => expect(show).toHaveBeenCalledWith("error", "Some fields are empty", expect.any(String)));
      expect(writes()).toBe(0);
      show.mockClear();
      fireEvent.change(textbox("Bio"), { target: { value: "Back" } });
      removePhoto();
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() => expect(show).toHaveBeenCalledWith("error", "Some fields are empty", expect.any(String)));
      expect(writes()).toBe(0);
    });

    it("checks a new time slot before adding it", async () => {
      await renderArtist();
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      fireEvent.click(screen.getByRole("button", { name: "Add time slot" }));
      expect(show).toHaveBeenLastCalledWith("error", "Add both times", expect.any(String));
      setNewSlot("11:00", "10:00");
      fireEvent.click(screen.getByRole("button", { name: "Add time slot" }));
      expect(show).toHaveBeenLastCalledWith("error", "Check the times", expect.any(String));
      setNewSlot("09:00", "09:00");
      fireEvent.click(screen.getByRole("button", { name: "Add time slot" }));
      expect(show).toHaveBeenLastCalledWith("error", "Check the times", expect.any(String));
      setNewSlot("08:00", "10:00");
      fireEvent.click(screen.getByRole("button", { name: "Add time slot" }));
      expect(show).toHaveBeenLastCalledWith("error", "Duplicate time slot", expect.any(String));
      expect(show).toHaveBeenCalledTimes(4);
      // still one saved slot (two pickers) plus the new-slot pair
      expect(times()).toHaveLength(4);
    });

    it("refuses to save a slot whose end is not after its start", async () => {
      await renderArtist();
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      fireEvent.change(times()[1], { target: { value: "07:00" } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() => expect(show).toHaveBeenCalledWith("error", "Finish the time slots", expect.any(String)));
      expect(writes()).toBe(0);
    });
  });

  describe("photo", () => {
    it("offers an upload once the photo is removed and uploads a new one", async () => {
      await renderArtist();
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      expect(screen.queryByText("Add a photo")).not.toBeInTheDocument();
      removePhoto();
      expect(screen.queryByText("mara.webp")).not.toBeInTheDocument();
      expect(screen.getByText("Add a photo")).toBeInTheDocument();
      uploadImage.mockResolvedValue({ key: "k", imageUrl: "https://img/nailists/new.webp" });
      const file = new File(["x"], "new.png", { type: "image/png" });
      fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file] } });
      await screen.findByText("new.webp");
      expect(uploadImage).toHaveBeenCalledWith(file, "nailists", "tok", "clerk_1");
    });

    it("says so when the upload fails", async () => {
      await renderArtist();
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      removePhoto();
      uploadImage.mockRejectedValue(new Error("bad"));
      const file = new File(["x"], "new.png", { type: "image/png" });
      fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file] } });
      await waitFor(() => expect(show).toHaveBeenCalledWith("error", "Photo not uploaded", expect.any(String)));
      expect(screen.getByText("Add a photo")).toBeInTheDocument();
    });
  });
});

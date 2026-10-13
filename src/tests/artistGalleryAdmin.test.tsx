import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NailArtistGallery from "@/components/admin/NailArtistGallery";

const show = vi.fn();
const fetchNailistGallery = vi.fn();
const addNailistGalleryImage = vi.fn();
const deleteNailistGalleryImage = vi.fn();
const uploadImage = vi.fn();

vi.mock("@/components/ui/ToastProvider", () => ({ useToast: () => ({ show }) }));
vi.mock("@/services/nailistService", () => ({
  fetchNailistGallery: (...a: unknown[]) => fetchNailistGallery(...a),
  addNailistGalleryImage: (...a: unknown[]) => addNailistGalleryImage(...a),
  deleteNailistGalleryImage: (...a: unknown[]) => deleteNailistGalleryImage(...a),
}));
vi.mock("@/services/uploadService", () => ({
  PHOTO_UPLOAD_OPTIONS: { maxWidthOrHeight: 1600, maxSizeKB: 400 },
  uploadImage: (...a: unknown[]) => uploadImage(...a),
}));

const photo = (id: number, name: string) => ({ id, nailist_id: 7, image_url: `https://img/nailists/${name}.webp`, position: id });
const renderCard = (props: Partial<React.ComponentProps<typeof NailArtistGallery>> = {}) =>
  render(<NailArtistGallery nailistId={7} isEditing onPreview={() => {}} {...props} />);

beforeEach(() => {
  vi.clearAllMocks();
  fetchNailistGallery.mockResolvedValue([photo(2, "b"), photo(1, "a")]);
});

describe("admin artist gallery card", () => {
  it("lists the artist's photos in order, with a count", async () => {
    renderCard();
    await screen.findByText("a.webp");
    expect(screen.getByText(/\(2\/10\)/)).toBeInTheDocument();
    const names = screen.getAllByText(/\.webp$/).map((el) => el.textContent);
    expect(names).toEqual(["a.webp", "b.webp"]);
  });

  it("asks to save a new artist first, and loads nothing", () => {
    renderCard({ nailistId: null });
    expect(screen.getByText(/save the artist first/i)).toBeInTheDocument();
    expect(fetchNailistGallery).not.toHaveBeenCalled();
  });

  it("uploads with the photo preset, saves each photo at once and shows it", async () => {
    fetchNailistGallery.mockResolvedValue([]);
    uploadImage.mockResolvedValue({ key: "k", imageUrl: "https://img/nailists/new.webp" });
    addNailistGalleryImage.mockResolvedValue({ id: 5 });
    const { container } = renderCard();
    await waitFor(() => expect(fetchNailistGallery).toHaveBeenCalledWith(7));

    const file = new File([new Uint8Array(10)], "new.png", { type: "image/png" });
    fireEvent.change(container.querySelector("input[type=file]")!, { target: { files: [file] } });

    await screen.findByText("new.webp");
    expect(uploadImage).toHaveBeenCalledWith(file, "nailists", null, undefined, { maxWidthOrHeight: 1600, maxSizeKB: 400 });
    expect(addNailistGalleryImage).toHaveBeenCalledWith(7, "https://img/nailists/new.webp", null, undefined);
  });

  it("removes a photo at once, and keeps it on screen if the removal fails", async () => {
    renderCard();
    await screen.findByText("a.webp");

    deleteNailistGalleryImage.mockRejectedValueOnce(new Error("nope"));
    fireEvent.click(screen.getAllByLabelText("Remove photo")[0]);
    await waitFor(() => expect(show).toHaveBeenCalledWith("error", "Photo not removed", expect.any(String)));
    expect(screen.getByText("a.webp")).toBeInTheDocument();

    deleteNailistGalleryImage.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getAllByLabelText("Remove photo")[0]);
    await waitFor(() => expect(screen.queryByText("a.webp")).not.toBeInTheDocument());
    expect(deleteNailistGalleryImage).toHaveBeenLastCalledWith(1, null, undefined);
  });

  it("says so when the photos can't be loaded", async () => {
    fetchNailistGallery.mockRejectedValue(new Error("down"));
    renderCard();
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load/i);
  });
});

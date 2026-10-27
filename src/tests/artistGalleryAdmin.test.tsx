import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NailArtistGallery from "@/components/features/admin/catalog/NailArtistGallery";

const show = vi.fn();
const fetchNailistGallery = vi.fn();
const deleteNailistGalleryImage = vi.fn();

vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show }) }));
vi.mock("@/services/nailistService", () => ({
  fetchNailistGallery: (...a: unknown[]) => fetchNailistGallery(...a),
  deleteNailistGalleryImage: (...a: unknown[]) => deleteNailistGalleryImage(...a),
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

  it("doesn't load anything for a new artist, and says where photos come from", () => {
    renderCard({ nailistId: null });
    expect(screen.getByText(/once visits by this artist are completed/i)).toBeInTheDocument();
    expect(fetchNailistGallery).not.toHaveBeenCalled();
  });

  it("has no upload: the photos come from completed visits", async () => {
    const { container } = renderCard();
    await screen.findByText("a.webp");
    expect(container.querySelector("input[type=file]")).toBeNull();
    expect(screen.getByText(/come from the visits this artist completes/i)).toBeInTheDocument();
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

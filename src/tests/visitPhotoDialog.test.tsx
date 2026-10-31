import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VisitPhotoDialog from "@/components/features/admin/bookings/VisitPhotoDialog";

vi.mock("@clerk/nextjs", () => {
  const auth = { getToken: async () => "tok", userId: "admin_1" };
  return { useAuth: () => auth };
});
const show = vi.fn();
vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show }) }));
const uploadVisitPhoto = vi.fn();
vi.mock("@/services/completionService", async (orig) => ({ ...(await orig<object>()), uploadVisitPhoto: (...a: unknown[]) => uploadVisitPhoto(...a) }));

const open = (onDone = vi.fn(), onClose = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <VisitPhotoDialog appointmentId={7} open onClose={onClose} onDone={onDone} />
    </QueryClientProvider>,
  );
  return { onDone, onClose, user: userEvent.setup() };
};

beforeEach(() => {
  uploadVisitPhoto.mockReset().mockResolvedValue({ photo_url: "https://images.test/nailists/x.webp" });
  globalThis.URL.createObjectURL = vi.fn(() => "blob:preview");
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe("the visit photo window", () => {
  it("takes one photo of 5 MB or less and uploads it", async () => {
    const { user, onDone } = open();
    expect(screen.getByRole("dialog", { name: "Add a visit photo" })).toBeInTheDocument();
    expect(screen.getByText(/One photo, up to 5 MB/)).toBeInTheDocument();
    const photo = new File(["x"], "nails.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("Visit photo"), photo);
    await user.click(screen.getByRole("button", { name: "Upload photo" }));
    await waitFor(() => expect(uploadVisitPhoto).toHaveBeenCalledWith(7, photo, { token: "tok", clerkId: "admin_1" }));
    expect(onDone).toHaveBeenCalled();
  });

  it("refuses a photo over 5 MB, before uploading anything", async () => {
    const { user } = open();
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("Visit photo"), big);
    expect(screen.getByRole("alert")).toHaveTextContent("5 MB or smaller");
    expect(screen.getByRole("button", { name: "Upload photo" })).toBeDisabled();
    expect(uploadVisitPhoto).not.toHaveBeenCalled();
  });
});

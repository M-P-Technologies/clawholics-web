import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProofUploader from "@/components/features/client/appointments/ProofUploader";
import { ApiError } from "../services/catalogService";
import * as proofService from "../services/proofService";

vi.mock("../services/proofService", async () => {
  const actual = await vi.importActual<typeof import("../services/proofService")>("../services/proofService");
  return { ...actual, uploadProof: vi.fn() };
});

const proof = {
  id: 1, appointment_id: 7, user_id: 3, status: "PENDING" as const,
  image_url: "https://img/p.webp", created_at: "2026-10-09T12:00:00Z",
};
const png = () => new File([new Uint8Array(10)], "shot.png", { type: "image/png" });

const setup = () => {
  const onUploaded = vi.fn();
  render(
    <ProofUploader appointmentId={7} tokenFetcher={async () => "tok"} clerkId="user_1" onUploaded={onUploaded} />,
  );
  return { onUploaded, user: userEvent.setup({ applyAccept: false }) };
};

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

describe("ProofUploader", () => {
  it("refuses a wrong file type without touching the network", async () => {
    const { user } = setup();
    await user.upload(
      screen.getByLabelText(/payment screenshot/i),
      new File([new Uint8Array(3)], "x.pdf", { type: "application/pdf" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Only JPG, PNG, or WEBP/);
    expect(screen.getByRole("button", { name: /upload screenshot/i })).toBeDisabled();
    expect(proofService.uploadProof).not.toHaveBeenCalled();
  });

  it("previews a valid file and uploads it with the auth", async () => {
    vi.mocked(proofService.uploadProof).mockResolvedValue(proof);
    const { user, onUploaded } = setup();
    const file = png();

    await user.upload(screen.getByLabelText(/payment screenshot/i), file);
    expect(screen.getByAltText(/screenshot preview/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /upload screenshot/i }));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(proof));
    expect(proofService.uploadProof).toHaveBeenCalledWith(7, file, { token: "tok", clerkId: "user_1" });
    expect(screen.queryByAltText(/screenshot preview/i)).not.toBeInTheDocument();
  });

  it("uploads only once when the button is clicked twice", async () => {
    let resolveUpload: (p: typeof proof) => void = () => {};
    vi.mocked(proofService.uploadProof).mockReturnValue(new Promise((res) => { resolveUpload = res; }));
    const { user, onUploaded } = setup();

    await user.upload(screen.getByLabelText(/payment screenshot/i), png());
    const button = screen.getByRole("button", { name: /upload screenshot/i });
    await user.click(button);
    await user.click(button);

    expect(proofService.uploadProof).toHaveBeenCalledTimes(1);
    resolveUpload(proof);
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
  });

  it("shows a friendly message on 404 and lets the user retry the same file", async () => {
    vi.mocked(proofService.uploadProof)
      .mockRejectedValueOnce(new ApiError("Not found", 404))
      .mockResolvedValueOnce(proof);
    const { user, onUploaded } = setup();

    await user.upload(screen.getByLabelText(/payment screenshot/i), png());
    await user.click(screen.getByRole("button", { name: /upload screenshot/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/isn't available yet/i);

    await user.click(screen.getByRole("button", { name: /upload screenshot/i }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(proof));
  });

  it("shows the server's message for other failures", async () => {
    vi.mocked(proofService.uploadProof).mockRejectedValue(new Error("Compressed image is still larger than 400KB."));
    const { user } = setup();
    await user.upload(screen.getByLabelText(/payment screenshot/i), png());
    await user.click(screen.getByRole("button", { name: /upload screenshot/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/still larger than 400KB/);
  });
});

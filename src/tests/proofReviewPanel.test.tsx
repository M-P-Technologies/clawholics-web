import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProofReviewPanel from "@/components/features/admin/bookings/ProofReviewPanel";
import { ApiError } from "../services/catalogService";
import * as proofs from "../services/proofService";

// A stand-in preview, so the test sees which photo was opened
vi.mock("@/components/organisms", async (orig) => ({
  ...(await orig<object>()),
  ImagePreviewDialog: ({ imageUrl }: { imageUrl: string | null }) =>
    imageUrl ? <div data-testid="zoom">{imageUrl}</div> : null,
}));

vi.mock("../services/proofService", async () => {
  const actual = await vi.importActual<typeof import("../services/proofService")>("../services/proofService");
  return { ...actual, fetchProofs: vi.fn(), reviewProof: vi.fn() };
});

const auth = { token: "tok", clerkId: "admin_1" };
const proof = (over: Partial<proofs.PaymentProof> = {}): proofs.PaymentProof => ({
  id: 11, appointment_id: 7, user_id: 3, status: "PENDING", image_url: "https://img/2.webp",
  admin_note: null, created_at: "2026-10-09T10:00:00Z", ...over,
});

const setup = (props: Partial<React.ComponentProps<typeof ProofReviewPanel>> = {}) => {
  const onReviewed = vi.fn();
  render(
    <ProofReviewPanel
      appointmentId={7}
      status="AWAITING_PROOF"
      proofDueAt={new Date(Date.now() + 3_600_000).toISOString()}
      tokenFetcher={async () => "tok"}
      clerkId="admin_1"
      onReviewed={onReviewed}
      {...props}
    />,
  );
  return { onReviewed, user: userEvent.setup() };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(proofs.fetchProofs).mockResolvedValue([
    proof(),
    proof({ id: 10, status: "REJECTED", admin_note: "Blurry", image_url: "https://img/1.webp", created_at: "2026-10-08T10:00:00Z" }),
  ]);
});

describe("ProofReviewPanel", () => {
  it("shows the latest screenshot and the history with the earlier rejection note", async () => {
    setup();
    expect(await screen.findByAltText(/latest payment screenshot/i)).toHaveAttribute("src", "https://img/2.webp");
    expect(screen.getByText(/blurry/i)).toBeInTheDocument();
    expect(proofs.fetchProofs).toHaveBeenCalledWith(7, auth);
  });

  it("approving needs a confirming click, then reviews the latest proof", async () => {
    vi.mocked(proofs.reviewProof).mockResolvedValue(proof({ status: "APPROVED" }));
    const { user, onReviewed } = setup();

    await user.click(await screen.findByRole("button", { name: "Approve" }));
    expect(proofs.reviewProof).not.toHaveBeenCalled();
    expect(screen.getByText(/confirms this appointment and emails the client/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm approve" }));
    await waitFor(() => expect(onReviewed).toHaveBeenCalled());
    expect(proofs.reviewProof).toHaveBeenCalledWith(11, { status: "APPROVED" }, auth);
  });

  it("rejecting needs a non-blank reason", async () => {
    vi.mocked(proofs.reviewProof).mockResolvedValue(proof({ status: "REJECTED" }));
    const { user } = setup();

    await user.click(await screen.findByRole("button", { name: "Reject" }));
    const confirm = screen.getByRole("button", { name: "Confirm reject" });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText(/reason for rejection/i), "   ");
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText(/reason for rejection/i), "Wrong amount");
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() =>
      expect(proofs.reviewProof).toHaveBeenCalledWith(11, { status: "REJECTED", admin_note: "Wrong amount" }, auth),
    );
  });

  it("offers no review buttons once the latest proof has been decided", async () => {
    vi.mocked(proofs.fetchProofs).mockResolvedValue([proof({ status: "APPROVED" })]);
    setup({ status: "CONFIRMED" });
    await screen.findByAltText(/latest payment screenshot/i);
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });

  it("flags an overdue appointment that has no proof yet", async () => {
    vi.mocked(proofs.fetchProofs).mockResolvedValue([]);
    setup({ proofDueAt: "2020-01-01T00:00:00Z" });
    expect(await screen.findByText(/proof overdue/i)).toBeInTheDocument();
  });

  it("says review isn't available yet on a 404", async () => {
    vi.mocked(proofs.fetchProofs).mockRejectedValue(new ApiError("Not found", 404));
    setup();
    expect(await screen.findByText(/proof review isn't available yet/i)).toBeInTheDocument();
  });

  it("shows an error when the review fails and keeps the buttons usable", async () => {
    vi.mocked(proofs.reviewProof).mockRejectedValue(new Error("Only a pending proof can be reviewed"));
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: "Approve" }));
    await user.click(screen.getByRole("button", { name: "Confirm approve" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/only a pending proof/i);
    expect(screen.getByRole("button", { name: "Confirm approve" })).toBeEnabled();
  });
});

describe("reviewing a screenshot of a payment made online", () => {
  it("offers Approve while the booking waits for the salon, and for a manual booking still pending", async () => {
    setup({ status: "AWAITING_CONFIRMATION", proofDueAt: null });
    expect(await screen.findByRole("button", { name: /Approve/ })).toBeInTheDocument();
  });

  it("offers Approve for a proof on a PENDING booking", async () => {
    setup({ status: "PENDING", proofDueAt: null });
    expect(await screen.findByRole("button", { name: /Approve/ })).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PaymentProofCard from "../components/payment/PaymentProofCard";

vi.mock("../services/proofService", async () => {
  const actual = await vi.importActual<typeof import("../services/proofService")>("../services/proofService");
  return { ...actual, uploadProof: vi.fn() };
});

const NOW = Date.parse("2026-10-09T12:00:00Z");
const HOUR = 3_600_000;

const proof = (status: "PENDING" | "APPROVED" | "REJECTED", admin_note: string | null = null) => ({
  id: 1, status, image_url: "https://img/p.webp", admin_note, created_at: "2026-10-09T11:00:00Z",
});

const base: {
  id: number;
  status: string;
  proof_due_at: string | null;
  latest_proof: ReturnType<typeof proof> | null;
} = {
  id: 7,
  status: "AWAITING_PROOF",
  proof_due_at: new Date(NOW + 23 * HOUR).toISOString(),
  latest_proof: null,
};

const renderCard = (over: Partial<typeof base> = {}) =>
  render(
    <PaymentProofCard appointment={{ ...base, ...over }} now={NOW} tokenFetcher={async () => "tok"} clerkId="user_1" />,
  );

describe("PaymentProofCard", () => {
  it("asks for the screenshot, shows the time left and links the terms", () => {
    renderCard();
    expect(screen.getByText(/send your payment screenshot/i)).toBeInTheDocument();
    expect(screen.getByText(/time left to upload: 23h 0m/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /terms & conditions/i })).toHaveAttribute("href", "/terms");
    expect(screen.getByLabelText(/payment screenshot/i)).toBeInTheDocument();
  });

  it("omits the countdown when the deadline is unknown", () => {
    renderCard({ proof_due_at: null });
    expect(screen.getByText(/send your payment screenshot/i)).toBeInTheDocument();
    expect(screen.queryByText(/time left/i)).not.toBeInTheDocument();
  });

  it("flags an overdue proof but still allows the upload", () => {
    renderCard({ proof_due_at: new Date(NOW - HOUR).toISOString() });
    expect(screen.getByText(/screenshot is overdue/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/payment screenshot/i)).toBeInTheDocument();
  });

  it("shows 'received' with no uploader while the proof is in review", () => {
    renderCard({ latest_proof: proof("PENDING") });
    expect(screen.getByText(/screenshot received/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/payment screenshot/i)).not.toBeInTheDocument();
    expect(screen.getByAltText(/your uploaded screenshot/i)).toBeInTheDocument();
  });

  it("shows the admin's reason and an uploader when rejected", () => {
    renderCard({ latest_proof: proof("REJECTED", "Amount is not visible") });
    expect(screen.getByText(/screenshot not accepted/i)).toBeInTheDocument();
    expect(screen.getByText(/amount is not visible/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/payment screenshot/i)).toBeInTheDocument();
  });

  it("shows 'payment verified' when approved", () => {
    renderCard({ status: "CONFIRMED", latest_proof: proof("APPROVED") });
    expect(screen.getByText(/payment verified/i)).toBeInTheDocument();
  });

  it("renders nothing for an old confirmed appointment with no proof", () => {
    const { container } = renderCard({ status: "CONFIRMED", proof_due_at: null });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a pending (unpaid) appointment", () => {
    const { container } = renderCard({ status: "PENDING" });
    expect(container).toBeEmptyDOMElement();
  });

  it("gives the section an id the profile page can scroll to", () => {
    renderCard();
    expect(document.getElementById("proof-7")).not.toBeNull();
  });
});

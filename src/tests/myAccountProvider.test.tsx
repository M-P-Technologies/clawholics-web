import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MyAccountProvider from "@/components/client/MyAccountProvider";
import { useMyAccount } from "@/hooks/client/useMyAccount";

const view = (id: number) => ({ appt: { id, service_name: `Service ${id}` } });
let hook: Record<string, unknown>;
let pathname = "/my";
vi.mock("@/lib/router", () => ({
  useLocation: () => ({ pathname }),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock("@/hooks/useProfile", () => ({ useProfile: () => hook }));
vi.mock("@/hooks/useMyReviews", () => ({ useMyReviews: () => ({ reviews: {}, submit: vi.fn() }) }));
vi.mock("@/hooks/useServicePhotos", () => ({ useServicePhotos: () => () => "" }));
vi.mock("@/components/profile/AppointmentSheet", () => ({
  default: ({ view }: { view: { appt: { id: number } } | null }) => (view ? <div>Sheet for {view.appt.id}</div> : null),
}));
vi.mock("@/components/profile/RewardsSheet", () => ({ default: ({ open }: { open: boolean }) => (open ? <div>Rewards open</div> : null) }));
vi.mock("@/components/profile/EditDetailsSheet", () => ({ default: () => null }));

const base = () => ({
  isBusy: false,
  dbUser: { first_name: "Ana" },
  upcoming: [view(1)],
  pastViews: [view(2)],
  highlightedAppointmentId: null,
  stamps: 3,
  showRewardModal: false,
  isCancelModalOpen: false,
  selectedAppt: null,
  clerkUser: { id: "u1" },
});

function Opener() {
  const a = useMyAccount();
  return (
    <>
      <button onClick={() => a.openAppointment(2)}>open 2</button>
      <button onClick={a.openRewards}>rewards</button>
    </>
  );
}

describe("MyAccountProvider", () => {
  it("waits for the profile before showing the app", () => {
    hook = { ...base(), isBusy: true, dbUser: null };
    render(<MyAccountProvider><p>App</p></MyAccountProvider>);
    expect(screen.queryByText("App")).not.toBeInTheDocument();
  });

  it("opens any appointment's sheet and the rewards card from any screen", () => {
    hook = base();
    render(<MyAccountProvider><Opener /></MyAccountProvider>);
    fireEvent.click(screen.getByText("open 2"));
    expect(screen.getByText("Sheet for 2")).toBeInTheDocument();
    fireEvent.click(screen.getByText("rewards"));
    expect(screen.getByText("Rewards open")).toBeInTheDocument();
  });

  it("opens the appointment the client arrived for", () => {
    hook = { ...base(), highlightedAppointmentId: 1 };
    render(<MyAccountProvider><p>App</p></MyAccountProvider>);
    expect(screen.getByText("Sheet for 1")).toBeInTheDocument();
  });

  it("doesn't cover the payment confirmation with the appointment's sheet", () => {
    pathname = "/my/confirmation";
    hook = { ...base(), highlightedAppointmentId: 1 };
    render(<MyAccountProvider><p>App</p></MyAccountProvider>);
    expect(screen.queryByText("Sheet for 1")).toBeNull();
    pathname = "/my";
  });

  it("offers a retry instead of loading forever when the account can't load", () => {
    const retryLoad = vi.fn();
    hook = { ...base(), isBusy: true, dbUser: null, loadError: true, retryLoad };
    render(<MyAccountProvider><p>App</p></MyAccountProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retryLoad).toHaveBeenCalled();
  });

  it("refuses to be used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Opener />)).toThrow(/MyAccountProvider/);
  });
});

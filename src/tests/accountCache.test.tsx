// The signed-in user's cached data (lib/tanstack-query/accountQueries, QueryProvider): the onboarding gate on
// every page reads one cached profile, and signing out or into another account drops it.
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingGate } from "@/features/auth/components/OnboardingGate";
import QueryProvider from "@/app/providers";
import { accountKeys } from "@/lib/tanstack-query/accountQueries";
import { adminKeys } from "@/lib/tanstack-query/adminQueries";
import { makeQueryClient } from "@/lib/tanstack-query/publicQueries";

const clerk = vi.hoisted(() => ({ userId: "user_1" as string | null }));
const fetchProfileIfExists = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => {
  const getToken = async () => "tok";
  return {
    useAuth: () => ({ isLoaded: true, userId: clerk.userId, getToken }),
    useUser: () => ({
      isLoaded: true,
      isSignedIn: !!clerk.userId,
      user: clerk.userId ? { id: clerk.userId, publicMetadata: {} } : null,
    }),
  };
});
vi.mock("@/lib/router", () => ({ useNavigate: () => navigate }));
vi.mock("@/features/profile/api/userService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/profile/api/userService")>()),
  fetchProfileIfExists,
}));

describe("the signed-in user's cache", () => {
  beforeEach(() => {
    clerk.userId = "user_1";
    navigate.mockReset();
    fetchProfileIfExists.mockReset().mockResolvedValue({ id: 1, role: "customer", onboarded: true });
  });

  it("checks the profile once, however many pages the gate is on", async () => {
    const client = makeQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    const first = render(<OnboardingGate><p>Services page</p></OnboardingGate>, { wrapper });
    expect(await screen.findByText("Services page")).toBeInTheDocument();
    first.unmount();

    // The next page shows at once, from the cached profile
    render(<OnboardingGate><p>Booking page</p></OnboardingGate>, { wrapper });
    expect(screen.getByText("Booking page")).toBeInTheDocument();
    expect(fetchProfileIfExists).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("sends a client without a profile to onboarding", async () => {
    fetchProfileIfExists.mockResolvedValue(null);
    const client = makeQueryClient();
    render(
      <QueryClientProvider client={client}>
        <OnboardingGate><p>Booking page</p></OnboardingGate>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/onboarding", { replace: true }));
    expect(screen.queryByText("Booking page")).toBeNull();
  });

  it("drops the previous user's account and admin data when the user changes", async () => {
    let client: ReturnType<typeof useQueryClient> | null = null;
    const Grab = () => {
      client = useQueryClient();
      return null;
    };
    const view = render(<QueryProvider><Grab /></QueryProvider>);
    await waitFor(() => expect(client).not.toBeNull());
    client!.setQueryData(accountKeys.profile("user_1"), { id: 1 });
    client!.setQueryData(adminKeys.leads(), ["user_9"]);
    client!.setQueryData(["public", "services"], [{ id: 1 }]);

    clerk.userId = null; // signed out
    view.rerender(<QueryProvider><Grab /></QueryProvider>);

    await waitFor(() => expect(client!.getQueryData(accountKeys.profile("user_1"))).toBeUndefined());
    expect(client!.getQueryData(adminKeys.leads())).toBeUndefined();
    // What anyone may see stays
    expect(client!.getQueryData(["public", "services"])).toEqual([{ id: 1 }]);
  });
});

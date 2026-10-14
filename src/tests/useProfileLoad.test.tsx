import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useProfile } from "@/hooks/useProfile";

const user = { id: "user_1", publicMetadata: {} };
const getToken = async () => "t";
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: true, user }),
  useAuth: () => ({ getToken }),
}));
// Stable values, as the real hooks give: a new one each render would re-run the load effect
const navigate = vi.fn();
const params = [new URLSearchParams()];
vi.mock("@/lib/router", () => ({ useNavigate: () => navigate, useSearchParams: () => params }));
vi.mock("@/components/ui/ToastProvider", () => ({ useToast: () => ({ show: vi.fn() }) }));
vi.mock("@/hooks/usePolling", () => ({ startPolling: () => () => {} }));
const fetchProfile = vi.fn();
vi.mock("@/services/userService", () => ({
  fetchProfile: (...args: unknown[]) => fetchProfile(...args),
  fetchUserAppointments: async () => [],
  isMissingProfile: () => false,
  updateProfile: vi.fn(), redeemUserReward: vi.fn(), cancelAppointment: vi.fn(),
}));

describe("useProfile when the account can't load", () => {
  it("says so, and loads again on retry", async () => {
    fetchProfile.mockRejectedValueOnce(new Error("503"));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loadError).toBe(true));

    fetchProfile.mockResolvedValueOnce({ id: 7, first_name: "Ana", stamps: 2 });
    act(() => result.current.retryLoad());
    await waitFor(() => expect(result.current.dbUser?.first_name).toBe("Ana"));
    expect(result.current.loadError).toBe(false);
  });
});

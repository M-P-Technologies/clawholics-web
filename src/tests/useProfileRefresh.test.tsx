import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useProfile } from "@/hooks/useProfile";
import { ProfileError } from "@/services/userService";

const user = { id: "user_1", publicMetadata: {} };
const getToken = async () => "t";
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: true, user }),
  useAuth: () => ({ getToken }),
}));
const navigate = vi.fn();
const params = [new URLSearchParams()];
vi.mock("@/lib/router", () => ({ useNavigate: () => navigate, useSearchParams: () => params }));
vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show: vi.fn() }) }));
const fetchProfile = vi.fn();
vi.mock("@/services/userService", async (orig) => ({
  ...(await orig<object>()),
  fetchProfileIfExists: (...args: unknown[]) => fetchProfile(...args),
  fetchUserAppointments: async () => [],
}));

let error: ReturnType<typeof vi.spyOn>;
let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  fetchProfile.mockReset();
  error = vi.spyOn(console, "error").mockImplementation(() => {});
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  error.mockRestore();
  warn.mockRestore();
});

const loaded = async () => {
  fetchProfile.mockResolvedValueOnce({ id: 7, first_name: "Ana", stamps: 2 });
  const hook = renderHook(() => useProfile());
  await waitFor(() => expect(hook.result.current.dbUser?.first_name).toBe("Ana"));
  // A refresh of the loaded account (the same refetch the 30-second refresh runs)
  const refresh = async () => {
    hook.result.current.retryLoad();
    await waitFor(() => expect(fetchProfile).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { ...hook, refresh };
};

describe("useProfile's background refresh", () => {
  it("keeps the account on screen and only warns when the server is briefly unavailable", async () => {
    const { result, refresh } = await loaded();
    fetchProfile.mockRejectedValueOnce(new ProfileError(503));
    await refresh();
    expect(result.current.dbUser?.first_name).toBe("Ana");
    expect(result.current.loadError).toBe(false);
    expect(error).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it("treats a dropped connection the same way", async () => {
    const { result, refresh } = await loaded();
    fetchProfile.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await refresh();
    expect(result.current.loadError).toBe(false);
    expect(error).not.toHaveBeenCalled();
  });

  it("still reports an unexpected refresh failure as an error", async () => {
    const { refresh } = await loaded();
    fetchProfile.mockRejectedValueOnce(new ProfileError(401));
    await refresh();
    expect(error).toHaveBeenCalled();
  });

  it("still reports a first load that fails, and shows the error state", async () => {
    fetchProfile.mockRejectedValueOnce(new ProfileError(503));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loadError).toBe(true));
    expect(error).toHaveBeenCalled();
  });
});

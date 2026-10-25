import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOnboarding } from "@/hooks/useOnboarding";

const show = vi.fn();
const navigate = vi.fn();
const fetchProfile = vi.fn();
const updateProfile = vi.fn();

vi.mock("@clerk/nextjs", () => {
  // Stable references, like Clerk's: the hook's effect depends on both
  const user = { id: "user_1", firstName: "Ana", lastName: "Cruz", publicMetadata: {}, primaryEmailAddress: null };
  const getToken = async () => "tok";
  return {
    useUser: () => ({ user, isLoaded: true }),
    useAuth: () => ({ getToken }),
  };
});
vi.mock("@/lib/router", () => ({ useNavigate: () => navigate }));
vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show }) }));
const { ProfileError } = await vi.importActual<typeof import("@/services/userService")>("@/services/userService");
vi.mock("@/services/userService", async () => ({
  ...(await vi.importActual<typeof import("@/services/userService")>("@/services/userService")),
  // The profile query (lib/accountQueries) asks through fetchProfileIfExists: a 404 is no profile
  fetchProfileIfExists: async (...args: unknown[]) => {
    try {
      return await fetchProfile(...args);
    } catch (err) {
      if (err instanceof ProfileError && err.status === 404) return null;
      throw err;
    }
  },
  updateProfile: (...args: unknown[]) => updateProfile(...args),
}));

const { ProfileSaveError } = await import("@/services/userService");

// The warning is sent on a timer, once the browser has moved off /onboarding
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 10)));
const warnings = () => show.mock.calls.filter(([kind, title]) => kind === "info" && /profile/i.test(title));

describe("leaving /onboarding without saving", () => {
  beforeEach(() => {
    show.mockReset();
    navigate.mockReset();
    updateProfile.mockReset();
    fetchProfile.mockReset();
    // A new account has no profile yet
    fetchProfile.mockRejectedValue(new ProfileError(404));
    window.history.pushState({}, "", "/onboarding");
  });
  afterEach(() => window.history.pushState({}, "", "/"));

  it("reminds the user that the profile is still incomplete", async () => {
    const { result, unmount } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    window.history.pushState({}, "", "/services");
    unmount();
    await settle();

    expect(warnings()).toHaveLength(1);
  });

  it("stays quiet when React only remounts the page in development", async () => {
    const { result, unmount } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    unmount(); // still on /onboarding
    await settle();

    expect(warnings()).toHaveLength(0);
  });

  it("stays quiet when the user is sent away before the form was ever shown", async () => {
    // A finished profile is redirected to the client app, so there is nothing to remind them about
    fetchProfile.mockResolvedValue({ role: "customer", onboarded: true });
    const { unmount } = renderHook(() => useOnboarding());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/my", { replace: true }));

    window.history.pushState({}, "", "/my");
    unmount();
    await settle();

    expect(warnings()).toHaveLength(0);
  });

  it("stays quiet after the profile was saved", async () => {
    updateProfile.mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    act(() => result.current.setFormData({ firstName: "Ana", lastName: "Cruz", phone: "09171234567", dob: "01/02/1995", gender: "female", instagram: "", facebook: "" }));
    await act(async () => {
      await result.current.handleSubmit({ preventDefault() {} } as React.SyntheticEvent<HTMLFormElement>);
    });
    expect(updateProfile).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/my");

    window.history.pushState({}, "", "/my");
    unmount();
    await settle();

    expect(warnings()).toHaveLength(0);
  });

  it("saves the optional Instagram and Facebook handles with the profile", async () => {
    updateProfile.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    act(() => result.current.setFormData({ firstName: "Ana", lastName: "Cruz", phone: "09171234567", dob: "01/02/1995", gender: "female", instagram: " @ana.nails ", facebook: "Ana Cruz" }));
    await act(async () => {
      await result.current.handleSubmit({ preventDefault() {} } as React.SyntheticEvent<HTMLFormElement>);
    });

    expect(updateProfile).toHaveBeenCalledWith("user_1", expect.objectContaining({ instagram_handle: "ana.nails", facebook_handle: "Ana Cruz" }), "tok");
  });

  it("leaves the handles out when they're blank, so a saved one isn't cleared", async () => {
    updateProfile.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    act(() => result.current.setFormData({ firstName: "Ana", lastName: "Cruz", phone: "09171234567", dob: "01/02/1995", gender: "female", instagram: "  ", facebook: "" }));
    await act(async () => {
      await result.current.handleSubmit({ preventDefault() {} } as React.SyntheticEvent<HTMLFormElement>);
    });

    const sent = updateProfile.mock.calls[0][1];
    expect(sent).not.toHaveProperty("instagram_handle");
    expect(sent).not.toHaveProperty("facebook_handle");
  });

  it("tells the user when the email is already taken, instead of blaming the connection", async () => {
    updateProfile.mockRejectedValue(new ProfileSaveError(409, "This email is already used by another account."));
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    act(() => result.current.setFormData({ firstName: "Ana", lastName: "Cruz", phone: "09171234567", dob: "01/02/1995", gender: "female", instagram: "", facebook: "" }));
    await act(async () => {
      await result.current.handleSubmit({ preventDefault() {} } as React.SyntheticEvent<HTMLFormElement>);
    });

    expect(result.current.submitError).toMatch(/already used by another account/i);
    expect(result.current.submitError).not.toMatch(/connection/i);
    expect(navigate).not.toHaveBeenCalledWith("/my");
  });
});

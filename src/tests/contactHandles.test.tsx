import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useContactHandles } from "@/hooks/client/useContactHandles";
import { accountKeys } from "@/lib/accountQueries";

const fetchProfile = vi.fn();
const updateContactDetails = vi.fn();

vi.mock("@clerk/nextjs", () => {
  const user = { id: "user_1" };
  const getToken = async () => "tok";
  return { useUser: () => ({ user }), useAuth: () => ({ getToken }) };
});
vi.mock("@/services/userService", async () => ({
  ...(await vi.importActual<typeof import("@/services/userService")>("@/services/userService")),
  fetchProfileIfExists: (...args: unknown[]) => fetchProfile(...args),
  updateContactDetails: (...args: unknown[]) => updateContactDetails(...args),
}));

let queryClient: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
const type = (field: { onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }, value: string) =>
  act(() => field.onChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>));

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  fetchProfile.mockReset();
  updateContactDetails.mockReset().mockResolvedValue(undefined);
});

describe("Instagram/Facebook while booking", () => {
  it("asks only for the handles the profile doesn't have", async () => {
    fetchProfile.mockResolvedValue({ id: 1, instagram_handle: "ana.nails", facebook_handle: null });
    const { result } = renderHook(() => useContactHandles(), { wrapper });
    await waitFor(() => expect(result.current.contactFields).toHaveLength(1));
    expect(result.current.contactFields[0].name).toBe("facebook_handle");
  });

  it("asks nothing when both are on the profile", async () => {
    fetchProfile.mockResolvedValue({ id: 1, instagram_handle: "ana.nails", facebook_handle: "Ana Cruz" });
    const { result } = renderHook(() => useContactHandles(), { wrapper });
    await waitFor(() => expect(fetchProfile).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current.contactFields).toHaveLength(0);
  });

  it("saves a handle to the profile when the client leaves the field, and keeps showing it", async () => {
    fetchProfile.mockResolvedValue({ id: 1, instagram_handle: null, facebook_handle: null });
    const { result } = renderHook(() => useContactHandles(), { wrapper });
    await waitFor(() => expect(result.current.contactFields).toHaveLength(2));

    type(result.current.contactFields[0], " @ana.nails ");
    await act(async () => result.current.contactFields[0].onBlur());

    expect(updateContactDetails).toHaveBeenCalledWith({ instagram_handle: "ana.nails" }, "tok");
    expect(result.current.contactFields[0].status).toBe("saved");
    expect(queryClient.getQueryData<{ instagram_handle: string }>(accountKeys.profile("user_1"))?.instagram_handle).toBe("ana.nails");
    // Saved, but still on screen so the client can see it
    expect(result.current.contactFields).toHaveLength(2);

    // Leaving it again unchanged doesn't save twice
    await act(async () => result.current.contactFields[0].onBlur());
    expect(updateContactDetails).toHaveBeenCalledTimes(1);
  });

  it("saves on its own a moment after the client stops typing", async () => {
    fetchProfile.mockResolvedValue({ id: 1, instagram_handle: null, facebook_handle: null });
    const { result } = renderHook(() => useContactHandles(), { wrapper });
    await waitFor(() => expect(result.current.contactFields).toHaveLength(2));

    vi.useFakeTimers();
    try {
      type(result.current.contactFields[1], "Ana Cruz");
      expect(updateContactDetails).not.toHaveBeenCalled();
      await act(async () => vi.advanceTimersByTime(1000));
    } finally {
      vi.useRealTimers();
    }
    expect(updateContactDetails).toHaveBeenCalledWith({ facebook_handle: "Ana Cruz" }, "tok");
  });

  it("sends a field's saves one at a time, so the newest value is the one kept", async () => {
    fetchProfile.mockResolvedValue({ id: 1, instagram_handle: null, facebook_handle: null });
    let finishFirst!: () => void;
    updateContactDetails.mockImplementationOnce(() => new Promise<void>((resolve) => (finishFirst = resolve)));
    const { result } = renderHook(() => useContactHandles(), { wrapper });
    await waitFor(() => expect(result.current.contactFields).toHaveLength(2));

    type(result.current.contactFields[0], "maxnails");
    await act(async () => void result.current.contactFields[0].onBlur());
    type(result.current.contactFields[0], "maxnails_ph");
    let second!: Promise<void>;
    act(() => void (second = result.current.contactFields[0].onBlur() as unknown as Promise<void>));
    // The newer save waits for the first to finish
    expect(updateContactDetails).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishFirst();
      await second;
    });
    expect(updateContactDetails).toHaveBeenLastCalledWith({ instagram_handle: "maxnails_ph" }, "tok");
    expect(result.current.contactFields[0].status).toBe("saved");
    expect(queryClient.getQueryData<{ instagram_handle: string }>(accountKeys.profile("user_1"))?.instagram_handle).toBe("maxnails_ph");
  });

  it("says so when the save fails", async () => {
    fetchProfile.mockResolvedValue({ id: 1, instagram_handle: null, facebook_handle: null });
    updateContactDetails.mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useContactHandles(), { wrapper });
    await waitFor(() => expect(result.current.contactFields).toHaveLength(2));

    type(result.current.contactFields[0], "ana.nails");
    await act(async () => result.current.contactFields[0].onBlur());
    expect(result.current.contactFields[0].status).toBe("error");
  });
});

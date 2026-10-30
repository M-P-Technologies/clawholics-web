import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useContactHandles } from "@/hooks/client/useContactHandles";
import { accountKeys } from "@/lib/accountQueries";

const fetchProfile = vi.fn();
const updateContactDetails = vi.fn();

const getToken = async () => "tok";
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

const NONE = { id: 1, phone: "09171234567", instagram_handle: null, facebook_handle: null, tiktok_handle: null, preferred_contact_method: null };

// The hook with a profile loaded and its primary contact already chosen
async function setup(profile: object, chosen?: string) {
  fetchProfile.mockResolvedValue(profile);
  const hook = renderHook(() => useContactHandles("user_1", getToken), { wrapper });
  await waitFor(() => expect(hook.result.current.contact.options.length).toBeGreaterThan(0));
  if (chosen) await act(async () => hook.result.current.contact.choose(chosen));
  return hook;
}

describe("the primary contact while booking", () => {
  it("offers call and text by the phone number, and a social the profile lacks says so", async () => {
    const { result } = await setup({ ...NONE, instagram_handle: "ana.nails" });
    expect(result.current.contact.options.map((o) => o.label)).toEqual(["Call", "Text message", "Messenger (add yours)", "Instagram", "TikTok (add yours)"]);
  });

  it("leaves call and text out when the profile has no phone number", async () => {
    const { result } = await setup({ ...NONE, phone: "" });
    expect(result.current.contact.options.map((o) => o.value)).toEqual(["messenger", "instagram", "tiktok"]);
  });

  it("asks for no handle until a social without one is chosen, and then only that one", async () => {
    const { result } = await setup(NONE);
    expect(result.current.contactFields).toHaveLength(0);
    expect(result.current.contact.ready).toBe(false);
    await act(async () => result.current.contact.choose("tiktok"));
    expect(result.current.contactFields.map((f) => f.name)).toEqual(["tiktok_handle"]);
    // Nothing is saved yet: the choice goes with its handle
    expect(updateContactDetails).not.toHaveBeenCalled();
    expect(result.current.contact.ready).toBe(false);
    expect(result.current.contact.missing).toMatch(/TikTok/);
  });

  it("saves call or text at once, and asks for nothing else", async () => {
    const { result } = await setup(NONE, "call");
    expect(updateContactDetails).toHaveBeenCalledWith({ preferred_contact_method: "call" }, "tok");
    expect(result.current.contact.status).toBe("saved");
    expect(result.current.contact.ready).toBe(true);
    expect(result.current.contactFields).toHaveLength(0);
    expect(queryClient.getQueryData<{ preferred_contact_method: string }>(accountKeys.profile("user_1"))?.preferred_contact_method).toBe("call");
  });

  it("saves a social the profile already has at once, without asking for its handle", async () => {
    const { result } = await setup({ ...NONE, instagram_handle: "ana.nails" }, "instagram");
    expect(updateContactDetails).toHaveBeenCalledWith({ preferred_contact_method: "instagram" }, "tok");
    expect(result.current.contactFields).toHaveLength(0);
    expect(result.current.contact.ready).toBe(true);
  });

  it("starts from the preference already on the profile", async () => {
    const { result } = await setup({ ...NONE, preferred_contact_method: "sms" });
    expect(result.current.contact.value).toBe("sms");
    expect(result.current.contact.ready).toBe(true);
  });

  it("doesn't hold the booking up when the profile couldn't be read", async () => {
    fetchProfile.mockResolvedValue(null);
    const { result } = renderHook(() => useContactHandles("user_1", getToken), { wrapper });
    await waitFor(() => expect(fetchProfile).toHaveBeenCalled());
    expect(result.current.contact.ready).toBe(true);
  });

  it("says so when the choice can't be saved", async () => {
    updateContactDetails.mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = await setup(NONE, "sms");
    expect(result.current.contact.status).toBe("error");
  });
});

describe("the handle for the chosen social", () => {
  it("saves with the choice when the client leaves the field, and keeps showing it", async () => {
    const { result } = await setup(NONE, "instagram");
    type(result.current.contactFields[0], " @ana.nails ");
    await act(async () => result.current.contactFields[0].onBlur());

    expect(updateContactDetails).toHaveBeenCalledWith({ instagram_handle: "ana.nails", preferred_contact_method: "instagram" }, "tok");
    expect(result.current.contactFields[0].status).toBe("saved");
    const cached = queryClient.getQueryData<{ instagram_handle: string; preferred_contact_method: string }>(accountKeys.profile("user_1"));
    expect(cached?.instagram_handle).toBe("ana.nails");
    expect(cached?.preferred_contact_method).toBe("instagram");
    expect(result.current.contact.ready).toBe(true);
    // Saved, but still on screen so the client can see it
    expect(result.current.contactFields).toHaveLength(1);

    // Leaving it again unchanged doesn't save twice
    await act(async () => result.current.contactFields[0].onBlur());
    expect(updateContactDetails).toHaveBeenCalledTimes(1);
  });

  it("saves on its own a moment after the client stops typing", async () => {
    const { result } = await setup(NONE, "messenger");
    vi.useFakeTimers();
    try {
      type(result.current.contactFields[0], "Ana Cruz");
      expect(updateContactDetails).not.toHaveBeenCalled();
      await act(async () => vi.advanceTimersByTime(1000));
    } finally {
      vi.useRealTimers();
    }
    expect(updateContactDetails).toHaveBeenCalledWith({ facebook_handle: "Ana Cruz", preferred_contact_method: "messenger" }, "tok");
  });

  it("sends a field's saves one at a time, so the newest value is the one kept", async () => {
    const { result } = await setup(NONE, "instagram");
    let finishFirst!: () => void;
    updateContactDetails.mockImplementationOnce(() => new Promise<void>((resolve) => (finishFirst = resolve)));

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
    expect(updateContactDetails).toHaveBeenLastCalledWith({ instagram_handle: "maxnails_ph", preferred_contact_method: "instagram" }, "tok");
    expect(result.current.contactFields[0].status).toBe("saved");
    expect(queryClient.getQueryData<{ instagram_handle: string }>(accountKeys.profile("user_1"))?.instagram_handle).toBe("maxnails_ph");
  });

  it("says so when the save fails", async () => {
    const { result } = await setup(NONE, "instagram");
    updateContactDetails.mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    type(result.current.contactFields[0], "ana.nails");
    await act(async () => result.current.contactFields[0].onBlur());
    expect(result.current.contactFields[0].status).toBe("error");
  });

  it("saves a TikTok username without its leading @", async () => {
    const { result } = await setup(NONE, "tiktok");
    type(result.current.contactFields[0], " @ana.tok ");
    await act(async () => result.current.contactFields[0].onBlur());
    expect(updateContactDetails).toHaveBeenCalledWith({ tiktok_handle: "ana.tok", preferred_contact_method: "tiktok" }, "tok");
  });
});

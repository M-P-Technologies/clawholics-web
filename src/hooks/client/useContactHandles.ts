import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { accountKeys, accountQueries, type GetToken } from "@/lib/accountQueries";
import { updateContactDetails, type UserProfile } from "@/services/userService";
import { SOCIAL_HANDLE_FIELDS, SOCIAL_HANDLE_MAX_LENGTH, cleanHandle as clean, type SocialHandle as Handle } from "@/data/profile";

type SaveStatus = "idle" | "saving" | "saved" | "error";

// Saved this long after the client stops typing (or at once when they leave the field)
const SAVE_DELAY_MS = 1000;

const emptyValues = Object.fromEntries(SOCIAL_HANDLE_FIELDS.map(({ key }) => [key, ""])) as Record<Handle, string>;

// The booking step's Instagram/Facebook/TikTok fields: asked only of a client whose profile has none,
// and saved to the profile as they're typed, so the salon can reach them about the visit. Takes
// the signed-in user from useBooking, which already has them.
export function useContactHandles(clerkId: string | undefined, getToken: GetToken) {
  const queryClient = useQueryClient();
  const profile = useQuery({ ...accountQueries.profile(clerkId ?? "", getToken), enabled: !!clerkId }).data;

  // Which fields to ask, decided once the profile is in: a field saved here stays on screen
  const [asked, setAsked] = useState<Handle[] | null>(null);
  if (asked === null && profile) setAsked(SOCIAL_HANDLE_FIELDS.filter(({ key }) => !profile[key]).map(({ key }) => key));

  const [values, setValues] = useState<Record<Handle, string>>(emptyValues);
  const [status, setStatus] = useState<Record<Handle, SaveStatus>>(() => Object.fromEntries(SOCIAL_HANDLE_FIELDS.map(({ key }) => [key, "idle"])) as Record<Handle, SaveStatus>);
  const latest = useRef(values);
  const savedValue = useRef<Record<Handle, string>>(emptyValues);
  const timers = useRef<Partial<Record<Handle, ReturnType<typeof setTimeout>>>>({});

  // One save at a time per field, so an older value can never land after a newer one
  const queue = useRef<Partial<Record<Handle, Promise<void>>>>({});

  const send = async (key: Handle) => {
    const value = clean(key, latest.current[key]);
    // Nothing new; an emptied field is left as it was saved rather than cleared mid-booking
    if (!value || value === savedValue.current[key] || !clerkId) return;
    // The tick or the error is shown only while the field still holds what was sent
    const stillShown = () => clean(key, latest.current[key]) === value;
    setStatus((s) => ({ ...s, [key]: "saving" }));
    try {
      await updateContactDetails({ [key]: value }, await getToken());
      savedValue.current[key] = value;
      // The profile, its Edit details sheet and the client page read the cached copy
      queryClient.setQueryData(accountKeys.profile(clerkId), (old: UserProfile | null | undefined) => (old ? { ...old, [key]: value } : old));
      if (stillShown()) setStatus((s) => ({ ...s, [key]: "saved" }));
    } catch (error) {
      console.error("Failed to save contact details", error);
      if (stillShown()) setStatus((s) => ({ ...s, [key]: "error" }));
    }
  };

  const save = (key: Handle) => {
    clearTimeout(timers.current[key]);
    delete timers.current[key];
    const next = (queue.current[key] ?? Promise.resolve()).then(() => send(key));
    queue.current[key] = next;
    return next;
  };

  // Leaving the page (e.g. Continue to payment) still saves what was typed, with the latest save
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const key of Object.keys(pending) as Handle[]) void saveRef.current(key);
    };
  }, []);

  const handleChange = (key: Handle, value: string) => {
    latest.current = { ...latest.current, [key]: value };
    setValues(latest.current);
    setStatus((s) => ({ ...s, [key]: "idle" }));
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => void save(key), SAVE_DELAY_MS);
  };

  const contactFields = SOCIAL_HANDLE_FIELDS.filter(({ key }) => asked?.includes(key)).map(({ key, shortLabel, placeholder }) => ({
    id: `booking-${key}`,
    name: key,
    label: shortLabel,
    placeholder,
    type: "text" as const,
    autoComplete: "off",
    maxLength: SOCIAL_HANDLE_MAX_LENGTH,
    value: values[key],
    status: status[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleChange(key, e.target.value),
    onBlur: () => void save(key),
  }));

  return { contactFields };
}

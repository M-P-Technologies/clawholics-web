import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { accountKeys, accountQueries, type GetToken } from "@/lib/accountQueries";
import { updateContactDetails, type UserProfile } from "@/services/userService";
import { CONTACT_METHOD_HANDLE, CONTACT_METHOD_OPTIONS, SOCIAL_HANDLE_FIELDS, SOCIAL_HANDLE_MAX_LENGTH, cleanHandle as clean, type SocialHandle as Handle } from "@/data/profile";

type SaveStatus = "idle" | "saving" | "saved" | "error";

// Saved this long after the client stops typing (or at once when they leave the field)
const SAVE_DELAY_MS = 1000;

const emptyValues = Object.fromEntries(SOCIAL_HANDLE_FIELDS.map(({ key }) => [key, ""])) as Record<Handle, string>;

// The booking step's "How can we reach you?": the client picks their primary contact from the ways the
// salon could use (call and text by their phone number, and Messenger, Instagram or TikTok by a handle).
// Picking a social they haven't saved yet asks for just that handle, saved as it's typed together with
// the choice; nobody is asked for an account they don't have. Takes the signed-in user from useBooking,
// which already has them.
export function useContactHandles(clerkId: string | undefined, getToken: GetToken) {
  const queryClient = useQueryClient();
  const profile = useQuery({ ...accountQueries.profile(clerkId ?? "", getToken), enabled: !!clerkId }).data;

  // The handles the profile lacked when it loaded: the one the client picks from them stays on screen
  // after it is saved
  const [lacked, setLacked] = useState<Handle[] | null>(null);
  if (lacked === null && profile) setLacked(SOCIAL_HANDLE_FIELDS.filter(({ key }) => !profile[key]).map(({ key }) => key));
  // The primary contact: what the profile has, until the client picks another
  const [picked, setPicked] = useState<string | null>(null);
  const method = picked ?? profile?.preferred_contact_method ?? "";
  const methodRef = useRef(method);
  useEffect(() => {
    methodRef.current = method;
  }, [method]);
  const [methodStatus, setMethodStatus] = useState<SaveStatus>("idle");

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
      // The choice goes with its handle, so the preference never names a contact the profile lacks
      const preference = CONTACT_METHOD_HANDLE[methodRef.current] === key ? { preferred_contact_method: methodRef.current } : {};
      await updateContactDetails({ [key]: value, ...preference }, await getToken());
      savedValue.current[key] = value;
      // The profile, its Edit details sheet and the client page read the cached copy
      queryClient.setQueryData(accountKeys.profile(clerkId), (old: UserProfile | null | undefined) => (old ? { ...old, [key]: value, ...preference } : old));
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

  // The handle the chosen method needs, asked only when the profile lacked it
  const methodHandle = CONTACT_METHOD_HANDLE[method];
  const needsHandle = methodHandle !== undefined && !profile?.[methodHandle];
  const askedHandle = methodHandle !== undefined && lacked?.includes(methodHandle) ? methodHandle : null;

  const contactFields = SOCIAL_HANDLE_FIELDS.filter(({ key }) => key === askedHandle).map(({ key, shortLabel, placeholder }) => ({
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

  // Every way to be reached that the salon uses; a social the profile has no handle for says so, and
  // choosing it asks for the handle. Call and text need the phone number the profile has.
  const options = (profile ? CONTACT_METHOD_OPTIONS : []).filter(({ value }) => value && (CONTACT_METHOD_HANDLE[value] !== undefined || profile?.phone)).map(({ value, label }) => {
    const handle = CONTACT_METHOD_HANDLE[value];
    return { value, label: handle && !profile?.[handle] ? `${label} (add yours)` : label };
  });

  const choose = async (value: string) => {
    setPicked(value);
    methodRef.current = value;
    const handle = CONTACT_METHOD_HANDLE[value];
    // A social with no handle yet is saved together with the handle, once it's typed
    if (!clerkId || (handle && !profile?.[handle])) return setMethodStatus("idle");
    setMethodStatus("saving");
    try {
      await updateContactDetails({ preferred_contact_method: value }, await getToken());
      queryClient.setQueryData(accountKeys.profile(clerkId), (old: UserProfile | null | undefined) => (old ? { ...old, preferred_contact_method: value } : old));
      if (methodRef.current === value) setMethodStatus("saved");
    } catch (error) {
      console.error("Failed to save the preferred contact", error);
      if (methodRef.current === value) setMethodStatus("error");
    }
  };

  const contact = {
    options,
    value: method,
    status: methodStatus,
    choose,
    /** Asked once the profile is in; not blocking when it couldn't be read */
    ready: !profile || (method !== "" && !needsHandle),
    /** What's missing, for the message when they try to continue */
    missing: method === "" ? "Choose the way you'd like the salon to reach you about your visit." : `Add your ${SOCIAL_HANDLE_FIELDS.find(({ key }) => key === methodHandle)?.shortLabel ?? "contact"} so the salon can reach you there, or choose another way.`,
  };

  return { contactFields, contact };
}

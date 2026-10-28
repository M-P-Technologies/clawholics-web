
export type SocialHandle = "instagram_handle" | "facebook_handle" | "tiktok_handle";

// The client's Instagram, Facebook and TikTok, asked for in Edit details, at onboarding and on the
// booking step (when the profile has none); every one of those builds its fields from these.
export const SOCIAL_HANDLE_FIELDS: { key: SocialHandle; label: string; shortLabel: string; placeholder: string }[] = [
  { key: "instagram_handle", label: "Instagram username", shortLabel: "Instagram", placeholder: "yourname" },
  { key: "facebook_handle", label: "Facebook name or profile link", shortLabel: "Facebook", placeholder: "Your name or profile link" },
  { key: "tiktok_handle", label: "TikTok username", shortLabel: "TikTok", placeholder: "yourname" },
];

/** The longest handle the server keeps (parseContactFields) */
export const SOCIAL_HANDLE_MAX_LENGTH = 100;

/** A handle as it's saved: trimmed, and an Instagram name without its leading "@" */
export const cleanHandle = (key: SocialHandle, value: string) => {
  const trimmed = value.trim();
  return key === "instagram_handle" || key === "tiktok_handle" ? trimmed.replace(/^@+/, "") : trimmed;
};

// The profile details shown (and edited) in the "My Details" tab, in the order they appear.
// Gender is a dropdown, so it is written out on the page.
interface ProfileFieldConfig {
  id: string;
  /** Key in the profile */
  key: "first_name" | "last_name" | "email" | "phone" | "dob" | "alt_phone" | "instagram_handle" | "facebook_handle" | "tiktok_handle";
  label: string;
  type: "text" | "email" | "tel" | "date";
  autoComplete: string;
  /** Cannot be changed here (the email comes from your sign-in) */
  locked?: boolean;
}

export const PROFILE_FIELDS: ProfileFieldConfig[] = [
  { id: "first_name", key: "first_name", label: "First Name:", type: "text", autoComplete: "given-name" },
  { id: "last_name", key: "last_name", label: "Last Name:", type: "text", autoComplete: "family-name" },
  { id: "email", key: "email", label: "Email Address:", type: "email", autoComplete: "email", locked: true },
  { id: "phone", key: "phone", label: "Phone Number:", type: "text", autoComplete: "tel" },
  // Locked once set (useProfile): the birthday voucher follows it
  { id: "dob", key: "dob", label: "Date of Birth:", type: "date", autoComplete: "bday" },
  // Optional: more ways for the salon to reach the client before an appointment
  { id: "alt_phone", key: "alt_phone", label: "Other Phone Number (optional):", type: "tel", autoComplete: "off" },
  ...SOCIAL_HANDLE_FIELDS.map(({ key, label }) => ({ id: key, key, label: `${label} (optional):`, type: "text" as const, autoComplete: "off" })),
];

/** How a client prefers to be reached (the values the API accepts); "" is no preference */
export const CONTACT_METHOD_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "call", label: "Call" },
  { value: "sms", label: "Text message" },
  { value: "messenger", label: "Messenger" },
  { value: "instagram", label: "Instagram" },
];

export const contactMethodLabel = (value?: string | null) => CONTACT_METHOD_OPTIONS.find((option) => option.value && option.value === value)?.label ?? "";

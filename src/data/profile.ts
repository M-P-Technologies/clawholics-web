
// The profile details shown (and edited) in the "My Details" tab, in the order they appear.
// Gender is a dropdown, so it is written out on the page.
export interface ProfileFieldConfig {
  id: string;
  /** Key in the profile */
  key: "first_name" | "last_name" | "email" | "phone" | "dob" | "alt_phone" | "instagram_handle" | "facebook_handle";
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
  { id: "instagram_handle", key: "instagram_handle", label: "Instagram Username (optional):", type: "text", autoComplete: "off" },
  { id: "facebook_handle", key: "facebook_handle", label: "Facebook Name (optional):", type: "text", autoComplete: "off" },
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

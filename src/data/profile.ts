
// The profile details shown (and edited) in the "My Details" tab, in the order they appear.
// Gender is a dropdown, so it is written out on the page.
export interface ProfileFieldConfig {
  id: string;
  /** Key in the profile */
  key: "first_name" | "last_name" | "email" | "phone" | "dob";
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
  { id: "dob", key: "dob", label: "Date of Birth:", type: "date", autoComplete: "bday" },
];

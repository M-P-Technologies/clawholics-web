import type { OnboardingFieldConfig } from "./onboarding";

// The plain text inputs of the contact form, in the order they appear. The message box under
// them is a textarea with its own character counter, so it is written out on the page.
type ContactFieldConfig = OnboardingFieldConfig;

export const CONTACT_FIELDS: ContactFieldConfig[] = [
  { id: "name", name: "name", label: "Name", type: "text", autoComplete: "name", required: true },
  { id: "email", name: "email", label: "Email Address", type: "email", autoComplete: "email", required: true },
  { id: "mobile", name: "mobile", label: "Mobile Number", type: "tel", autoComplete: "tel" },
];

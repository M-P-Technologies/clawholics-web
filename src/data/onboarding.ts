// The plain text inputs of the onboarding form, in the order they appear. The values, change
// handlers and errors are added by useOnboarding.
export interface OnboardingFieldConfig {
  id: string;
  name: string;
  label: string;
  type: "text" | "email" | "tel";
  autoComplete: string;
  required?: boolean;
  maxLength?: number;
}

// Shown side by side in one row
export const ONBOARDING_NAME_FIELDS: OnboardingFieldConfig[] = [
  { id: "firstName", name: "firstName", label: "First name", type: "text", autoComplete: "given-name", required: true },
  { id: "lastName", name: "lastName", label: "Last name", type: "text", autoComplete: "family-name", required: true },
];

// Shown one per row, below the names
export const ONBOARDING_CONTACT_FIELDS: OnboardingFieldConfig[] = [
  { id: "email", name: "email", label: "Email address", type: "email", autoComplete: "email" },
  { id: "phone", name: "phone", label: "Phone number", type: "tel", autoComplete: "tel", required: true, maxLength: 15 },
];

import type { ChangeEvent, ReactNode } from "react";
import clsx from "clsx";
import { errorTextClass, inputClass, labelClass } from "./styles";

interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "date";
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  max?: string;
  value: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  /**
   * When false the field is shown as plain text (`displayValue`) instead of an input, so the same
   * field can be read first and edited after pressing Edit. Defaults to true.
   */
  editing?: boolean;
  displayValue?: ReactNode;
  /** What is wrong, in words the person can act on. Turns the field red. */
  error?: string;
  /** Classes that turn the field red when it has an error. Defaults to the site's red border. */
  errorClass?: string;
}

// A label, its input and its error message, so every form field is built the same way.
const DEFAULT_ERROR_CLASS = "border-danger focus:border-danger focus:ring-danger/30";

export default function FormField({
  id,
  label,
  error,
  errorClass = DEFAULT_ERROR_CLASS,
  editing = true,
  displayValue,
  ...input
}: FormFieldProps) {
  if (!editing) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold uppercase tracking-widest text-gray-red">{label}</p>
        <p className="wrap-break-words opacity-80">{displayValue}</p>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={clsx(inputClass, error && errorClass)}
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className={errorTextClass}>
          {error}
        </p>
      )}
    </div>
  );
}

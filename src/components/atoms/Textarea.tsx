import type { Ref, TextareaHTMLAttributes } from "react";
import clsx from "clsx";
import { field } from "../tokens";

export default function Textarea({ className, ref, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={clsx(field.input, "min-h-20", className)} {...rest} />;
}

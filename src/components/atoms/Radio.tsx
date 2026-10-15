import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

export default function Radio({ className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return <input type="radio" className={clsx("h-4 w-4 shrink-0 cursor-pointer accent-crimson", className)} {...rest} />;
}

import type { ReactNode } from "react";
import clsx from "clsx";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional controls under the title, such as filters or a back link. */
  children?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

// Title block at the top of every inner page. Uses the same display type as
// the landing page headings, one size larger because it is the page's h1.
export default function PageHeader({
  title,
  subtitle,
  children,
  align = "left",
  className,
}: PageHeaderProps) {
  return (
    <div className={clsx("flex flex-col gap-4 md:gap-8", align === "center" && "text-center", className)}>
      <h1 className="font-display text-4xl lg:text-5xl 2xl:text-6xl font-normal uppercase leading-tight tracking-widest text-gray-red">
        {title}
      </h1>
      {subtitle && (
        <p
          className={clsx(
            "max-w-2xl copy-lead",
            align === "center" && "mx-auto",
          )}
        >
          {subtitle}
        </p>
      )}
      {children && <div>{children}</div>}
    </div>
  );
}

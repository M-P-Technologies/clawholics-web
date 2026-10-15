import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import clsx from "clsx";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Controls under the title (page size only), e.g. filters */
  children?: ReactNode;
  align?: "left" | "center";
  /** page: the inner page's h1 · section: a heading with an action on the right · card: a card's title with its icon · label: a small grey label over a group of controls (h3) */
  size?: "page" | "section" | "card" | "label";
  level?: 1 | 2 | 3;
  icon?: LucideIcon;
  /** On the right of a section heading, e.g. a "See all" link */
  action?: ReactNode;
  className?: string;
}

export default function SectionHeader({ title, subtitle, children, align = "left", size = "page", level, icon: Icon, action, className }: SectionHeaderProps) {
  const Tag = (`h${level ?? (size === "page" ? 1 : size === "label" ? 3 : 2)}`) as "h1" | "h2" | "h3";

  if (size === "label") {
    return (
      <div className={clsx("flex items-center justify-between", className)}>
        <Tag className="text-[13px] font-medium text-gray-red/80">{title}</Tag>
      </div>
    );
  }

  if (size === "card") {
    return (
      <Tag className={clsx("flex items-center gap-2.5 font-display text-xl font-normal text-gray-red", className)}>
        {Icon && (
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-crimson-light/40 text-berry">
            <Icon size={18} strokeWidth={1.75} />
          </span>
        )}
        {title}
      </Tag>
    );
  }

  if (size === "section") {
    return (
      <div className={clsx("flex flex-col gap-1", className)}>
        <div className="flex items-baseline justify-between gap-3">
          <Tag className="font-display text-xl font-normal normal-case tracking-normal text-gray-red">{title}</Tag>
          {action && <span className="text-[13px] font-bold text-crimson">{action}</span>}
        </div>
        {subtitle && <p className="text-sm text-gray-red/80">{subtitle}</p>}
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-col gap-4 md:gap-8", align === "center" && "text-center", className)}>
      <Tag className="font-display text-4xl font-normal uppercase leading-tight tracking-widest text-gray-red lg:text-5xl 2xl:text-6xl">{title}</Tag>
      {subtitle && <p className={clsx("max-w-2xl copy-lead", align === "center" && "mx-auto")}>{subtitle}</p>}
      {children && <div>{children}</div>}
    </div>
  );
}

import clsx from "clsx";

const SIZES = [6, 8, 11, 8, 6];

// A short strand of pearls, used as a quiet divider between sections instead of a boxed rule.
// Decoration only.
export default function Pearls({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={clsx("flex items-center justify-center gap-2.5", className)}>
      {SIZES.map((size, i) => (
        <span
          key={i}
          className="rounded-full shadow-[0_1px_2px_rgb(184_58_98/0.25)]"
          style={{ width: size, height: size, background: "radial-gradient(circle at 32% 30%, #ffffff 0%, #fbe3ea 55%, #f3b6c4 100%)" }}
        />
      ))}
    </div>
  );
}

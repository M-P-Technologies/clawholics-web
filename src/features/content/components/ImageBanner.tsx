import type { ReactNode } from "react";

interface ImageBannerProps {
  image: string;
  alt: string;
  /** Where the photo is cropped, for example "50% 45%" keeps the nails in view */
  focus?: string;
  /** Content shown on top of the photo, on a dark layer. Without it the banner is just the photo. */
  children?: ReactNode;
}

// A wide photo across the whole screen. Its negative bottom margin cancels the section's padding,
// so it sits against the footer. Alone it is a 32:9 band; with `children` the photo is darkened
// and the content sits on it, and the banner grows to fit that content.
export default function ImageBanner({ image, alt, focus = "50% 50%", children }: ImageBannerProps) {
  if (!children) {
    return (
      <img
        src={image}
        alt={alt}
        loading="lazy"
        style={{ objectPosition: focus }}
        className="relative left-1/2 -mb-16 aspect-32/9 w-screen max-w-none -translate-x-1/2 object-cover lg:-mb-24"
      />
    );
  }

  return (
    <div className="relative left-1/2 -mb-16 w-screen -translate-x-1/2 overflow-hidden lg:-mb-24">
      <img
        src={image}
        alt={alt}
        loading="lazy"
        style={{ objectPosition: focus }}
        className="absolute inset-0 h-full w-full max-w-none object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gray-red/70" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 md:flex-row md:justify-between md:gap-12 md:px-8 lg:py-24">
        {children}
      </div>
    </div>
  );
}

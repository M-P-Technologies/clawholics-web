// A hidden SVG filter that sharpens whatever it is applied to, with `style={{ filter: SHARPEN_FILTER }}`.
// The studio photos were saved small and are shown larger than they are, which looks soft; this
// makes their edges crisper. It cannot add detail that isn't in the file, so sharper uploads
// are still the real fix. Render it once on a page, next to the photos that use it.
export const SHARPEN_FILTER = "url(#photo-sharpen)";

export default function SharpenFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
      <filter id="photo-sharpen" colorInterpolationFilters="sRGB">
        <feConvolveMatrix order="3" kernelMatrix="0 -0.75 0 -0.75 4 -0.75 0 -0.75 0" preserveAlpha="true" />
      </filter>
    </svg>
  );
}

export interface StripItem {
  id: number;
  image: string;
  name: string;
  price: number | null;
  duration: string;
  /** Where the photo is cropped from, as a percentage of its height (0 top, 100 bottom). */
  focusY: number;
}

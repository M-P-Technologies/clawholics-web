// Chart colors for the milk card surface (#fffbf8). Validated with the dataviz skill's
// validate_palette.js (lightness band, chroma, color-blind separation, contrast): keep the series
// colors in this fixed order and never cycle them; fold anything past five into "Other". Rose
// leads and blue comes last, so the charts read pink unless there really are five series.
export const SERIES_COLORS = ["#b83a62", "#7a5aa6", "#b87a12", "#2f9468", "#2f6fa8"] as const;
export const OTHER_COLOR = "#8a7b76";
// A single series (the bars of one measure)
export const BAR_COLOR = "#c43d68";
// Two stacked series of one hue, light to deep: done is the deep berry, lost the soft rose.
// Validated as an ordinal ramp (single hue, steps clearly apart, the light end clears the surface).
export const STACK_COLORS = { done: "#9b2c52", lost: "#e58aa5" } as const;
// Appointment outcomes: the theme's status colors, always shown beside a text label
export const STATUS_COLORS = {
  confirmed: "#7fa6d6",
  completed: "#6fb58a",
  pending: "#e3a94f",
  cancelled: "#d9576b",
  refunded: "#f3b6c4",
} as const;
// The page surface the charts sit on, and the soft track behind bars and rings
export const SURFACE = "#fffbf8";
export const TRACK = "#fbe6ec";

export const SECTIONS = ["featured", "series", "minisodes", "songs"] as const;

export const CATEGORIES = [
  "adventure",
  "folk",
  "friendship",
  "india",
  "language",
  "learning",
  "maths",
  "music",
  "nature",
  "reading",
  "science",
  "singalong",
  "stories",
  "travel",
  "values",
] as const;

export const LANGUAGES = ["en", "hi"] as const;

export const STATUSES = ["draft", "published"] as const;

export const ARTWORK_SPECS = {
  poster: { aspect: "2:3", targetPx: [600, 900] as const, maxKb: 200 },
  banner: { aspect: "16:9", targetPx: [1280, 720] as const, maxKb: 200 },
  thumbnail: { aspect: "16:9", targetPx: [640, 360] as const, maxKb: 200 },
} as const;

export type ArtworkKind = keyof typeof ARTWORK_SPECS;

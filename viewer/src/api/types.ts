export type ArtworkMap = Partial<Record<"poster" | "banner" | "thumbnail", string>>;

export type CatalogEpisode = {
  content_group: string;
  episode_number: number;
  title: string;
  duration_seconds: number | null;
  languages: string[];
  artwork: ArtworkMap;
};

export type CatalogSeason = {
  season_number: number;
  episodes: CatalogEpisode[];
};

export type CatalogShow = {
  id: number;
  slug: string;
  title: string;
  synopsis: string | null;
  categories: string[];
  artwork: ArtworkMap;
  seasons: CatalogSeason[];
  trailers: CatalogEpisode[];
};

export type CatalogSection = {
  section: string;
  shows: CatalogShow[];
};

export type Catalog = {
  generated_at: string;
  sections: CatalogSection[];
};

export type SearchResultRow = {
  section: string;
  show_id: number;
  show_slug: string;
  show_title: string;
  content_group: string;
  episode_title: string;
  languages: string[];
  duration_seconds: number | null;
  artwork: ArtworkMap;
};

export type SearchResults = {
  items: SearchResultRow[];
  total: number;
};

export type SearchParams = {
  q?: string;
  category?: string;
  language?: string;
  section?: string;
};

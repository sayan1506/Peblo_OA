export type Show = {
  id: number;
  slug: string;
  title: string;
  synopsis: string | null;
  section: string | null;
  categories: string[];
  status: string;
};

export type Season = {
  id: number;
  show_id: number;
  season_number: number;
};

export type Episode = {
  id: number;
  season_id: number;
  episode_number: number;
  title: string;
  content_group: string;
  language: string;
  duration_seconds: number | null;
  status: string;
};

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};

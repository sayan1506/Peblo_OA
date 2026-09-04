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

export type PublishRun = {
  id: number;
  triggered_by: number;
  started_at: string;
  finished_at: string | null;
  outcome: string;
  show_count: number;
  episode_count: number;
  detail: string | null;
};

export type ValidationReportShow = {
  id: number;
  slug: string;
  title: string;
  status: string;
  problems: string[];
};

export type ValidationReportEpisode = {
  id: number;
  content_group: string;
  title: string;
  show_slug: string;
  status: string;
  problems: string[];
};

export type ValidationReport = {
  generated_at: string;
  blocking: {
    shows: ValidationReportShow[];
    episodes: ValidationReportEpisode[];
  };
  seed_issues: Record<string, unknown>[];
  summary: {
    blocking_shows: number;
    blocking_episodes: number;
    seed_issues: number;
  };
};

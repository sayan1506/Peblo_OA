import type { CatalogEpisode } from "../api/types";
import { formatDuration } from "../lib/formatDuration";
import { ArtworkImage } from "./ArtworkImage";
import { LanguageBadges } from "./LanguageBadges";

export function EpisodeRow({ episode }: { episode: CatalogEpisode }) {
  const duration = formatDuration(episode.duration_seconds);
  return (
    <li
      className="list-row"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: "8px 12px",
        margin: "0 -12px",
        borderRadius: 6,
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div style={{ width: 96, flexShrink: 0 }}>
        <ArtworkImage src={episode.artwork.thumbnail} alt={episode.title} aspectRatio="16 / 9" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 4px", fontWeight: 500 }}>
          {episode.episode_number}. {episode.title}
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--color-muted)" }}>
          {duration && <span>{duration}</span>}
          <LanguageBadges languages={episode.languages} />
        </div>
      </div>
    </li>
  );
}

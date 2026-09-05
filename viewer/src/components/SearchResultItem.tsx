import { Link } from "react-router-dom";
import type { SearchResultRow } from "../api/types";
import { formatDuration } from "../lib/formatDuration";
import { ArtworkImage } from "./ArtworkImage";
import { LanguageBadges } from "./LanguageBadges";

export function SearchResultItem({ item }: { item: SearchResultRow }) {
  const duration = formatDuration(item.duration_seconds);
  return (
    <li
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid #eceaee",
      }}
    >
      <Link to={`/shows/${item.show_slug}`} style={{ width: 96, flexShrink: 0 }}>
        <ArtworkImage src={item.artwork.thumbnail} alt={item.episode_title} aspectRatio="16 / 9" />
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 4px", fontWeight: 500 }}>{item.episode_title}</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#6b6375" }}>
          {duration && <span>{duration}</span>}
          <LanguageBadges languages={item.languages} />
        </div>
      </div>
    </li>
  );
}

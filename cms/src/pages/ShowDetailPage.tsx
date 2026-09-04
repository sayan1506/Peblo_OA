import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useEpisodes } from "../api/episodes";
import { useSeasons, useShow } from "../api/shows";
import { ApiError } from "../api/client";
import { EmptyState, ErrorState } from "../components/ListStates";
import type { Episode } from "../api/types";

export function ShowDetailPage() {
  const { showId } = useParams();
  const id = Number(showId);

  const show = useShow(id);
  const seasons = useSeasons(id);
  const episodes = useEpisodes({ show_id: id, page_size: 200 });

  const episodesBySeasonId = useMemo(() => {
    const map = new Map<number, Episode[]>();
    for (const ep of episodes.data?.items ?? []) {
      const list = map.get(ep.season_id) ?? [];
      list.push(ep);
      map.set(ep.season_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.episode_number - b.episode_number);
    return map;
  }, [episodes.data]);

  const isLoading = show.isLoading || seasons.isLoading || episodes.isLoading;
  const firstError = show.error ?? seasons.error ?? episodes.error;
  const retry = () => {
    show.refetch();
    seasons.refetch();
    episodes.refetch();
  };

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px" }}>
      <p>
        <Link to="/shows">&larr; Back to shows</Link>
      </p>

      {firstError ? (
        <ErrorState
          message={firstError instanceof ApiError ? firstError.message : "Failed to load this show."}
          onRetry={retry}
        />
      ) : isLoading ? (
        <SkeletonSeasons />
      ) : (
        <>
          <h1>{show.data?.title}</h1>

          {(seasons.data?.length ?? 0) === 0 ? (
            <EmptyState message="This show has no seasons yet." />
          ) : (
            [...(seasons.data ?? [])]
              .sort((a, b) => a.season_number - b.season_number)
              .map((season) => {
                const seasonEpisodes = episodesBySeasonId.get(season.id) ?? [];
                const label = season.season_number === 0 ? "Trailers" : `Season ${season.season_number}`;
                return (
                  <section key={season.id} style={{ marginBottom: 24 }}>
                    <h2>{label}</h2>
                    {seasonEpisodes.length === 0 ? (
                      <EmptyState message="No episodes in this season yet." />
                    ) : (
                      <ul style={{ listStyle: "none", padding: 0 }}>
                        {seasonEpisodes.map((ep) => (
                          <li
                            key={ep.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "6px 0",
                              borderBottom: "1px solid #f0f0f0",
                            }}
                          >
                            <span>
                              {ep.episode_number}. {ep.title} ({ep.language})
                            </span>
                            <span style={{ color: "#6b6375" }}>{ep.status}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })
          )}
        </>
      )}
    </main>
  );
}

function SkeletonSeasons() {
  return (
    <>
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} style={{ marginBottom: 24 }} aria-hidden="true">
          <div style={{ height: 20, width: 140, background: "#e5e4e7", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 16, width: "80%", background: "#e5e4e7", borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 16, width: "70%", background: "#e5e4e7", borderRadius: 4 }} />
        </div>
      ))}
    </>
  );
}

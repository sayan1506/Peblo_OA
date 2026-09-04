import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useEpisodes } from "../api/episodes";
import { useCreateSeason, useSeasons, useShow } from "../api/shows";
import { ApiError } from "../api/client";
import { EmptyState, ErrorState } from "../components/ListStates";
import { FormError } from "../components/FormError";
import type { Episode } from "../api/types";

export function ShowDetailPage() {
  const { showId } = useParams();
  const id = Number(showId);

  const show = useShow(id);
  const seasons = useSeasons(id);
  const episodes = useEpisodes({ show_id: id, page_size: 200 });
  const createSeason = useCreateSeason(id);
  const [newSeasonNumber, setNewSeasonNumber] = useState<string | null>(null);

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

  const nextSeasonNumber =
    (seasons.data ?? []).length === 0 ? 0 : Math.max(...seasons.data!.map((s) => s.season_number)) + 1;

  async function handleAddSeason(e: FormEvent) {
    e.preventDefault();
    const value = newSeasonNumber ?? String(nextSeasonNumber);
    await createSeason.mutateAsync({ season_number: Number(value) });
    setNewSeasonNumber(null);
  }

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h1>{show.data?.title}</h1>
            <Link to={`/shows/${id}/edit`}>Edit show</Link>
          </div>

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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <h2>{label}</h2>
                      <Link to={`/shows/${id}/seasons/${season.id}/episodes/new`}>Add episode</Link>
                    </div>
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
                            <span>
                              <span style={{ color: "#6b6375", marginRight: 12 }}>{ep.status}</span>
                              <Link to={`/shows/${id}/episodes/${ep.id}/edit`}>Edit</Link>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })
          )}

          <form
            onSubmit={handleAddSeason}
            style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}
          >
            <label htmlFor="new_season_number">Add season</label>
            <input
              id="new_season_number"
              type="number"
              value={newSeasonNumber ?? String(nextSeasonNumber)}
              onChange={(e) => setNewSeasonNumber(e.target.value)}
              style={{ width: 80, padding: 6 }}
            />
            <button type="submit" disabled={createSeason.isPending}>
              {createSeason.isPending ? "Adding…" : "Add season"}
            </button>
          </form>
          {createSeason.error && (
            <FormError
              message={createSeason.error instanceof ApiError ? createSeason.error.message : "Failed to add season."}
            />
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

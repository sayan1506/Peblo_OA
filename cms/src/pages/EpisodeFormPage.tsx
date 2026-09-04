import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { useCreateEpisode, useEpisode, useUpdateEpisode } from "../api/episodes";
import { LANGUAGES, STATUSES } from "../constants/reference";
import { FormError } from "../components/FormError";

export function EpisodeFormPage() {
  const { showId, seasonId, episodeId } = useParams();
  const isEdit = episodeId !== undefined;
  const navigate = useNavigate();

  const existing = useEpisode(isEdit ? Number(episodeId) : NaN);
  const createEpisode = useCreateEpisode(Number(showId), Number(seasonId));
  const updateEpisode = useUpdateEpisode(Number(episodeId));

  const [episodeNumber, setEpisodeNumber] = useState("");
  const [title, setTitle] = useState("");
  const [contentGroup, setContentGroup] = useState("");
  const [language, setLanguage] = useState<string>(LANGUAGES[0]);
  const [durationSeconds, setDurationSeconds] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [hydrated, setHydrated] = useState(false);

  if (isEdit && existing.data && !hydrated) {
    setEpisodeNumber(String(existing.data.episode_number));
    setTitle(existing.data.title);
    setContentGroup(existing.data.content_group);
    setLanguage(existing.data.language);
    setDurationSeconds(existing.data.duration_seconds !== null ? String(existing.data.duration_seconds) : "");
    setStatus(existing.data.status);
    setHydrated(true);
  }

  const mutation = isEdit ? updateEpisode : createEpisode;
  const backTo = isEdit ? `/shows/${showId ?? existing.data?.season_id ?? ""}` : `/shows/${showId}`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      episode_number: Number(episodeNumber),
      title,
      content_group: contentGroup,
      language,
      duration_seconds: durationSeconds ? Number(durationSeconds) : undefined,
      status,
    };
    try {
      if (isEdit) {
        await updateEpisode.mutateAsync(payload);
      } else {
        await createEpisode.mutateAsync(payload);
      }
      navigate(`/shows/${showId}`);
    } catch {
      // ApiError is rendered below via mutation.error
    }
  }

  if (isEdit && existing.isLoading) {
    return (
      <main style={{ maxWidth: 480, margin: "40px auto", padding: "0 16px" }}>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: "40px auto", padding: "0 16px" }}>
      <p>
        <Link to={backTo}>&larr; Back to show</Link>
      </p>
      <h1>{isEdit ? "Edit episode" : "New episode"}</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="episode_number">Episode number</label>
          <input
            id="episode_number"
            type="number"
            required
            value={episodeNumber}
            onChange={(e) => setEpisodeNumber(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="content_group">Content group</label>
          <input
            id="content_group"
            required
            value={contentGroup}
            onChange={(e) => setContentGroup(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
          <p style={{ fontSize: 13, color: "#6b6375", margin: "4px 0 0" }}>
            Episodes sharing a content group are language variants of the same episode.
          </p>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="language">Language</label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="duration_seconds">Duration (seconds)</label>
          <input
            id="duration_seconds"
            type="number"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {mutation.error && (
          <FormError
            message={mutation.error instanceof ApiError ? mutation.error.message : "Failed to save episode."}
          />
        )}

        <button type="submit" disabled={mutation.isPending} style={{ padding: "8px 16px" }}>
          {mutation.isPending ? "Saving…" : "Save"}
        </button>
      </form>
    </main>
  );
}

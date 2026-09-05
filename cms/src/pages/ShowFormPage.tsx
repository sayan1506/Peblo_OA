import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { useCreateShow, useShow, useUpdateShow } from "../api/shows";
import { CATEGORIES, SECTIONS, STATUSES } from "../constants/reference";
import { ArtworkSlot } from "../components/ArtworkSlot";
import { ErrorState } from "../components/ListStates";
import { FormError } from "../components/FormError";
import { MultiSelect } from "../components/MultiSelect";
import { assetUrl } from "../api/assetUrl";

export function ShowFormPage() {
  const { showId } = useParams();
  const isEdit = showId !== undefined;
  const id = Number(showId);
  const navigate = useNavigate();

  const existing = useShow(isEdit ? id : NaN);
  const createShow = useCreateShow();
  const updateShow = useUpdateShow(id);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [section, setSection] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [synopsis, setSynopsis] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [hydrated, setHydrated] = useState(false);

  if (isEdit && existing.data && !hydrated) {
    setTitle(existing.data.title);
    setSlug(existing.data.slug);
    setSection(existing.data.section ?? "");
    setCategories(existing.data.categories);
    setSynopsis(existing.data.synopsis ?? "");
    setStatus(existing.data.status);
    setHydrated(true);
  }

  const mutation = isEdit ? updateShow : createShow;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (isEdit) {
        await updateShow.mutateAsync({
          title,
          synopsis: synopsis || undefined,
          section: section || null,
          categories,
          status,
        });
        navigate(`/shows/${id}`);
      } else {
        const created = await createShow.mutateAsync({
          title,
          slug,
          synopsis: synopsis || undefined,
          section: section || undefined,
          categories,
          status,
        });
        navigate(`/shows/${created.id}`);
      }
    } catch {
      // ApiError is rendered below via mutation.error
    }
  }

  if (isEdit && existing.isLoading) {
    return (
      <main style={{ maxWidth: 600, margin: "40px auto", padding: "0 16px" }}>
        <p>Loading…</p>
      </main>
    );
  }

  if (isEdit && existing.isError) {
    return (
      <main style={{ maxWidth: 600, margin: "40px auto", padding: "0 16px" }}>
        <p>
          <Link to="/shows">&larr; Back</Link>
        </p>
        <ErrorState
          message={existing.error instanceof ApiError ? existing.error.message : "Failed to load this show."}
          onRetry={() => existing.refetch()}
        />
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", padding: "0 16px" }}>
      <p>
        <Link to={isEdit ? `/shows/${id}` : "/shows"}>&larr; Back</Link>
      </p>
      <h1>{isEdit ? "Edit show" : "New show"}</h1>

      <form onSubmit={handleSubmit}>
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
          <label htmlFor="slug">Slug</label>
          <input
            id="slug"
            required
            disabled={isEdit}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
          {isEdit && (
            <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "4px 0 0" }}>
              Slug can't be changed after a show is created.
            </p>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="section">Section</label>
          <select
            id="section"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          >
            <option value="">No section</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <MultiSelect label="Categories" options={CATEGORIES} selected={categories} onChange={setCategories} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="synopsis">Synopsis</label>
          <textarea
            id="synopsis"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={4}
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
          <FormError message={mutation.error instanceof ApiError ? mutation.error.message : "Failed to save show."} />
        )}

        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save"}
        </button>
      </form>

      {isEdit && (
        <section style={{ marginTop: 32 }}>
          <h2>Artwork</h2>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <ArtworkSlot kind="poster" target={{ showId: id }} existingUrl={assetUrl(existing.data?.artwork.poster)} />
            <ArtworkSlot kind="banner" target={{ showId: id }} existingUrl={assetUrl(existing.data?.artwork.banner)} />
            <ArtworkSlot
              kind="thumbnail"
              target={{ showId: id }}
              existingUrl={assetUrl(existing.data?.artwork.thumbnail)}
            />
          </div>
        </section>
      )}
    </main>
  );
}

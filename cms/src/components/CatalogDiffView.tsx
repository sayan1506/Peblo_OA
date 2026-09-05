import type { CatalogDiff } from "../api/types";

function DiffList({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{ fontSize: 14, margin: "0 0 4px" }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {items.map((item, i) => (
          <li key={i} style={{ color }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CatalogDiffView({ diff }: { diff: CatalogDiff }) {
  const isEmpty =
    diff.shows_added.length === 0 &&
    diff.shows_removed.length === 0 &&
    diff.episodes_added.length === 0 &&
    diff.episodes_removed.length === 0 &&
    diff.episodes_changed.length === 0;

  if (isEmpty) {
    return <p style={{ color: "var(--color-muted)" }}>No changes since the last publish.</p>;
  }

  return (
    <div>
      <DiffList
        title={`Shows added (${diff.shows_added.length})`}
        items={diff.shows_added.map((s) => s.title)}
        color="var(--color-success)"
      />
      <DiffList
        title={`Shows removed (${diff.shows_removed.length})`}
        items={diff.shows_removed.map((s) => s.title)}
        color="var(--color-danger)"
      />
      <DiffList
        title={`Episodes added (${diff.episodes_added.length})`}
        items={diff.episodes_added.map((e) => `${e.title} (${e.show_slug})`)}
        color="var(--color-success)"
      />
      <DiffList
        title={`Episodes removed (${diff.episodes_removed.length})`}
        items={diff.episodes_removed.map((e) => `${e.title} (${e.show_slug})`)}
        color="var(--color-danger)"
      />
      <DiffList
        title={`Episodes changed (${diff.episodes_changed.length})`}
        items={diff.episodes_changed.map((e) => `${e.title} (${e.show_slug}) — ${e.changed_fields.join(", ")}`)}
        color="var(--color-warning-text)"
      />
    </div>
  );
}

function Bar({ width, height = 16 }: { width: number | string; height?: number }) {
  return (
    <div aria-hidden="true" style={{ width, height, background: "#e5e4e7", borderRadius: 4 }} />
  );
}

function Box({ aspectRatio, width }: { aspectRatio: string; width: number | string }) {
  return (
    <div
      aria-hidden="true"
      style={{ width, aspectRatio, background: "#e5e4e7", borderRadius: 8, flexShrink: 0 }}
    />
  );
}

export function HeroSkeleton() {
  return (
    <section style={{ marginBottom: 32 }} aria-hidden="true">
      <div style={{ aspectRatio: "16 / 9", background: "#e5e4e7", borderRadius: 8 }} />
      <div style={{ marginTop: 12 }}>
        <Bar width={280} height={28} />
        <div style={{ margin: "8px 0 12px" }}>
          <Bar width="60%" />
        </div>
        <Bar width={100} height={16} />
      </div>
    </section>
  );
}

export function RowSkeleton() {
  return (
    <section style={{ marginBottom: 28 }} aria-hidden="true">
      <Bar width={120} height={18} />
      <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{ flex: "0 0 140px" }}>
            <Box aspectRatio="2 / 3" width={140} />
            <div style={{ marginTop: 6 }}>
              <Bar width="90%" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ShowHeaderSkeleton() {
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 24 }} aria-hidden="true">
      <Box aspectRatio="2 / 3" width={160} />
      <div style={{ flex: 1 }}>
        <Bar width={220} height={26} />
        <div style={{ margin: "8px 0" }}>
          <Bar width="80%" />
        </div>
        <Bar width={140} height={14} />
      </div>
    </div>
  );
}

export function EpisodeRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0" }}>
          <Box aspectRatio="16 / 9" width={96} />
          <div style={{ flex: 1 }}>
            <Bar width="70%" />
            <div style={{ marginTop: 6 }}>
              <Bar width={80} height={12} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

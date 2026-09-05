export function LanguageBadges({ languages }: { languages: string[] }) {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {languages.map((lang) => (
        <span
          key={lang}
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            padding: "1px 5px",
            borderRadius: 3,
            background: "var(--color-surface)",
            color: "var(--color-muted)",
            border: "1px solid var(--color-border)",
          }}
        >
          {lang}
        </span>
      ))}
    </span>
  );
}

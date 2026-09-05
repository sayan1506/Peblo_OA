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
            background: "#e5e4e7",
            color: "#4a4650",
          }}
        >
          {lang}
        </span>
      ))}
    </span>
  );
}

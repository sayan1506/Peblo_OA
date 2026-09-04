export function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(option: string) {
    onChange(selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option]);
  }

  return (
    <fieldset style={{ border: "1px solid #e5e4e7", borderRadius: 4, padding: 12 }}>
      <legend>{label}</legend>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {options.map((option) => (
          <label key={option} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

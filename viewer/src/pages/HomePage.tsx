import { useCatalog } from "../api/queries";
import { CatalogError } from "../api/catalog";
import { Hero } from "../components/Hero";
import { ShowRow } from "../components/ShowRow";

export function HomePage() {
  const { data, isLoading, isError, error } = useCatalog();

  if (isLoading) return <p>Loading…</p>;
  if (isError) {
    return <p>{error instanceof CatalogError ? error.message : "Failed to load the catalog."}</p>;
  }

  const sections = data?.sections ?? [];
  const heroShow = sections[0]?.shows[0];

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      {heroShow && <Hero show={heroShow} />}
      {sections.map((section) => (
        <ShowRow key={section.section} title={section.section} shows={section.shows} />
      ))}
    </main>
  );
}

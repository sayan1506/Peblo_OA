import { useCatalog } from "../api/queries";
import { CatalogError } from "../api/catalog";
import { Hero } from "../components/Hero";
import { ShowRow } from "../components/ShowRow";
import { HeroSkeleton, RowSkeleton } from "../components/ViewerSkeleton";
import { NotPublishedState } from "../components/NotPublishedState";
import { LoadFailedState } from "../components/LoadFailedState";

export function HomePage() {
  const { data, isLoading, isError, error, refetch } = useCatalog();

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      {isLoading && (
        <>
          <HeroSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </>
      )}
      {isError &&
        (error instanceof CatalogError && error.status === 404 ? (
          <NotPublishedState />
        ) : (
          <LoadFailedState
            message={error instanceof CatalogError ? error.message : "Failed to load the catalog."}
            onRetry={() => refetch()}
          />
        ))}
      {!isLoading && !isError && data && (
        <>
          {data.sections[0]?.shows[0] && <Hero show={data.sections[0].shows[0]} />}
          {data.sections.map((section) => (
            <ShowRow key={section.section} title={section.section} shows={section.shows} />
          ))}
        </>
      )}
    </main>
  );
}

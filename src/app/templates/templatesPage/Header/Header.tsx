import React from 'react';
import Link from 'next/link';

export const Header = () => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-body-sm text-muted">
        Search the catalog by make, model and year to edit what a car is
      </p>
      {/*
        The only reliable way into the create form. The per-row "Create" button
        below depends on a result coming back with status 'missing', and that
        status is now unreachable: identity reads its device definitions from
        the R2 catalog, so every id identity can return is an id the catalog
        already holds, which makes the row 'ok' and the button "Open". A search
        across 60 model-years over four makes returned 'ok' for all 60.

        Creating a model-year the catalog does not have yet is still a real
        task, so it needs an entry point that does not route through a search
        result. /templates/new takes no preset and the form handles its absence.
      */}
      <Link href="/templates/new" className="button primary">
        New template
      </Link>
    </div>
  );
};

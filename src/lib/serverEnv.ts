import { loadProjectDotEnv } from './loadProjectDotEnv';

/**
 * Server-only env reads for API routes.
 * Order: `process.env` (host / shell), `import.meta.env` (build-inlined), then `.env` / `.env.local`
 * on disk so `astro dev` API routes still see keys Astro did not inject into `process.env`.
 */
function firstNonEmpty(...vals: (string | undefined | null)[]): string | undefined {
  for (const v of vals) {
    const s = typeof v === 'string' ? v.trim() : '';
    if (s) return s;
  }
  return undefined;
}

function dot(name: string): string | undefined {
  try {
    const v = loadProjectDotEnv()[name];
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

export function getReservoirApiKey(): string | undefined {
  return firstNonEmpty(
    process.env.RESERVOIR_API_KEY,
    import.meta.env.RESERVOIR_API_KEY as string | undefined,
    dot('RESERVOIR_API_KEY'),
  );
}

/** OpenSea developer key: https://docs.opensea.io/reference/api-keys */
export function getOpenSeaApiKey(): string | undefined {
  return firstNonEmpty(
    process.env.OPENSEA_API_KEY,
    process.env.OPEN_SEA_API_KEY,
    import.meta.env.OPENSEA_API_KEY as string | undefined,
    import.meta.env.OPEN_SEA_API_KEY as string | undefined,
    dot('OPENSEA_API_KEY'),
    dot('OPEN_SEA_API_KEY'),
  );
}

/** Collection slug on OpenSea (URL segment), e.g. `hood-rats` for hood-rats collection. */
export function getOpenSeaCollectionSlug(): string {
  return (
    firstNonEmpty(
      process.env.OPENSEA_COLLECTION_SLUG,
      import.meta.env.OPENSEA_COLLECTION_SLUG as string | undefined,
      dot('OPENSEA_COLLECTION_SLUG'),
    ) ?? 'hood-rats'
  );
}

const BASE = '/api/reservoir';

/** Matches server `CollectionNftRow` shape from `/api/reservoir/collection-nfts.json`. */
export type CollectionNftRow = {
  tokenId: number;
  name?: string;
  image?: string;
  imageFallbacks?: string[];
  openseaUrl?: string;
  traits?: Record<string, string>;
};

export type OpenSeaCollectionStats = {
  total?: {
    volume?: number;
    sales?: number;
    num_owners?: number;
    floor_price?: number;
    floor_price_symbol?: string;
    average_price?: number;
  };
  intervals?: Array<{
    interval?: string;
    volume?: number;
    sales?: number;
    average_price?: number;
  }>;
};

export type SlimListing = {
  orderId?: string;
  tokenId: number;
  tokenName?: string;
  tokenImage?: string;
  tokenImageAlternates?: string[];
  priceEth: number | null;
  priceUsd: number | null;
  maker?: string | null;
};

export type TopOfferSummary = {
  priceEth: number | null;
  kind?: string;
  maker?: string;
  collectionSlug?: string;
};

export type PricingPayload = {
  bestListing: SlimListing | null;
  topOffer: TopOfferSummary | null;
};

/** Base64url(JSON) of `Record<traitType, value[]>` for server-side browse. */
export function encodeTraitFiltersRecord(sel: Record<string, Set<string>>): string | undefined {
  const o: Record<string, string[]> = {};
  for (const [k, set] of Object.entries(sel)) {
    if (set?.size) o[k] = [...set].map((x) => x.trim()).filter(Boolean);
  }
  if (Object.keys(o).length === 0) return undefined;
  const json = JSON.stringify(o);
  const utf8 = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < utf8.length; i++) bin += String.fromCharCode(utf8[i]!);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function fetchOpenSeaCollectionStats(): Promise<OpenSeaCollectionStats | null> {
  const url = new URL(`${BASE}/stats.json`, window.location.origin);
  const res = await fetch(url.toString(), { headers: { accept: 'application/json' } });
  if (!res.ok) return null;
  return (await res.json()) as OpenSeaCollectionStats;
}

export async function fetchOpenSeaPricing(): Promise<PricingPayload> {
  const url = new URL(`${BASE}/pricing.json`, window.location.origin);
  const res = await fetch(url.toString(), { headers: { accept: 'application/json' } });
  if (!res.ok) return { bestListing: null, topOffer: null };
  return (await res.json()) as PricingPayload;
}

export type CollectionNftsPage = {
  nfts: CollectionNftRow[];
  continuation: string | null;
};

export async function fetchCollectionNftsPage(
  selected: Record<string, Set<string>>,
  continuation: string | null,
  limit = 40,
): Promise<CollectionNftsPage> {
  const filters = encodeTraitFiltersRecord(selected);
  const url = new URL(`${BASE}/collection-nfts.json`, window.location.origin);
  url.searchParams.set('limit', String(limit));
  if (filters) url.searchParams.set('filters', filters);
  if (continuation) url.searchParams.set('continuation', continuation);

  const res = await fetch(url.toString(), { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`NFT browse failed (${res.status})${t ? `: ${t.slice(0, 160)}` : ''}`);
  }
  const body = (await res.json()) as CollectionNftsPage;
  return {
    nfts: Array.isArray(body.nfts) ? body.nfts : [],
    continuation: typeof body.continuation === 'string' ? body.continuation : null,
  };
}

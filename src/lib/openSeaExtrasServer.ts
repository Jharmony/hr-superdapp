import { HOODRATS_ADDRESS } from './contract';
import { enrichOrdersWithOpenSeaNfts, mapOpenSeaListingsToReservoirOrders } from './openSeaMarketplaceServer';

const OPENSEA = 'https://api.opensea.io';
const CONTRACT = HOODRATS_ADDRESS.toLowerCase();

function osHeaders(key: string): Record<string, string> {
  return { accept: 'application/json', 'x-api-key': key };
}

export async function proxyOpenSeaCollectionStats(key: string, slug: string): Promise<Response> {
  const url = `${OPENSEA}/api/v2/collections/${encodeURIComponent(slug)}/stats`;
  const res = await fetch(url, { headers: osHeaders(key) });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/json',
      'cache-control': 's-maxage=120, stale-while-revalidate=600',
    },
  });
}

function weiToEth(quantity: string | undefined, decimals: number): number | null {
  if (quantity == null) return null;
  const n = Number(quantity);
  if (!Number.isFinite(n)) return null;
  const d = Number.isFinite(decimals) && decimals >= 0 ? decimals : 18;
  return n / 10 ** d;
}

/** Best-effort ETH price from an OpenSea listing or offer-shaped object. */
function ethFromPriceLike(obj: Record<string, unknown> | null): number | null {
  if (!obj) return null;
  const price = obj.price != null && typeof obj.price === 'object' ? (obj.price as Record<string, unknown>) : null;
  const cur = price?.current != null && typeof price.current === 'object' ? (price.current as Record<string, unknown>) : null;
  const wei = typeof cur?.value === 'string' ? cur.value : undefined;
  const dec = typeof cur?.decimals === 'number' ? cur.decimals : 18;
  return weiToEth(wei, dec);
}

function slimEnrichedOrder(order: unknown): Record<string, unknown> | null {
  const o = order as Record<string, unknown> | null;
  if (!o) return null;
  const t = o.token != null && typeof o.token === 'object' ? (o.token as Record<string, unknown>) : null;
  const p = o.price != null && typeof o.price === 'object' ? (o.price as Record<string, unknown>) : null;
  const a = p?.amount != null && typeof p.amount === 'object' ? (p.amount as Record<string, unknown>) : null;
  const tid = t?.tokenId;
  const tokenId = typeof tid === 'number' ? tid : Number(String(tid ?? ''));
  if (!Number.isFinite(tokenId)) return null;
  const dec = a?.decimal;
  const usdRaw = a?.usd;
  return {
    orderId: o.id,
    tokenId,
    tokenName: typeof t?.name === 'string' ? t.name : undefined,
    tokenImage: typeof t?.image === 'string' ? t.image : undefined,
    tokenImageAlternates: Array.isArray(t?.imageFallbacks) ? t.imageFallbacks : undefined,
    priceEth: typeof dec === 'number' && Number.isFinite(dec) ? dec : null,
    priceUsd:
      typeof usdRaw === 'number' && Number.isFinite(usdRaw)
        ? usdRaw
        : typeof usdRaw === 'string'
          ? Number(usdRaw)
          : null,
    maker: typeof o.maker === 'string' ? o.maker : null,
  };
}

function ethFromOfferPayment(o: Record<string, unknown>): number | null {
  const pay = o.payment != null && typeof o.payment === 'object' ? (o.payment as Record<string, unknown>) : null;
  const qty = typeof pay?.quantity === 'string' ? pay.quantity : undefined;
  const dec = typeof pay?.decimals === 'number' ? pay.decimals : 18;
  return weiToEth(qty, dec);
}

export async function proxyOpenSeaPricingContext(key: string, slug: string): Promise<Response> {
  const bestUrl = `${OPENSEA}/api/v2/listings/collection/${encodeURIComponent(slug)}/best`;
  const offersUrl = new URL(`${OPENSEA}/api/v2/offers/collection/${encodeURIComponent(slug)}`);
  offersUrl.searchParams.set('limit', '10');

  const [bestRes, offersRes] = await Promise.all([
    fetch(bestUrl, { headers: osHeaders(key) }),
    fetch(offersUrl.toString(), { headers: osHeaders(key) }),
  ]);

  let bestListing: unknown = null;
  if (bestRes.ok) {
    try {
      const j = (await bestRes.json()) as Record<string, unknown>;
      const listings = Array.isArray(j.listings) ? j.listings : [];
      if (listings[0]) {
        const orders = mapOpenSeaListingsToReservoirOrders({ listings, next: null });
        if (orders[0]) {
          await enrichOrdersWithOpenSeaNfts(orders, key);
          bestListing = slimEnrichedOrder(orders[0]);
        }
      }
    } catch {
      /* ignore */
    }
  }

  let topOffer: unknown = null;
  if (offersRes.ok) {
    try {
      const j = (await offersRes.json()) as Record<string, unknown>;
      const offers = Array.isArray(j.offers) ? j.offers : [];
      const first = offers[0];
      if (first != null && typeof first === 'object') {
        const o = first as Record<string, unknown>;
        const eth = ethFromPriceLike(o) ?? ethFromOfferPayment(o);
        const crit = o.criteria != null && typeof o.criteria === 'object' ? (o.criteria as Record<string, unknown>) : null;
        topOffer = {
          priceEth: eth,
          kind: typeof o.order_type === 'string' ? o.order_type : 'offer',
          maker: typeof o.maker === 'string' ? o.maker : undefined,
          collectionSlug: typeof crit?.collection === 'object' ? (crit.collection as { slug?: string })?.slug : undefined,
        };
      }
    } catch {
      /* ignore */
    }
  }

  return new Response(JSON.stringify({ bestListing, topOffer }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 's-maxage=60, stale-while-revalidate=300',
    },
  });
}

export type CollectionNftRow = {
  tokenId: number;
  name?: string;
  image?: string;
  imageFallbacks?: string[];
  openseaUrl?: string;
  traits?: Record<string, string>;
};

function traitValueToString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return String(v).trim();
}

function nftTraitMap(nft: Record<string, unknown>): Map<string, string> {
  const traits = Array.isArray(nft.traits) ? (nft.traits as Record<string, unknown>[]) : [];
  const m = new Map<string, string>();
  for (const t of traits) {
    const k = typeof t.trait_type === 'string' ? t.trait_type.trim() : '';
    if (!k) continue;
    m.set(k, traitValueToString(t.value));
  }
  return m;
}

/** AND across trait types; OR within each type’s value list. */
export function nftMatchesTraitFilters(nft: Record<string, unknown>, filters: Record<string, string[]>): boolean {
  const entries = Object.entries(filters).filter(([, vals]) => Array.isArray(vals) && vals.length > 0);
  if (entries.length === 0) return true;

  const contract = typeof nft.contract === 'string' ? nft.contract.toLowerCase() : '';
  if (contract && contract !== CONTRACT) return false;

  const map = nftTraitMap(nft);
  for (const [traitType, allowed] of entries) {
    const got = map.get(traitType);
    if (!got) return false;
    const ok = allowed.some((want) => {
      const a = want.trim();
      const b = got.trim();
      return a === b || a.toLowerCase() === b.toLowerCase();
    });
    if (!ok) return false;
  }
  return true;
}

function mapNftToRow(nft: Record<string, unknown>): CollectionNftRow | null {
  const contract = typeof nft.contract === 'string' ? nft.contract.toLowerCase() : '';
  if (contract && contract !== CONTRACT) return null;
  const idRaw = nft.identifier;
  const tokenId =
    typeof idRaw === 'number' ? idRaw : typeof idRaw === 'string' ? Number(idRaw.trim()) : NaN;
  if (!Number.isFinite(tokenId) || tokenId < 0) return null;

  const disp =
    typeof nft.display_image_url === 'string' && nft.display_image_url.trim()
      ? nft.display_image_url.trim()
      : undefined;
  const img =
    typeof nft.image_url === 'string' && nft.image_url.trim() ? nft.image_url.trim() : undefined;
  const orig =
    typeof nft.original_image_url === 'string' && nft.original_image_url.trim()
      ? nft.original_image_url.trim()
      : undefined;
  const candidates = [disp, img, orig].filter(Boolean) as string[];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const u of candidates) {
    if (seen.has(u)) continue;
    seen.add(u);
    unique.push(u);
  }
  const primary = unique[0];
  const imageFallbacks = unique.length > 1 ? unique.slice(1) : undefined;

  const name = typeof nft.name === 'string' && nft.name.trim() ? nft.name.trim() : undefined;
  const openseaUrl = typeof nft.opensea_url === 'string' ? nft.opensea_url : undefined;
  const traits: Record<string, string> = {};
  const map = nftTraitMap(nft);
  for (const [k, v] of map) traits[k] = v;

  return {
    tokenId,
    name,
    image: primary,
    imageFallbacks,
    openseaUrl,
    traits: Object.keys(traits).length ? traits : undefined,
  };
}

type BrowseCursor = {
  /** OpenSea `next` cursor: `undefined` = start, `string` = next page, `null` = no further pages. */
  n?: string | null;
  /** Matched rows not yet returned to the client. */
  q?: CollectionNftRow[];
};

function encodeBrowseCursor(c: BrowseCursor): string | null {
  const q = Array.isArray(c.q) ? c.q : [];
  const n = c.n;
  const hasQueue = q.length > 0;
  const hasNextPage = typeof n === 'string' && n.length > 0;
  if (!hasQueue && !hasNextPage) return null;
  try {
    return Buffer.from(JSON.stringify({ n: hasNextPage ? n : null, q }), 'utf8').toString('base64url');
  } catch {
    return null;
  }
}

function decodeBrowseCursor(s: string | null): BrowseCursor {
  if (!s?.trim()) return { n: undefined, q: [] };
  try {
    const o = JSON.parse(Buffer.from(s, 'base64url').toString('utf8')) as BrowseCursor;
    return {
      n: o.n === undefined ? undefined : o.n,
      q: Array.isArray(o.q) ? (o.q as CollectionNftRow[]) : [],
    };
  } catch {
    return { n: undefined, q: [] };
  }
}

const PAGE = 200;
const MAX_ROUNDS = 14;

export async function proxyTraitFilteredCollectionNfts(
  key: string,
  slug: string,
  filters: Record<string, string[]>,
  limit: number,
  continuation: string | null,
): Promise<Response> {
  const cap = Math.min(80, Math.max(1, limit));
  const cur = decodeBrowseCursor(continuation);
  const results: CollectionNftRow[] = [];
  let pending: CollectionNftRow[] = [...(cur.q ?? [])];
  let osNext: string | null | undefined = cur.n;

  let rounds = 0;
  while (results.length < cap && rounds < MAX_ROUNDS) {
    rounds += 1;
    while (results.length < cap && pending.length) {
      results.push(pending.shift()!);
    }
    if (results.length >= cap) break;
    if (osNext === null) break;

    const url = new URL(`${OPENSEA}/api/v2/collection/${encodeURIComponent(slug)}/nfts`);
    url.searchParams.set('limit', String(PAGE));
    if (typeof osNext === 'string' && osNext.length > 0) url.searchParams.set('next', osNext);

    const res = await fetch(url.toString(), { headers: osHeaders(key), signal: AbortSignal.timeout(25_000) });
    const text = await res.text();
    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: 'opensea_collection_nfts_failed',
          status: res.status,
          message: text.slice(0, 240),
        }),
        { status: 502, headers: { 'content-type': 'application/json' } },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      break;
    }
    const root = parsed != null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    const raw = root && Array.isArray(root.nfts) ? root.nfts : [];
    const pageNext: string | null = typeof root?.next === 'string' ? root.next : null;

    const matched: CollectionNftRow[] = [];
    for (const item of raw) {
      const nft = item != null && typeof item === 'object' ? (item as Record<string, unknown>) : null;
      if (!nft) continue;
      if (!nftMatchesTraitFilters(nft, filters)) continue;
      const row = mapNftToRow(nft);
      if (row) matched.push(row);
    }

    for (const row of matched) {
      if (results.length < cap) results.push(row);
      else pending.push(row);
    }

    osNext = pageNext;
    if (raw.length === 0) break;
  }

  const nextEnc = encodeBrowseCursor({ n: osNext === undefined ? undefined : osNext, q: pending });

  return new Response(JSON.stringify({ nfts: results, continuation: nextEnc }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 's-maxage=60, stale-while-revalidate=300',
    },
  });
}

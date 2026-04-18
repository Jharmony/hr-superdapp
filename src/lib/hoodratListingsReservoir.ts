import { HOODRATS_ADDRESS } from './contract';

const CONTRACT = HOODRATS_ADDRESS.toLowerCase();

/** Mainnet Reservoir HTTP API (aggregates OpenSea + other sources). */
export const RESERVOIR_API_BASE = 'https://api.reservoir.tools';

export type HoodratListingRow = {
  orderId: string;
  tokenId: number;
  priceEth: number | null;
  priceUsd: number | null;
  sourceLabel: string;
  maker: string | null;
};

type ReservoirAsksJson = {
  orders?: unknown[];
  continuation?: string | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function tokenContract(order: Record<string, unknown>): string | null {
  const t = asRecord(order.token);
  const c0 = t?.contract;
  if (typeof c0 === 'string' && c0.startsWith('0x')) return c0.toLowerCase();

  const crit = asRecord(order.criteria);
  const data = crit ? asRecord(crit.data) : null;
  const tok = data ? asRecord(data.token) : null;
  const c1 = tok?.contract;
  if (typeof c1 === 'string' && c1.startsWith('0x')) return c1.toLowerCase();

  return null;
}

function extractTokenId(order: Record<string, unknown>): number | null {
  const parse = (v: unknown): number | null => {
    if (v == null) return null;
    const n = typeof v === 'number' ? v : Number(String(v).trim());
    if (!Number.isFinite(n) || n < 0 || n > 99_999_999) return null;
    return Math.floor(n);
  };

  const t = asRecord(order.token);
  const direct = parse(t?.tokenId);
  if (direct != null) return direct;

  const crit = asRecord(order.criteria);
  const data = crit ? asRecord(crit.data) : null;
  const tok = data ? asRecord(data.token) : null;
  const fromCrit = parse(tok?.tokenId);
  if (fromCrit != null) return fromCrit;

  const setId = order.tokenSetId;
  if (typeof setId === 'string' && setId.includes(':')) {
    const parts = setId.split(':');
    const last = parts[parts.length - 1];
    return parse(last);
  }

  return null;
}

function extractPrice(order: Record<string, unknown>): {
  eth: number | null;
  usd: number | null;
} {
  const price = asRecord(order.price);
  const amount = price ? asRecord(price.amount) : null;
  if (amount) {
    const dec = amount.decimal;
    if (typeof dec === 'number' && Number.isFinite(dec)) {
      const usdRaw = amount.usd;
      const usd =
        typeof usdRaw === 'number' && Number.isFinite(usdRaw)
          ? usdRaw
          : typeof usdRaw === 'string'
            ? Number(usdRaw)
            : null;
      return {
        eth: dec,
        usd: usd != null && Number.isFinite(usd) ? usd : null,
      };
    }
  }
  return { eth: null, usd: null };
}

function extractSource(order: Record<string, unknown>): string {
  const src = asRecord(order.source);
  const name = src?.name;
  if (typeof name === 'string' && name.trim()) return name.trim();
  const domain = src?.domain;
  if (typeof domain === 'string' && domain.trim()) return domain.trim();
  return 'Marketplace';
}

function extractMaker(order: Record<string, unknown>): string | null {
  const m = order.maker;
  return typeof m === 'string' && m.startsWith('0x') ? m : null;
}

function extractOrderId(order: Record<string, unknown>): string {
  const id = order.id;
  return typeof id === 'string' && id.length > 0 ? id : 'unknown';
}

function parseOrder(order: unknown): HoodratListingRow | null {
  const o = asRecord(order);
  if (!o) return null;
  if (tokenContract(o) !== CONTRACT) return null;
  const tokenId = extractTokenId(o);
  if (tokenId == null) return null;
  const { eth, usd } = extractPrice(o);
  return {
    orderId: extractOrderId(o),
    tokenId,
    priceEth: eth,
    priceUsd: usd,
    sourceLabel: extractSource(o),
    maker: extractMaker(o),
  };
}

export type HoodratListingsPage = {
  listings: HoodratListingRow[];
  continuation: string | null;
};

/**
 * Active sell-side orders for the Hoodrats contract (Ethereum mainnet via Reservoir).
 * Optional `PUBLIC_RESERVOIR_API_KEY` raises rate limits (safe to expose only if you accept client-side use).
 */
export async function fetchHoodratListingsPage(
  continuation: string | null,
  limit = 50,
): Promise<HoodratListingsPage> {
  const url = new URL(`${RESERVOIR_API_BASE}/orders/asks/v5`);
  url.searchParams.set('contracts', HOODRATS_ADDRESS);
  url.searchParams.set('status', 'active');
  url.searchParams.set('limit', String(Math.min(1000, Math.max(1, limit))));
  url.searchParams.set('sortBy', 'price');
  url.searchParams.set('sortDirection', 'asc');
  url.searchParams.set('includeCriteriaMetadata', 'true');
  if (continuation) url.searchParams.set('continuation', continuation);

  const headers: HeadersInit = { accept: 'application/json' };
  const apiKey = (import.meta.env.PUBLIC_RESERVOIR_API_KEY as string | undefined)?.trim();
  if (apiKey) (headers as Record<string, string>)['x-api-key'] = apiKey;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(
      `Listings request failed (${res.status})${t ? `: ${t.slice(0, 200)}` : ''}`,
    );
  }

  const body = (await res.json()) as ReservoirAsksJson;
  const orders = Array.isArray(body.orders) ? body.orders : [];
  const listings: HoodratListingRow[] = [];
  for (const ord of orders) {
    const row = parseOrder(ord);
    if (row) listings.push(row);
  }

  return {
    listings,
    continuation: typeof body.continuation === 'string' ? body.continuation : null,
  };
}

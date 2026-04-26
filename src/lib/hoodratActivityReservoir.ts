import { HOODRATS_ADDRESS } from './contract';
import { RESERVOIR_API_BASE } from './hoodratListingsReservoir';

export type HoodratActivityType = 'sale' | 'ask' | 'transfer';

export type HoodratActivityRow = {
  id: string;
  type: HoodratActivityType;
  tokenId: number;
  priceEth: number | null;
  priceUsd: number | null;
  from?: string;
  to?: string;
  timestamp?: number;
  txHash?: string;
};

type ReservoirActivityJson = {
  activities?: unknown[];
  continuation?: string | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function extractTokenId(a: Record<string, unknown>): number | null {
  const tok = asRecord(a.token);
  const id0 = tok?.tokenId;
  const n = typeof id0 === 'number' ? id0 : Number(String(id0 ?? '').trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function extractType(a: Record<string, unknown>): HoodratActivityType | null {
  const t = a.type;
  const raw = typeof t === 'string' ? t.trim().toLowerCase() : '';
  if (raw === 'sale' || raw === 'ask' || raw === 'transfer') return raw;
  // Reservoir sometimes uses "mint" / "bid" etc — ignore for now
  return null;
}

function extractId(a: Record<string, unknown>): string {
  const id = a.id;
  if (typeof id === 'string' && id) return id;
  const tx = a.txHash;
  const ts = a.timestamp;
  return `${String(tx ?? 'unknown')}:${String(ts ?? '0')}`;
}

function extractPrice(a: Record<string, unknown>): { eth: number | null; usd: number | null } {
  const p = asRecord(a.price);
  const amount = p ? asRecord(p.amount) : null;
  const dec = amount?.decimal;
  const eth = typeof dec === 'number' && Number.isFinite(dec) ? dec : null;
  const usdRaw = amount?.usd;
  const usd =
    typeof usdRaw === 'number' && Number.isFinite(usdRaw)
      ? usdRaw
      : typeof usdRaw === 'string'
        ? Number(usdRaw)
        : null;
  return { eth, usd: usd != null && Number.isFinite(usd) ? usd : null };
}

function extractAddr(v: unknown): string | undefined {
  return typeof v === 'string' && v.startsWith('0x') ? v : undefined;
}

function parseActivity(a0: unknown): HoodratActivityRow | null {
  const a = asRecord(a0);
  if (!a) return null;

  const contract = asRecord(a.collection)?.id ?? asRecord(a.token)?.contract ?? asRecord(a.token)?.collection?.id;
  if (typeof contract === 'string' && contract.startsWith('0x')) {
    if (contract.toLowerCase() !== HOODRATS_ADDRESS.toLowerCase()) return null;
  }

  const type = extractType(a);
  if (!type) return null;
  const tokenId = extractTokenId(a);
  if (tokenId == null) return null;
  const { eth, usd } = extractPrice(a);
  const ts = a.timestamp;
  const timestamp = typeof ts === 'number' && Number.isFinite(ts) ? ts : undefined;

  return {
    id: extractId(a),
    type,
    tokenId,
    priceEth: eth,
    priceUsd: usd,
    from: extractAddr(a.from),
    to: extractAddr(a.to),
    timestamp,
    txHash: typeof a.txHash === 'string' ? a.txHash : undefined,
  };
}

export type HoodratActivityPage = {
  rows: HoodratActivityRow[];
  continuation: string | null;
};

/**
 * Collection activity (sales, asks, transfers, etc).
 * Reservoir endpoint: `/collections/activity/v6`
 */
export async function fetchHoodratActivityPage(
  types: HoodratActivityType[],
  continuation: string | null,
  limit = 50,
): Promise<HoodratActivityPage> {
  // Proxy via same-origin API to avoid browser blocks.
  const url = new URL(`${RESERVOIR_API_BASE}/activity.json`, window.location.origin);
  url.searchParams.set('limit', String(Math.min(200, Math.max(1, limit))));
  for (const t of types) url.searchParams.append('types', t);
  if (continuation) url.searchParams.set('continuation', continuation);

  const res = await fetch(url.toString(), { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(
      `Activity request failed (${res.status})${t ? `: ${t.slice(0, 200)}` : ''}`,
    );
  }

  const body = (await res.json()) as ReservoirActivityJson;
  const items = Array.isArray(body.activities) ? body.activities : [];
  const rows: HoodratActivityRow[] = [];
  for (const a of items) {
    const r = parseActivity(a);
    if (r) rows.push(r);
  }

  return {
    rows,
    continuation: typeof body.continuation === 'string' ? body.continuation : null,
  };
}


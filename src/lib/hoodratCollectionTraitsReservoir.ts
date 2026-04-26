import { HOODRATS_ADDRESS } from './contract';
import { RESERVOIR_API_BASE } from './hoodratListingsReservoir';

type AttrCount = { value: string; count: number };
export type CollectionTraitCounts = Record<string, AttrCount[]>;

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/**
 * Loads a trait/value count map for the Hoodrats collection.
 * Reservoir endpoint: `/collections/{collection}/attributes/all/v2`
 *
 * We use the contract address as the collection id for single-contract collections.
 */
export async function fetchHoodratsTraitCounts(): Promise<CollectionTraitCounts> {
  const url = new URL(`${RESERVOIR_API_BASE}/traits.json`, window.location.origin);
  const res = await fetch(url.toString(), { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Traits request failed (${res.status})${t ? `: ${t.slice(0, 160)}` : ''}`);
  }

  const body = (await res.json()) as unknown;
  const root = asRecord(body);
  const attrs = root ? (root.attributes as unknown) : undefined;
  if (!Array.isArray(attrs)) return {};

  const out: CollectionTraitCounts = {};
  for (const a0 of attrs) {
    const a = asRecord(a0);
    if (!a) continue;
    const key = typeof a.key === 'string' ? a.key.trim() : '';
    if (!key) continue;
    const values = Array.isArray(a.values) ? a.values : [];
    const rows: AttrCount[] = [];
    for (const v0 of values) {
      const v = asRecord(v0);
      if (!v) continue;
      const value = typeof v.value === 'string' ? v.value.trim() : '';
      const countRaw = v.count;
      const count = typeof countRaw === 'number' && Number.isFinite(countRaw) ? countRaw : 0;
      if (!value) continue;
      rows.push({ value, count });
    }
    rows.sort((x, y) => y.count - x.count);
    out[key] = rows;
  }
  return out;
}


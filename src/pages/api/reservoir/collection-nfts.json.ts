import type { APIRoute } from 'astro';
import { proxyTraitFilteredCollectionNfts } from '../../../lib/openSeaExtrasServer';
import { getOpenSeaApiKey, getOpenSeaCollectionSlug } from '../../../lib/serverEnv';

export const prerender = false;

function decodeFiltersParam(s: string | null): Record<string, string[]> {
  if (!s?.trim()) return {};
  try {
    const json = Buffer.from(s, 'base64url').toString('utf8');
    const o = JSON.parse(json) as unknown;
    if (o == null || typeof o !== 'object' || Array.isArray(o)) return {};
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (Array.isArray(v)) out[k] = v.map((x) => String(x).trim()).filter(Boolean);
      else if (v != null && String(v).trim()) out[k] = [String(v).trim()];
    }
    return out;
  } catch {
    return {};
  }
}

export const GET: APIRoute = async ({ request }) => {
  const key = getOpenSeaApiKey();
  if (!key) {
    return new Response(JSON.stringify({ error: 'opensea_key_required', nfts: [], continuation: null }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  const u = new URL(request.url);
  const filters = decodeFiltersParam(u.searchParams.get('filters'));
  const limit = Math.min(80, Math.max(1, Number(u.searchParams.get('limit')) || 40));
  const continuation = u.searchParams.get('continuation');

  return proxyTraitFilteredCollectionNfts(key, getOpenSeaCollectionSlug(), filters, limit, continuation);
};

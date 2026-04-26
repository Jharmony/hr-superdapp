import type { APIRoute } from 'astro';
import { proxyOpenSeaActivity } from '../../../lib/openSeaMarketplaceServer';
import { getOpenSeaApiKey, getOpenSeaCollectionSlug } from '../../../lib/serverEnv';

const ALLOWED = new Set(['ask', 'sale', 'transfer']);

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const u = new URL(request.url);
  const continuation = u.searchParams.get('continuation');
  const limitNum = Math.min(200, Math.max(1, Number(u.searchParams.get('limit') ?? '60') || 60));
  const types = u.searchParams.getAll('types').filter((t) => ALLOWED.has(t)) as ('ask' | 'sale' | 'transfer')[];
  const hoodTypes = types.length ? types : (['ask'] as ('ask' | 'sale' | 'transfer')[]);

  const osKey = getOpenSeaApiKey();
  if (!osKey) {
    return new Response(JSON.stringify({ activities: [], continuation: null }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 's-maxage=30, stale-while-revalidate=300',
      },
    });
  }

  return proxyOpenSeaActivity(osKey, getOpenSeaCollectionSlug(), hoodTypes, continuation, limitNum);
};

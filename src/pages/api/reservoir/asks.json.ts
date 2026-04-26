import type { APIRoute } from 'astro';
import { HOODRATS_ADDRESS } from '../../../lib/contract';

const BASE = 'https://api.reservoir.tools';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const u = new URL(request.url);
  const continuation = u.searchParams.get('continuation');
  const limit = u.searchParams.get('limit') ?? '40';

  const url = new URL(`${BASE}/orders/asks/v5`);
  url.searchParams.set('contracts', HOODRATS_ADDRESS);
  url.searchParams.set('status', 'active');
  url.searchParams.set('limit', String(Math.min(200, Math.max(1, Number(limit) || 40))));
  url.searchParams.set('sortBy', 'price');
  url.searchParams.set('sortDirection', 'asc');
  url.searchParams.set('includeCriteriaMetadata', 'true');
  if (continuation) url.searchParams.set('continuation', continuation);

  const headers: Record<string, string> = { accept: 'application/json' };
  const key = (import.meta.env.RESERVOIR_API_KEY as string | undefined)?.trim();
  if (key) headers['x-api-key'] = key;

  const res = await fetch(url.toString(), { headers });
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/json',
      'cache-control': 's-maxage=30, stale-while-revalidate=300',
    },
  });
};


import type { APIRoute } from 'astro';
import { HOODRATS_ADDRESS } from '../../../lib/contract';

const BASE = 'https://api.reservoir.tools';

export const prerender = false;

export const GET: APIRoute = async () => {
  const url = `${BASE}/collections/${HOODRATS_ADDRESS}/attributes/all/v2`;
  const headers: Record<string, string> = { accept: 'application/json' };
  const key = (import.meta.env.RESERVOIR_API_KEY as string | undefined)?.trim();
  if (key) headers['x-api-key'] = key;

  const res = await fetch(url, { headers });
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/json',
      'cache-control': 's-maxage=600, stale-while-revalidate=86400',
    },
  });
};


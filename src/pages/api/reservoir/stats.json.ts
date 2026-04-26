import type { APIRoute } from 'astro';
import { proxyOpenSeaCollectionStats } from '../../../lib/openSeaExtrasServer';
import { getOpenSeaApiKey, getOpenSeaCollectionSlug } from '../../../lib/serverEnv';

export const prerender = false;

export const GET: APIRoute = async () => {
  const key = getOpenSeaApiKey();
  if (!key) {
    return new Response(JSON.stringify({ error: 'opensea_key_required' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
  return proxyOpenSeaCollectionStats(key, getOpenSeaCollectionSlug());
};

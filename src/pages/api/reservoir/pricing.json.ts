import type { APIRoute } from 'astro';
import { proxyOpenSeaPricingContext } from '../../../lib/openSeaExtrasServer';
import { getOpenSeaApiKey, getOpenSeaCollectionSlug } from '../../../lib/serverEnv';

export const prerender = false;

export const GET: APIRoute = async () => {
  const key = getOpenSeaApiKey();
  if (!key) {
    return new Response(JSON.stringify({ bestListing: null, topOffer: null }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  return proxyOpenSeaPricingContext(key, getOpenSeaCollectionSlug());
};

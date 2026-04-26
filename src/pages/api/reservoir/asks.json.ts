import type { APIRoute } from 'astro';
import { proxyOpenSeaListings } from '../../../lib/openSeaMarketplaceServer';
import { getOpenSeaApiKey, getOpenSeaCollectionSlug } from '../../../lib/serverEnv';

export const prerender = false;

const KEY_HELP =
  'Create `.env` in the project root with OPENSEA_API_KEY=your_key (from OpenSea developer settings). Restart astro dev. Optional: OPENSEA_COLLECTION_SLUG if not hood-rats.';

export const GET: APIRoute = async ({ request }) => {
  const u = new URL(request.url);
  const continuation = u.searchParams.get('continuation');
  const limitNum = Math.min(200, Math.max(1, Number(u.searchParams.get('limit') ?? '40') || 40));

  const osKey = getOpenSeaApiKey();
  if (!osKey) {
    return new Response(
      JSON.stringify({
        error: 'opensea_key_required',
        message: `Marketplace listings use OpenSea only. ${KEY_HELP}`,
      }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  return proxyOpenSeaListings(osKey, getOpenSeaCollectionSlug(), continuation, limitNum);
};

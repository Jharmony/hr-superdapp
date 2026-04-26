import type { APIRoute } from 'astro';
import { createMetadataPublicClient } from '../../../lib/metadata';
import { readTbaAddress } from '../../../lib/tba';
import { fetchOpenSeaNftsForOwner } from '../../../lib/tbaOpenSeaServer';
import { getOpenSeaApiKey } from '../../../lib/serverEnv';

export const prerender = false;

const MAX_NFTS = 100;

export const GET: APIRoute = async ({ request }) => {
  const u = new URL(request.url);
  const idRaw = u.searchParams.get('tokenId');
  const tokenIdNum = idRaw != null ? Number(String(idRaw).trim()) : NaN;
  if (!Number.isFinite(tokenIdNum) || tokenIdNum < 0 || tokenIdNum > Number.MAX_SAFE_INTEGER) {
    return new Response(JSON.stringify({ error: 'bad_token_id' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const tokenId = BigInt(Math.trunc(tokenIdNum));

  try {
    const client = createMetadataPublicClient();
    const tbaAddress = await readTbaAddress(client, tokenId);

    const key = getOpenSeaApiKey();
    if (!key) {
      return new Response(
        JSON.stringify({
          tbaAddress,
          nfts: [],
          truncated: false,
          inventoryUnavailableReason: 'opensea_key_required',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'cache-control': 'public, s-maxage=60, stale-while-revalidate=300',
          },
        },
      );
    }

    const { nfts, truncated } = await fetchOpenSeaNftsForOwner(key, tbaAddress, MAX_NFTS);

    return new Response(JSON.stringify({ tbaAddress, nfts, truncated }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: 'tba_backpack_failed', message: msg.slice(0, 400) }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
};

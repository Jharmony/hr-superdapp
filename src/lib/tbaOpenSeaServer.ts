const OPENSEA = 'https://api.opensea.io';

function osHeaders(key: string): Record<string, string> {
  return { accept: 'application/json', 'x-api-key': key };
}

export type TbaBackpackNft = {
  contract: string;
  tokenId: string;
  name?: string;
  image?: string;
  openseaUrl?: string;
};

function mapAccountNft(nft: Record<string, unknown>): TbaBackpackNft | null {
  const contract = typeof nft.contract === 'string' ? nft.contract.toLowerCase() : '';
  if (!contract.startsWith('0x')) return null;

  const idRaw = nft.identifier;
  const tokenId =
    idRaw != null && (typeof idRaw === 'string' || typeof idRaw === 'number')
      ? String(idRaw).trim()
      : '';
  if (!tokenId) return null;

  const disp =
    typeof nft.display_image_url === 'string' && nft.display_image_url.trim()
      ? nft.display_image_url.trim()
      : undefined;
  const img =
    typeof nft.image_url === 'string' && nft.image_url.trim() ? nft.image_url.trim() : undefined;
  const orig =
    typeof nft.original_image_url === 'string' && nft.original_image_url.trim()
      ? nft.original_image_url.trim()
      : undefined;
  const image = disp ?? img ?? orig;

  const name = typeof nft.name === 'string' && nft.name.trim() ? nft.name.trim() : undefined;
  const openseaUrl = typeof nft.opensea_url === 'string' ? nft.opensea_url : undefined;

  return { contract, tokenId, name, image, openseaUrl };
}

/**
 * NFTs OpenSea indexes for `owner` (here: a TBA contract address). Caps total fetches for API cost.
 */
export async function fetchOpenSeaNftsForOwner(
  key: string,
  owner: `0x${string}`,
  maxTotal: number,
): Promise<{ nfts: TbaBackpackNft[]; truncated: boolean }> {
  const ownerLc = owner.toLowerCase() as `0x${string}`;
  const nfts: TbaBackpackNft[] = [];
  let next: string | undefined;
  const perPage = 50;

  while (nfts.length < maxTotal) {
    const limit = Math.min(perPage, maxTotal - nfts.length);
    const url = new URL(
      `${OPENSEA}/api/v2/chain/ethereum/account/${encodeURIComponent(ownerLc)}/nfts`,
    );
    url.searchParams.set('limit', String(limit));
    if (next) url.searchParams.set('next', next);

    const res = await fetch(url.toString(), {
      headers: osHeaders(key),
      signal: AbortSignal.timeout(22_000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`opensea_account_nfts_${res.status}:${text.slice(0, 120)}`);
    }

    const data = (await res.json()) as { nfts?: unknown[]; next?: string };
    const batch = Array.isArray(data.nfts) ? data.nfts : [];
    for (const raw of batch) {
      if (raw == null || typeof raw !== 'object') continue;
      const row = mapAccountNft(raw as Record<string, unknown>);
      if (row) nfts.push(row);
    }

    const cursor = typeof data.next === 'string' && data.next.length > 0 ? data.next : undefined;
    if (!cursor || batch.length === 0) {
      return { nfts, truncated: false };
    }
    if (nfts.length >= maxTotal) {
      return { nfts, truncated: true };
    }
    next = cursor;
  }

  return { nfts, truncated: false };
}

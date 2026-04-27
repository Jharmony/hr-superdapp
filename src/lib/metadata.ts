import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { HOODRATS_ADDRESS, hoodratsAbi } from './contract';
import { resolveUri } from './uri';

export type NftMetadataAttributeRow = {
  trait_type?: string;
  traitType?: string;
  key?: string;
  value?: string | number;
};

export type NftMetadata = {
  name?: string;
  description?: string;
  image?: string;
  animation_url?: string;
  /** OpenSea-style `trait_type`; some gateways use `traitType` or `key` for the same field. */
  attributes?: NftMetadataAttributeRow[];
  /** Some tokens (incl. older / gateway JSON) put traits here instead of `attributes`. */
  properties?: Record<string, unknown>;
};

/**
 * Flattens `attributes[]` to stable `{ trait_type, value }` rows (supports `traitType` / `key`).
 * Does **not** merge `properties` — that object often holds files/stats; feeding it into trait
 * rules makes `/cloth/i` etc. match random keys and breaks the main rig (shirtless / visibility).
 */
export function normalizeNftAttributesToTraits(meta: NftMetadata): NftMetadataAttributeRow[] {
  const out: NftMetadataAttributeRow[] = [];
  if (!Array.isArray(meta.attributes)) return out;

  for (const a of meta.attributes) {
    if (!a) continue;
    const labelRaw = a.trait_type ?? a.traitType ?? a.key;
    const val = a.value;
    if (labelRaw == null || val == null) continue;
    const lt = String(labelRaw).trim();
    if (!lt) continue;
    out.push({
      trait_type: lt,
      value: typeof val === 'number' ? val : String(val).trim(),
    });
  }

  return out;
}

/** Server / build-time only — used by Astro `getStaticPaths` prerender. */
export function createMetadataPublicClient() {
  const rpc =
    (import.meta.env.PUBLIC_ETH_RPC_URL as string | undefined)?.trim() ||
    'https://ethereum.publicnode.com';
  return createPublicClient({
    chain: mainnet,
    transport: http(rpc),
  });
}

export async function readTokenUri(
  client: ReturnType<typeof createMetadataPublicClient>,
  tokenId: number,
): Promise<string> {
  return client.readContract({
    address: HOODRATS_ADDRESS,
    abi: hoodratsAbi,
    functionName: 'tokenURI',
    args: [BigInt(tokenId)],
  }) as Promise<string>;
}

export async function fetchTokenMetadata(
  client: ReturnType<typeof createMetadataPublicClient>,
  tokenId: number,
): Promise<NftMetadata | null> {
  try {
    const raw = await readTokenUri(client, tokenId);
    const url = resolveUri(raw);
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as NftMetadata;
  } catch {
    return null;
  }
}

import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { HOODRATS_ADDRESS, hoodratsAbi } from './contract';
import { resolveUri } from './uri';

export type NftMetadata = {
  name?: string;
  description?: string;
  image?: string;
  animation_url?: string;
  /** OpenSea-style `trait_type`; some gateways use `traitType` or `key` for the same field. */
  attributes?: {
    trait_type?: string;
    traitType?: string;
    key?: string;
    value?: string | number;
  }[];
};

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

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { hoodratsChainId } from '../lib/chain';
import { HOODRATS_ADDRESS, hoodratsAbi } from '../lib/contract';
import type { NftMetadata } from '../lib/metadata';
import type { TraitAttr } from '../lib/traitVisual';
import { resolveUri } from '../lib/uri';

type BackpackJson = {
  nfts?: { contract: string; tokenId: string }[];
  error?: string;
};

const HOODRATS_LC = HOODRATS_ADDRESS.toLowerCase();

/**
 * For 3D worlds: how many NFTs OpenSea lists in the active rat’s TBA, plus traits for the first
 * Hoodrat NFT in that backpack (pet companion tint).
 */
export function useBackpackWorldVisuals(activeTokenId: number | null): {
  backpackNftCount: number;
  companionTraitAttributes: TraitAttr[] | undefined;
} {
  const backpackQ = useQuery({
    queryKey: ['backpack-world-visual', activeTokenId],
    queryFn: async () => {
      if (activeTokenId == null) return { nfts: [] as { contract: string; tokenId: string }[] };
      const res = await fetch(
        `/api/tba/backpack.json?tokenId=${encodeURIComponent(String(activeTokenId))}`,
      );
      const j = (await res.json()) as BackpackJson;
      if (!res.ok || j.error) return { nfts: [] as { contract: string; tokenId: string }[] };
      return { nfts: Array.isArray(j.nfts) ? j.nfts : [] };
    },
    enabled: activeTokenId != null,
    staleTime: 30_000,
  });

  const nfts = backpackQ.data?.nfts ?? [];
  const backpackNftCount = nfts.length;

  const companionEntry = useMemo(() => {
    return nfts.find((n) => n.contract?.toLowerCase() === HOODRATS_LC) ?? null;
  }, [nfts]);

  const companionTokenId = companionEntry ? Number(companionEntry.tokenId) : null;
  const validCompanionId =
    companionTokenId != null && Number.isFinite(companionTokenId) && companionTokenId > 0
      ? companionTokenId
      : null;

  const { data: rawUri } = useReadContract({
    chainId: hoodratsChainId,
    address: HOODRATS_ADDRESS,
    abi: hoodratsAbi,
    functionName: 'tokenURI',
    args: [BigInt(validCompanionId ?? 0)],
    query: { enabled: validCompanionId != null },
  });

  const metaQ = useQuery({
    queryKey: ['backpack-companion-meta', validCompanionId, rawUri],
    queryFn: async () => {
      const url = resolveUri(rawUri as string);
      const res = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as NftMetadata;
    },
    enabled: typeof rawUri === 'string' && rawUri.length > 0 && validCompanionId != null,
    retry: 1,
  });

  const companionTraitAttributes = useMemo((): TraitAttr[] | undefined => {
    if (validCompanionId == null) return undefined;
    if (!metaQ.data) return undefined;
    return metaQ.data.attributes ?? [];
  }, [validCompanionId, metaQ.data]);

  return { backpackNftCount, companionTraitAttributes };
}

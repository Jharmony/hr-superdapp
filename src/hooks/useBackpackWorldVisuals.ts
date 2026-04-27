import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { hoodratsChainId } from '../lib/chain';
import { HOODRATS_ADDRESS, hoodratsAbi } from '../lib/contract';
import { normalizeNftAttributesToTraits, type NftMetadata } from '../lib/metadata';
import { mergeCompanionChainAndOpenSeaTraits, type TraitAttr } from '../lib/traitVisual';
import { resolveUri } from '../lib/uri';

type BackpackJson = {
  nfts?: { contract: string; tokenId: string; traits?: { trait_type: string; value: string | number }[] }[];
  error?: string;
};

const HOODRATS_LC = HOODRATS_ADDRESS.toLowerCase();

/**
 * For 3D worlds: how many NFTs OpenSea lists in the active rat’s TBA, plus traits for the first
 * Hoodrat NFT in that backpack (pet companion tint).
 */
export function useBackpackWorldVisuals(activeTokenId: number | null): {
  backpackNftCount: number;
  /** Backpack Hoodrat token used as the in-world pet (same id as `tokenURI` fetch). */
  companionTokenId: number | null;
  companionTraitAttributes: TraitAttr[] | undefined;
} {
  const backpackQ = useQuery({
    queryKey: ['backpack-world-visual', activeTokenId],
    queryFn: async () => {
      if (activeTokenId == null) return { nfts: [] as BackpackJson['nfts'] };
      const res = await fetch(
        `/api/tba/backpack.json?tokenId=${encodeURIComponent(String(activeTokenId))}`,
      );
      const j = (await res.json()) as BackpackJson;
      if (!res.ok || j.error) return { nfts: [] as BackpackJson['nfts'] };
      return { nfts: Array.isArray(j.nfts) ? j.nfts : [] };
    },
    enabled: activeTokenId != null,
    staleTime: 30_000,
  });

  const nfts = backpackQ.data?.nfts ?? [];
  const backpackNftCount = nfts.length;

  const companionEntry = useMemo(() => {
    const hoodrats = nfts.filter((n) => n.contract?.toLowerCase() === HOODRATS_LC);
    if (hoodrats.length === 0) return null;
    // Prefer a different token id than the active rat if possible (avoids “same tint” confusion).
    if (activeTokenId != null) {
      const alt = hoodrats.find((n) => Number(n.tokenId) !== activeTokenId);
      if (alt) return alt;
    }
    return hoodrats[0] ?? null;
  }, [nfts, activeTokenId]);

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

  const companionOsTraitAttrs = useMemo((): TraitAttr[] | undefined => {
    const rows = companionEntry?.traits;
    if (!rows?.length) return undefined;
    return rows.map((r) => ({
      trait_type: r.trait_type,
      value: typeof r.value === 'number' ? r.value : String(r.value).trim(),
    }));
  }, [companionEntry]);

  const companionTraitAttributes = useMemo((): TraitAttr[] | undefined => {
    if (validCompanionId == null) return undefined;
    const fromChain = metaQ.data ? normalizeNftAttributesToTraits(metaQ.data) : [];
    const merged = mergeCompanionChainAndOpenSeaTraits(fromChain, companionOsTraitAttrs);

    if (merged.length > 0) return merged;

    const uriReady = typeof rawUri === 'string' && rawUri.length > 0;
    const chainStillLoading =
      uriReady && (metaQ.isPending || metaQ.isLoading) && validCompanionId != null;
    if (chainStillLoading && !companionOsTraitAttrs?.length) return undefined;

    return merged;
  }, [
    validCompanionId,
    rawUri,
    metaQ.data,
    metaQ.isPending,
    metaQ.isLoading,
    companionOsTraitAttrs,
  ]);

  return {
    backpackNftCount,
    companionTokenId: validCompanionId,
    companionTraitAttributes,
  };
}

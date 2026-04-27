import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { clearActiveHoodratTokenId, readActiveHoodratTokenId } from '../lib/activeHoodratStorage';
import { hoodratsChainId } from '../lib/chain';
import { HOODRATS_ADDRESS, hoodratsAbi } from '../lib/contract';
import type { NftMetadata } from '../lib/metadata';
import type { TraitAttr } from '../lib/traitVisual';
import { resolveUri } from '../lib/uri';

/**
 * Metadata traits for the wallet’s **active** Hoodrat (My Hoodrats), validated against
 * `tokensOfOwner`. Used by 3D worlds so the in-world GLB matches tribe / skin tint.
 */
export function useActiveHoodratTraitAttributes(): {
  /** `undefined` = use default untinted rig; array = pass to `applyTraitAttributesToScene` */
  traitAttributes: TraitAttr[] | undefined;
  activeTokenId: number | null;
} {
  const { address, isConnected } = useAccount();
  const wallet = address?.toLowerCase();
  const [, setBump] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'superdapp:activeHoodrat:v1') setBump((n) => n + 1);
    };
    const onCustom = () => setBump((n) => n + 1);
    window.addEventListener('storage', onStorage);
    window.addEventListener('superdapp:activeHoodratChanged', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('superdapp:activeHoodratChanged', onCustom);
    };
  }, []);

  const storedId = wallet && isConnected ? readActiveHoodratTokenId(wallet) : null;

  const { data: tokenIds } = useReadContract({
    chainId: hoodratsChainId,
    address: HOODRATS_ADDRESS,
    abi: hoodratsAbi,
    functionName: 'tokensOfOwner',
    args: [address!],
    query: { enabled: Boolean(address && isConnected) },
  });

  const ownedSet = useMemo(() => {
    if (!tokenIds || !Array.isArray(tokenIds)) return null as Set<number> | null;
    return new Set([...tokenIds].map((b) => Number(b)));
  }, [tokenIds]);

  const validTokenId = useMemo(() => {
    if (storedId == null) return null;
    if (ownedSet === null) return null;
    if (!ownedSet.has(storedId)) return null;
    return storedId;
  }, [storedId, ownedSet]);

  useEffect(() => {
    if (!wallet || storedId == null || ownedSet === null) return;
    if (!ownedSet.has(storedId)) {
      clearActiveHoodratTokenId(wallet);
    }
  }, [wallet, storedId, ownedSet]);

  const { data: rawUri } = useReadContract({
    chainId: hoodratsChainId,
    address: HOODRATS_ADDRESS,
    abi: hoodratsAbi,
    functionName: 'tokenURI',
    args: [BigInt(validTokenId ?? 0)],
    query: { enabled: validTokenId != null },
  });

  const { data: meta } = useQuery({
    queryKey: ['hoodrat-meta-world-active', validTokenId, rawUri],
    queryFn: async () => {
      const url = resolveUri(rawUri as string);
      const res = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as NftMetadata;
    },
    enabled: typeof rawUri === 'string' && rawUri.length > 0 && validTokenId != null,
    retry: 1,
  });

  const traitAttributes = useMemo((): TraitAttr[] | undefined => {
    if (validTokenId == null) return undefined;
    if (!meta) return undefined;
    return meta.attributes ?? [];
  }, [validTokenId, meta]);

  return { traitAttributes, activeTokenId: validTokenId };
}

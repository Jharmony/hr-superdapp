import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import {
  clearActiveHoodratTokenId,
  readActiveHoodratTokenId,
} from '../../lib/activeHoodratStorage';
import { hoodratsChainId } from '../../lib/chain';
import { HOODRATS_ADDRESS, hoodratsAbi } from '../../lib/contract';
import type { NftMetadata } from '../../lib/metadata';
import { resolveUri } from '../../lib/uri';
import { FallbackImage } from '../media/FallbackImage';

const LS_KEY = 'superdapp:activeHoodrat:v1';

/**
 * Compact “profile” for the wallet’s active Hoodrat (worlds + My Hoodrats), shown in the header.
 */
export function NavActiveRatChip() {
  const { address, isConnected } = useAccount();
  const wallet = address?.toLowerCase();
  const [, setBump] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const on = () => setBump((n) => n + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) on();
    };
    window.addEventListener('superdapp:activeHoodratChanged', on);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('superdapp:activeHoodratChanged', on);
      window.removeEventListener('storage', onStorage);
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

  const validId = useMemo(() => {
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
    args: [BigInt(validId ?? 0)],
    query: { enabled: validId != null },
  });

  const { data: meta } = useQuery({
    queryKey: ['hoodrat-meta-nav-chip', validId, rawUri],
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
    enabled: typeof rawUri === 'string' && rawUri.length > 0 && validId != null,
    staleTime: 60_000,
    retry: 1,
  });

  if (!isConnected || validId == null) return null;

  const img = meta?.image ? resolveUri(meta.image) : undefined;
  const label = meta?.name?.trim() || `#${validId}`;

  return (
    <a
      href={`/rats/${validId}/`}
      title={`Active rat for 3D worlds — ${label}. Opens token page.`}
      className="flex max-w-[10.5rem] items-center gap-2 rounded-lg border border-lime-500/35 bg-lime-950/30 py-1.5 pl-1 pr-2.5 transition hover:border-lime-400/50 hover:bg-lime-950/45"
    >
      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-zinc-700/80 bg-zinc-900">
        {img ? (
          <FallbackImage
            src={img}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-lime-200/80">
            #{validId}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-lime-300/90">
          Active
        </span>
        <span className="block truncate text-[11px] font-semibold text-zinc-100">{label}</span>
      </span>
    </a>
  );
}

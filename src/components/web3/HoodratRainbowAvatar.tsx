import type { AvatarComponent } from '@rainbow-me/rainbowkit';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import {
  clearActiveHoodratTokenId,
  readActiveHoodratTokenId,
} from '../../lib/activeHoodratStorage';
import { hoodratsChainId } from '../../lib/chain';
import { HOODRATS_ADDRESS, hoodratsAbi } from '../../lib/contract';
import type { NftMetadata } from '../../lib/metadata';
import { resolveUri } from '../../lib/uri';
import { FallbackImage } from '../media/FallbackImage';

function addressHue(address: string): string {
  const hex = address.slice(2, 10) || '0';
  const n = Number.parseInt(hex, 16) || 0;
  const h = n % 360;
  return `hsl(${h} 42% 32%)`;
}

/**
 * RainbowKit `avatar` override: active Hoodrat art when set + owned; else ENS; else address glyph.
 */
export const HoodratRainbowAvatar: AvatarComponent = ({ address, ensImage, size }) => {
  const wallet = address.trim().toLowerCase();
  const storedId = wallet.startsWith('0x') ? readActiveHoodratTokenId(wallet) : null;

  const { data: tokenIds } = useReadContract({
    chainId: hoodratsChainId,
    address: HOODRATS_ADDRESS,
    abi: hoodratsAbi,
    functionName: 'tokensOfOwner',
    args: [address as `0x${string}`],
    query: { enabled: wallet.startsWith('0x') },
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
    if (!wallet.startsWith('0x') || storedId == null || ownedSet === null) return;
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

  const hoodratSrc =
    validId != null && meta?.image?.trim() ? resolveUri(meta.image.trim()) : null;

  const s = `${size}px`;
  const wrapClass = 'overflow-hidden rounded-full ring-1 ring-zinc-600/50';

  if (hoodratSrc) {
    return (
      <span className={wrapClass} style={{ width: s, height: s }} title="Active Hoodrat">
        <FallbackImage
          src={hoodratSrc}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }

  if (ensImage) {
    return (
      <span className={wrapClass} style={{ width: s, height: s }} aria-hidden>
        <img
          alt=""
          src={ensImage}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }

  const bg = addressHue(address);
  const initials = (address.slice(2, 4) || '0x').toUpperCase();

  return (
    <span
      className={`${wrapClass} flex items-center justify-center font-mono font-bold text-white/90`}
      style={{ width: s, height: s, background: bg, fontSize: Math.max(10, size * 0.32) }}
      aria-hidden
    >
      {initials}
    </span>
  );
};

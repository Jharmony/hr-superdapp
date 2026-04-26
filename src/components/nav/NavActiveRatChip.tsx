import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import {
  clearActiveHoodratTokenId,
  readActiveHoodratTokenId,
  writeActiveHoodratTokenId,
} from '../../lib/activeHoodratStorage';
import { hoodratsChainId } from '../../lib/chain';
import { HOODRATS_ADDRESS, hoodratsAbi } from '../../lib/contract';
import { resolveUri } from '../../lib/uri';
import { FallbackImage } from '../media/FallbackImage';

const LS_KEY = 'superdapp:activeHoodrat:v1';

const linkRow =
  'block w-full px-2.5 py-2 text-left text-xs font-medium text-zinc-300 transition hover:bg-zinc-800/80 hover:text-lime-200';

/**
 * Active Hoodrat in the header: opens a menu to switch among owned tokens from anywhere.
 */
export function NavActiveRatChip() {
  const { address, isConnected } = useAccount();
  const wallet = address?.toLowerCase();
  const [, setBump] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

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

  const ownedIds = useMemo(() => {
    if (!tokenIds || !Array.isArray(tokenIds)) return [] as number[];
    return [...tokenIds].map((b) => Number(b)).sort((a, b) => a - b);
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
      return (await res.json()) as { name?: string; image?: string };
    },
    enabled: typeof rawUri === 'string' && rawUri.length > 0 && validId != null,
    staleTime: 60_000,
    retry: 1,
  });

  if (!isConnected || validId == null) return null;

  const img = meta?.image ? resolveUri(meta.image) : undefined;
  const label = meta?.name?.trim() || `#${validId}`;
  const listLoading = tokenIds === undefined;

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        aria-label="Active Hoodrat menu — switch rat or open token page"
        onClick={() => setMenuOpen((o) => !o)}
        className="flex h-9 max-w-[9.5rem] items-center gap-1 rounded-lg border border-lime-500/30 bg-lime-950/25 py-0.5 pl-0.5 pr-1.5 text-left transition hover:border-lime-400/45 hover:bg-lime-950/40 md:max-w-[10rem]"
      >
        <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-zinc-700/70 bg-zinc-900">
          {img ? (
            <FallbackImage
              src={img}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[9px] font-bold text-lime-200/85">
              #{validId}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 text-left leading-tight">
          <span className="block text-[7px] font-bold uppercase tracking-[0.12em] text-lime-400/95">
            Active
          </span>
          <span className="block truncate text-[10px] font-semibold text-zinc-100">{label}</span>
        </span>
        <span
          className={`inline-block shrink-0 text-[9px] text-zinc-500 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {menuOpen ? (
        <div
          role="listbox"
          className="absolute right-0 top-[calc(100%+4px)] z-[200] w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-zinc-700 bg-zinc-950 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
        >
          <p className="border-b border-zinc-800/90 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Switch active rat
          </p>
          <div className="max-h-52 overflow-y-auto py-0.5">
            {listLoading ? (
              <p className="px-2.5 py-2 text-xs text-zinc-500">Loading your rats…</p>
            ) : ownedIds.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-zinc-500">No Hoodrats in this wallet.</p>
            ) : (
              ownedIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={id === validId}
                  className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition hover:bg-zinc-800/80 ${
                    id === validId ? 'bg-lime-950/25 text-lime-100' : 'text-zinc-200'
                  }`}
                  onClick={() => {
                    if (wallet) writeActiveHoodratTokenId(wallet, id);
                    setBump((n) => n + 1);
                    setMenuOpen(false);
                  }}
                >
                  <span className="font-mono font-semibold">#{id}</span>
                  {id === validId ? (
                    <span className="shrink-0 text-[10px] font-bold text-lime-400">✓</span>
                  ) : null}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-zinc-800/90 pt-0.5">
            <a
              href={`/rats/${validId}/`}
              className={linkRow}
              onClick={() => setMenuOpen(false)}
            >
              Open token #{validId}
            </a>
            <a href="/my-hoodrats/" className={linkRow} onClick={() => setMenuOpen(false)}>
              My Hoodrats
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { etherscanAddressUrl } from '../../lib/nftMarketLinks';
import { FallbackImage } from '../media/FallbackImage';

type BackpackNft = {
  contract: string;
  tokenId: string;
  name?: string;
  image?: string;
  openseaUrl?: string;
};

type Erc20Row = { symbol: string; amount: string };

type BackpackPayload = {
  tbaAddress?: string;
  nfts?: BackpackNft[];
  truncated?: boolean;
  inventoryUnavailableReason?: string;
  error?: string;
  nativeWei?: string;
  nativeEth?: string;
  erc20?: Erc20Row[];
};

function shortEth(s: string | undefined): string {
  if (s == null || s === '') return '—';
  const n = Number(s);
  if (!Number.isFinite(n)) return s.slice(0, 10);
  if (n === 0) return '0';
  if (n < 1e-8) return n.toExponential(2);
  if (n < 1) return n.toFixed(6).replace(/\.?0+$/, '');
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/**
 * Read-only Tokenbound backpack HUD for 3D worlds (inventory + ETH / USDC / WETH on TBA).
 */
export function WorldTbaHud({ activeTokenId }: { activeTokenId: number | null }) {
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ['world-tba-backpack', activeTokenId],
    queryFn: async () => {
      if (activeTokenId == null) return null;
      const res = await fetch(
        `/api/tba/backpack.json?tokenId=${encodeURIComponent(String(activeTokenId))}`,
      );
      const j = (await res.json()) as BackpackPayload;
      if (!res.ok) throw new Error(j.error ?? 'backpack_failed');
      return j;
    },
    enabled: activeTokenId != null,
    staleTime: 45_000,
  });

  const copyTba = useCallback(async () => {
    const a = q.data?.tbaAddress;
    if (!a || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(a);
    } catch {
      /* ignore */
    }
  }, [q.data?.tbaAddress]);

  if (activeTokenId == null) {
    return (
      <div className="pointer-events-auto absolute bottom-4 left-3 z-[228] max-w-[14rem] rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-3 py-2 text-[10px] leading-snug text-zinc-400 shadow-lg backdrop-blur-sm md:bottom-5 md:left-4">
        No active Hoodrat — choose one from the header <span className="text-zinc-300">Active</span> menu or{' '}
        <a href="/my-hoodrats/" className="text-lime-300 underline hover:text-lime-200">
          My Hoodrats
        </a>
        .
      </div>
    );
  }

  const data = q.data;
  const tba = data?.tbaAddress?.trim();
  const nfts = Array.isArray(data?.nfts) ? data!.nfts! : [];
  const noInv = data?.inventoryUnavailableReason === 'opensea_key_required';

  return (
    <div className="pointer-events-auto absolute bottom-4 left-3 z-[228] md:bottom-5 md:left-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full max-w-[15rem] items-center justify-between gap-2 rounded-xl border border-cyan-500/35 bg-zinc-950/92 px-3 py-2 text-left shadow-lg backdrop-blur-sm transition hover:border-cyan-400/50 hover:bg-zinc-950"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200/90">
          Backpack
        </span>
        <span className="font-mono text-[11px] text-zinc-200">#{activeTokenId}</span>
        <span className={`text-[9px] text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open ? (
        <div className="mt-1 max-h-[min(52vh,22rem)] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-zinc-700/90 bg-zinc-950/95 p-3 text-xs shadow-2xl backdrop-blur-md">
          {q.isLoading ? (
            <p className="text-zinc-500">Loading backpack…</p>
          ) : q.isError ? (
            <p className="text-red-300/90">Could not load backpack.</p>
          ) : (
            <>
              {tba ? (
                <div className="space-y-1 border-b border-zinc-800 pb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Tokenbound account
                  </p>
                  <p className="break-all font-mono text-[10px] text-lime-200/90">{tba}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void copyTba()}
                      className="rounded border border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-300 hover:border-lime-500/40"
                    >
                      Copy
                    </button>
                    <a
                      href={etherscanAddressUrl(tba)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-300 hover:border-lime-500/40"
                    >
                      Etherscan
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="mt-2 space-y-1 border-b border-zinc-800 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Balances</p>
                <p className="flex justify-between gap-2 text-zinc-200">
                  <span className="text-zinc-500">ETH</span>
                  <span className="font-mono text-[11px]">{shortEth(data?.nativeEth)}</span>
                </p>
                {(data?.erc20 ?? []).map((row) => (
                  <p key={row.symbol} className="flex justify-between gap-2 text-zinc-200">
                    <span className="text-zinc-500">{row.symbol}</span>
                    <span className="min-w-0 truncate font-mono text-[11px]" title={row.amount}>
                      {row.amount}
                    </span>
                  </p>
                ))}
              </div>

              {noInv ? (
                <p className="mt-2 text-[10px] text-amber-200/85">
                  NFT list needs <code className="text-amber-100">OPENSEA_API_KEY</code> on the server.
                </p>
              ) : nfts.length ? (
                <div className="mt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    NFTs ({nfts.length}
                    {data?.truncated ? '+' : ''})
                  </p>
                  <ul className="mt-1 grid grid-cols-3 gap-1.5">
                    {nfts.slice(0, 12).map((nft) => {
                      const key = `${nft.contract}-${nft.tokenId}`;
                      const img = nft.image?.trim();
                      const inner = img ? (
                        <FallbackImage
                          src={img}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[8px] text-zinc-600">
                          #{nft.tokenId}
                        </span>
                      );
                      const wrap = (
                        <div className="aspect-square overflow-hidden rounded-md border border-zinc-800 bg-zinc-900">
                          {inner}
                        </div>
                      );
                      return (
                        <li key={key}>
                          {nft.openseaUrl ? (
                            <a href={nft.openseaUrl} target="_blank" rel="noreferrer" className="block">
                              {wrap}
                            </a>
                          ) : (
                            wrap
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : !noInv ? (
                <p className="mt-2 text-[10px] text-zinc-500">No NFTs indexed for this TBA yet.</p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

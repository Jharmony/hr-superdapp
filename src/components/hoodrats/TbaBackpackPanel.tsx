import { useCallback, useEffect, useState } from 'react';
import { etherscanAddressUrl, openSeaAddressUrl } from '../../lib/nftMarketLinks';
import { FallbackImage } from '../media/FallbackImage';
import { TbaBackpackTransferButton } from './TbaBackpackTransferButton';

type BackpackNft = {
  contract: string;
  tokenId: string;
  name?: string;
  image?: string;
  openseaUrl?: string;
};

type BackpackJson = {
  tbaAddress?: string;
  nfts?: BackpackNft[];
  truncated?: boolean;
  inventoryUnavailableReason?: string;
  error?: string;
  message?: string;
};

const linkChip =
  'inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/50';

export function TbaBackpackPanel({ tokenId }: { tokenId: number }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BackpackJson | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    const u = `/api/tba/backpack.json?tokenId=${encodeURIComponent(String(tokenId))}`;
    fetch(u)
      .then(async (res) => {
        const j = (await res.json()) as BackpackJson;
        if (!cancelled) setData(j);
      })
      .catch(() => {
        if (!cancelled) setData({ error: 'fetch_failed' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tokenId, reloadTick]);

  const tba = data?.tbaAddress?.trim();

  const copyAddress = useCallback(async () => {
    if (!tba || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(tba);
      setCopyHint('Copied');
      window.setTimeout(() => setCopyHint(null), 2000);
    } catch {
      setCopyHint('Copy failed');
      window.setTimeout(() => setCopyHint(null), 2000);
    }
  }, [tba]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/60 p-5 text-sm text-zinc-500">
        Loading Tokenbound backpack…
      </div>
    );
  }

  if (data?.error && !tba) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-5 text-sm text-red-200/90">
        Could not load backpack data
        {data.message ? `: ${data.message}` : '.'}
      </div>
    );
  }

  const nfts = Array.isArray(data?.nfts) ? data!.nfts! : [];
  const truncated = Boolean(data?.truncated);
  const noInventoryKey = data?.inventoryUnavailableReason === 'opensea_key_required';

  return (
    <section
      className="rounded-2xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900/55 via-zinc-950/70 to-zinc-950 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
      aria-labelledby={`tba-backpack-${tokenId}`}
    >
      <h2 id={`tba-backpack-${tokenId}`} className="text-lg font-bold text-white">
        Tokenbound backpack
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        ERC-6551 account for this Hoodrat — holds NFTs and assets like a wallet tied to the token.
      </p>

      {tba ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 break-all font-mono text-xs text-lime-200/90">{tba}</p>
            <button
              type="button"
              onClick={() => void copyAddress()}
              className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-lime-500/40 hover:bg-zinc-800/80"
            >
              {copyHint ?? 'Copy address'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={etherscanAddressUrl(tba)}
              target="_blank"
              rel="noreferrer"
              className={`${linkChip} border-zinc-600/50 bg-zinc-900/50 text-zinc-200 hover:border-lime-500/35 hover:bg-zinc-800/60`}
            >
              Etherscan
            </a>
            <a
              href={openSeaAddressUrl(tba)}
              target="_blank"
              rel="noreferrer"
              className={`${linkChip} border-sky-500/35 bg-sky-950/25 text-sky-100 hover:border-sky-400/50 hover:bg-sky-950/40`}
            >
              OpenSea profile
            </a>
          </div>
        </div>
      ) : null}

      {noInventoryKey ? (
        <p className="mt-4 text-xs text-amber-200/80">
          NFT inventory is hidden until <code className="text-amber-100/90">OPENSEA_API_KEY</code> is set
          on the server. The TBA address above is still valid on-chain.
        </p>
      ) : null}

      {nfts.length > 0 ? (
        <>
          <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            NFTs in this backpack
          </h3>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {nfts.map((nft) => {
              const key = `${nft.contract}-${nft.tokenId}`;
              const label = nft.name?.trim() || `#${nft.tokenId}`;
              const transferBlock =
                tba && nft.contract?.startsWith('0x') ? (
                  <TbaBackpackTransferButton
                    parentTokenId={tokenId}
                    tbaAddress={tba as `0x${string}`}
                    nftContract={nft.contract as `0x${string}`}
                    nftTokenId={nft.tokenId}
                    onTransferred={() => setReloadTick((n) => n + 1)}
                  />
                ) : null;
              const thumb = (
                <div className="relative aspect-square w-full overflow-hidden bg-zinc-900">
                  {nft.image ? (
                    <FallbackImage
                      src={nft.image}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-2 text-center text-[0.65rem] text-zinc-600">
                      No image
                    </div>
                  )}
                </div>
              );
              const caption = (
                <p className="line-clamp-2 p-2 text-[0.7rem] font-medium leading-snug text-zinc-200">
                  {label}
                </p>
              );
              if (nft.openseaUrl) {
                return (
                  <li key={key}>
                    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 transition hover:border-sky-500/35">
                      <a href={nft.openseaUrl} target="_blank" rel="noreferrer" className="block">
                        {thumb}
                        {caption}
                      </a>
                      <div className="border-t border-zinc-800/80 px-2 pb-2">{transferBlock}</div>
                    </div>
                  </li>
                );
              }
              return (
                <li
                  key={key}
                  className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80"
                >
                  {thumb}
                  {caption}
                  {transferBlock}
                </li>
              );
            })}
          </ul>
          {truncated ? (
            <p className="mt-3 text-xs text-zinc-500">Showing the first {nfts.length} NFTs; more may exist on-chain.</p>
          ) : null}
        </>
      ) : !noInventoryKey && tba ? (
        <p className="mt-6 text-sm text-zinc-500">
          No NFTs indexed for this address yet — the account may be empty, not deployed, or not yet
          picked up by OpenSea.
        </p>
      ) : null}
    </section>
  );
}

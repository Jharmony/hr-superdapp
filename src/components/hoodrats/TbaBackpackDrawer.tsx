import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { etherscanAddressUrl, openSeaAddressUrl } from '../../lib/nftMarketLinks';
import { FallbackImage } from '../media/FallbackImage';

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

function BackpackIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M9 7V6a3 3 0 0 1 6 0v1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M6 9h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 14v2M15 14v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Floating backpack control + slide-over panel for the Tokenbound account tied to this token.
 * Renders the trigger as a sibling overlay on a relatively positioned GLB preview.
 */
export function TbaBackpackDrawer({ tokenId, children }: { tokenId: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loadRequested, setLoadRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BackpackJson | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  useEffect(() => {
    setOpen(false);
    setLoadRequested(false);
    setData(null);
    setLoading(false);
    setCopyHint(null);
  }, [tokenId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!loadRequested || data !== null) return;
    let cancelled = false;
    setLoading(true);
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
  }, [loadRequested, tokenId, data]);

  const requestOpen = useCallback(() => {
    setLoadRequested(true);
    setOpen(true);
  }, []);

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

  const nfts = Array.isArray(data?.nfts) ? data.nfts : [];
  const truncated = Boolean(data?.truncated);
  const noInventoryKey = data?.inventoryUnavailableReason === 'opensea_key_required';

  const drawer =
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div className="fixed inset-0 z-[200] flex justify-end" role="presentation">
        <button
          type="button"
          className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
          aria-label="Close backpack"
          onClick={() => setOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`tba-drawer-title-${tokenId}`}
          className="relative z-[1] flex h-[100dvh] w-[min(100%,22rem)] flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <h2 id={`tba-drawer-title-${tokenId}`} className="text-base font-bold text-white">
              Backpack
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {loading && !data ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : data?.error && !tba ? (
              <p className="text-sm text-red-300/90">
                Could not load backpack{data.message ? `: ${data.message}` : '.'}
              </p>
            ) : (
              <>
                <p className="text-xs leading-relaxed text-zinc-500">
                  ERC-6551 account for this Hoodrat — NFTs and assets tied to the token.
                </p>

                {tba ? (
                  <div className="mt-4 space-y-3">
                    <p className="break-all font-mono text-[0.7rem] leading-relaxed text-lime-200/90">
                      {tba}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void copyAddress()}
                        className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-lime-500/40"
                      >
                        {copyHint ?? 'Copy address'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={etherscanAddressUrl(tba)}
                        target="_blank"
                        rel="noreferrer"
                        className={`${linkChip} border-zinc-600/50 bg-zinc-900/50 text-zinc-200 hover:border-lime-500/35`}
                      >
                        Etherscan
                      </a>
                      <a
                        href={openSeaAddressUrl(tba)}
                        target="_blank"
                        rel="noreferrer"
                        className={`${linkChip} border-sky-500/35 bg-sky-950/25 text-sky-100 hover:border-sky-400/50`}
                      >
                        OpenSea
                      </a>
                    </div>
                  </div>
                ) : null}

                {noInventoryKey ? (
                  <p className="mt-4 text-xs text-amber-200/80">
                    Inventory needs <code className="text-amber-100/90">OPENSEA_API_KEY</code> on the server.
                    The address above is still valid on-chain.
                  </p>
                ) : null}

                {nfts.length > 0 ? (
                  <>
                    <h3 className="mt-6 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      NFTs inside
                    </h3>
                    <ul className="mt-3 grid grid-cols-2 gap-2.5">
                      {nfts.map((nft) => {
                        const key = `${nft.contract}-${nft.tokenId}`;
                        const label = nft.name?.trim() || `#${nft.tokenId}`;
                        const inner = (
                          <>
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
                                <div className="flex h-full items-center justify-center p-2 text-center text-[0.6rem] text-zinc-600">
                                  No image
                                </div>
                              )}
                            </div>
                            <p className="line-clamp-2 p-1.5 text-[0.65rem] font-medium leading-snug text-zinc-200">
                              {label}
                            </p>
                          </>
                        );
                        if (nft.openseaUrl) {
                          return (
                            <li key={key}>
                              <a
                                href={nft.openseaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/80 transition hover:border-sky-500/35"
                              >
                                {inner}
                              </a>
                            </li>
                          );
                        }
                        return (
                          <li key={key} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/80">
                            {inner}
                          </li>
                        );
                      })}
                    </ul>
                    {truncated ? (
                      <p className="mt-3 text-xs text-zinc-500">
                        First {nfts.length} shown; more may exist on-chain.
                      </p>
                    ) : null}
                  </>
                ) : !noInventoryKey && tba ? (
                  <p className="mt-6 text-xs leading-relaxed text-zinc-500">
                    No NFTs indexed yet — empty, not deployed, or not on OpenSea yet.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <div className="relative">
        {children}
        <button
          type="button"
          onClick={requestOpen}
          className="absolute bottom-2 right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-600/80 bg-zinc-950/90 text-lime-200 shadow-lg backdrop-blur-sm transition hover:border-lime-400/50 hover:bg-zinc-900 hover:text-lime-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60"
          aria-label="Open Tokenbound backpack"
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <BackpackIcon className="h-[1.15rem] w-[1.15rem]" />
        </button>
      </div>
      {drawer}
    </>
  );
}

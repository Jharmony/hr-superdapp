import { useInfiniteQuery } from '@tanstack/react-query';
import { Web3Providers } from '../web3/Web3Providers';
import { SiteNav } from '../nav/SiteNav';
import { MintDockChrome } from '../mint/MintPanel';
import { HomeFooter } from '../home/HomeFooter';
import { fetchHoodratListingsPage } from '../../lib/hoodratListingsReservoir';
import {
  HOODRATS_OPENSEA_COLLECTION_URL,
  hoodratOpenSeaUrl,
} from '../../lib/nftMarketLinks';

function formatEth(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n === 0) return '0 ETH';
  if (n >= 1) return `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })} ETH`;
  if (n >= 0.0001) return `${n.toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH`;
  return `${n.toExponential(2)} ETH`;
}

function formatUsd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '';
  return `≈ $${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function MarketplaceInner() {
  const q = useInfiniteQuery({
    queryKey: ['hoodrat-market-asks'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchHoodratListingsPage(pageParam, 40),
    getNextPageParam: (last) => last.continuation ?? undefined,
  });

  const rows = q.data?.pages.flatMap((p) => p.listings) ?? [];
  const err = q.error instanceof Error ? q.message : q.error ? String(q.error) : null;

  return (
    <div className="flex min-h-svh flex-col bg-zinc-950">
      <SiteNav />
      <div className="flex min-h-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl shrink-0 px-4 py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300/90">
            Marketplace
          </p>
          <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">
            Hoodrats for sale
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
            Live asks aggregated from OpenSea and other venues via{' '}
            <a
              className="text-lime-300/90 underline hover:text-lime-200"
              href="https://reservoir.tools/"
              target="_blank"
              rel="noreferrer"
            >
              Reservoir
            </a>
            . Purchase still happens on the source (usually OpenSea). To list yours,
            open the token on{' '}
            <a
              className="text-lime-300/90 underline hover:text-lime-200"
              href={HOODRATS_OPENSEA_COLLECTION_URL}
              target="_blank"
              rel="noreferrer"
            >
              OpenSea
            </a>{' '}
            and use <strong className="text-zinc-200">List for sale</strong>, or start
            from{' '}
            <a className="text-lime-300/90 underline hover:text-lime-200" href="/my-hoodrats/">
              My Hoodrats
            </a>
            .
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={HOODRATS_OPENSEA_COLLECTION_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-lime-500/40"
            >
              Open collection on OpenSea
            </a>
            <a
              href="/my-hoodrats/"
              className="inline-flex rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_24px_rgba(163,230,53,0.2)] transition hover:bg-lime-300"
            >
              My Hoodrats
            </a>
          </div>

          <div className="mt-10">
            {q.isLoading ? (
              <p className="text-sm text-zinc-500">Loading listings…</p>
            ) : err ? (
              <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-5 text-sm text-red-200">
                <p className="font-semibold">Could not load marketplace data</p>
                <p className="mt-2 text-red-200/80">{err}</p>
                <p className="mt-3 text-xs text-zinc-500">
                  If this is a browser block (CORS) or rate limit, set{' '}
                  <code className="text-zinc-300">PUBLIC_RESERVOIR_API_KEY</code> in{' '}
                  <code className="text-zinc-300">.env</code> and rebuild, or try again
                  later.
                </p>
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
                No active fixed-price listings found for this contract right now.
                <p className="mt-4 text-xs text-zinc-600">
                  New listings may take a minute to appear. You can still trade on{' '}
                  <a
                    className="text-lime-300/90 underline"
                    href={HOODRATS_OPENSEA_COLLECTION_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    OpenSea
                  </a>
                  .
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-2xl border border-zinc-800">
                  <table className="w-full min-w-[320px] border-collapse text-left text-sm">
                    <thead className="border-b border-zinc-800 bg-zinc-900/50 text-xs uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Token</th>
                        <th className="px-4 py-3 font-semibold">Price</th>
                        <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                          Source
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">Buy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/90">
                      {rows.map((row) => (
                        <tr
                          key={row.orderId}
                          className="bg-zinc-950/40 transition hover:bg-zinc-900/35"
                        >
                          <td className="px-4 py-3 font-mono text-lime-200/90">
                            #{row.tokenId}
                          </td>
                          <td className="px-4 py-3 text-zinc-100">
                            <span className="font-semibold">{formatEth(row.priceEth)}</span>
                            {row.priceUsd != null ? (
                              <span className="ml-2 text-xs text-zinc-500">
                                {formatUsd(row.priceUsd)}
                              </span>
                            ) : null}
                          </td>
                          <td className="hidden px-4 py-3 text-xs text-zinc-500 sm:table-cell">
                            {row.sourceLabel}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <a
                              href={hoodratOpenSeaUrl(row.tokenId)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex rounded-lg border border-lime-500/35 bg-lime-950/30 px-3 py-1.5 text-xs font-bold text-lime-200 transition hover:border-lime-400/50 hover:bg-lime-950/50"
                            >
                              View / buy
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {q.hasNextPage ? (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      disabled={q.isFetchingNextPage}
                      onClick={() => void q.fetchNextPage()}
                      className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-lime-500/40 hover:bg-zinc-900/60 disabled:opacity-40"
                    >
                      {q.isFetchingNextPage ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </main>
        <div className="mt-auto w-full shrink-0">
          <HomeFooter />
        </div>
      </div>
      <MintDockChrome />
    </div>
  );
}

export function MarketplaceApp() {
  return (
    <Web3Providers>
      <MarketplaceInner />
    </Web3Providers>
  );
}

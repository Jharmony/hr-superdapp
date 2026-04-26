import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Web3Providers } from '../web3/Web3Providers';
import { SiteNav } from '../nav/SiteNav';
import { MintDockChrome } from '../mint/MintPanel';
import { HomeFooter } from '../home/HomeFooter';
import { fetchHoodratListingsPage } from '../../lib/hoodratListingsReservoir';
import { fetchHoodratsTraitCounts } from '../../lib/hoodratCollectionTraitsReservoir';
import { fetchHoodratActivityPage, type HoodratActivityType } from '../../lib/hoodratActivityReservoir';
import {
  HOODRATS_OPENSEA_COLLECTION_URL,
  hoodratOpenSeaUrl,
} from '../../lib/nftMarketLinks';
import { FallbackImage } from '../media/FallbackImage';
import { useMemo, useState } from 'react';

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
  const [mode, setMode] = useState<'listings' | 'activity'>('listings');
  const [activityTypes, setActivityTypes] = useState<HoodratActivityType[]>(['ask']);
  const [qText, setQText] = useState('');
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  const traitsQ = useQuery({
    queryKey: ['hoodrat-market-traits'],
    queryFn: () => fetchHoodratsTraitCounts(),
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const qListings = useInfiniteQuery({
    queryKey: ['hoodrat-market-asks', qText, selected],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchHoodratListingsPage(pageParam, 40),
    getNextPageParam: (last) => last.continuation ?? undefined,
    enabled: mode === 'listings',
  });

  const qActivity = useInfiniteQuery({
    queryKey: ['hoodrat-market-activity', activityTypes],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchHoodratActivityPage(activityTypes, pageParam, 60),
    getNextPageParam: (last) => last.continuation ?? undefined,
    enabled: mode === 'activity',
  });

  const allRows = qListings.data?.pages.flatMap((p) => p.listings) ?? [];
  const err =
    mode === 'listings'
      ? (qListings.error instanceof Error ? qListings.error.message : qListings.error ? String(qListings.error) : null)
      : (qActivity.error instanceof Error ? qActivity.error.message : qActivity.error ? String(qActivity.error) : null);

  const rows = useMemo(() => {
    const needle = qText.trim().toLowerCase();
    const hasSelected = Object.keys(selected).some((k) => selected[k]?.size);
    const matchSelected = (r: (typeof allRows)[number]) => {
      if (!hasSelected) return true;
      const traits = r.tokenTraits ?? {};
      for (const [trait, values] of Object.entries(selected)) {
        if (!values || values.size === 0) continue;
        const v = traits[trait];
        if (!v || !values.has(v)) return false;
      }
      return true;
    };
    const matchText = (r: (typeof allRows)[number]) => {
      if (!needle) return true;
      const idHit = String(r.tokenId).includes(needle.replace('#', ''));
      const nameHit = (r.tokenName ?? '').toLowerCase().includes(needle);
      return idHit || nameHit;
    };
    return allRows.filter((r) => matchSelected(r) && matchText(r));
  }, [allRows, qText, selected]);

  const toggle = (trait: string, value: string) => {
    setSelected((prev) => {
      const next: Record<string, Set<string>> = { ...prev };
      const s = new Set(next[trait] ?? []);
      if (s.has(value)) s.delete(value);
      else s.add(value);
      if (s.size === 0) delete next[trait];
      else next[trait] = s;
      return next;
    });
  };

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

          <div className="mt-10 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 lg:sticky lg:top-20 lg:h-[calc(100svh-6rem)] lg:overflow-auto">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                Filters
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('listings')}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    mode === 'listings'
                      ? 'border-lime-500/40 bg-lime-950/25 text-lime-100'
                      : 'border-zinc-700 bg-zinc-950/40 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  Listings
                </button>
                <button
                  type="button"
                  onClick={() => setMode('activity')}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    mode === 'activity'
                      ? 'border-lime-500/40 bg-lime-950/25 text-lime-100'
                      : 'border-zinc-700 bg-zinc-950/40 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  Activity
                </button>
              </div>

              {mode === 'activity' ? (
                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Activity types
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(['ask', 'sale', 'transfer'] as const).map((t) => {
                      const on = activityTypes.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            setActivityTypes((prev) => {
                              const s = new Set(prev);
                              if (s.has(t)) s.delete(t);
                              else s.add(t);
                              return s.size ? Array.from(s) : [t];
                            })
                          }
                          className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                            on
                              ? 'border-cyan-500/45 bg-cyan-950/25 text-cyan-100'
                              : 'border-zinc-700 bg-zinc-950/30 text-zinc-300 hover:border-zinc-600'
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-3">
                <input
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Search token id or name…"
                  disabled={mode !== 'listings'}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-lime-500/40 focus:outline-none"
                />
              </div>

              <div className="mt-4">
                {traitsQ.isLoading ? (
                  <p className="text-xs text-zinc-500">Loading trait filters…</p>
                ) : traitsQ.error ? (
                  <p className="text-xs text-zinc-500">
                    Trait filters unavailable (Reservoir). Listings may still load.
                  </p>
                ) : (
                  <div className="mt-2 space-y-4">
                    {Object.entries(traitsQ.data ?? {}).map(([trait, values]) => (
                      <details key={trait} className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                        <summary className="cursor-pointer select-none text-xs font-semibold text-zinc-200">
                          {trait}
                          <span className="ml-2 text-[10px] text-zinc-600">
                            {values.length}
                          </span>
                        </summary>
                        <div className="mt-2 max-h-56 space-y-1 overflow-auto pr-1">
                          {values.slice(0, 80).map((v) => {
                            const on = selected[trait]?.has(v.value) ?? false;
                            return (
                              <button
                                key={`${trait}:${v.value}`}
                                type="button"
                                onClick={() => toggle(trait, v.value)}
                                disabled={mode !== 'listings'}
                                className={`flex w-full items-center justify-between rounded-lg border px-2 py-1 text-left text-[11px] transition ${
                                  on
                                    ? 'border-lime-500/50 bg-lime-950/25 text-lime-100'
                                    : 'border-zinc-800 bg-zinc-950/20 text-zinc-300 hover:border-zinc-700'
                                }`}
                              >
                                <span className="truncate">{v.value}</span>
                                <span className="ml-2 shrink-0 font-mono text-[10px] text-zinc-500">
                                  {v.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            <section>
            {mode === 'listings' && qListings.isLoading ? (
              <p className="text-sm text-zinc-500">Loading listings…</p>
            ) : mode === 'activity' && qActivity.isLoading ? (
              <p className="text-sm text-zinc-500">Loading activity…</p>
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
            ) : mode === 'activity' ? (
              (() => {
                const arows = qActivity.data?.pages.flatMap((p) => p.rows) ?? [];
                if (arows.length === 0) {
                  return (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
                      No activity items returned for the selected filters yet.
                    </div>
                  );
                }
                return (
                  <>
                    <div className="overflow-hidden rounded-2xl border border-zinc-800">
                      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                        <thead className="border-b border-zinc-800 bg-zinc-900/50 text-xs uppercase tracking-wider text-zinc-500">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Type</th>
                            <th className="px-4 py-3 font-semibold">Token</th>
                            <th className="px-4 py-3 font-semibold">Price</th>
                            <th className="hidden px-4 py-3 font-semibold md:table-cell">From</th>
                            <th className="hidden px-4 py-3 font-semibold md:table-cell">To</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/90">
                          {arows.map((r) => (
                            <tr key={r.id} className="bg-zinc-950/40 transition hover:bg-zinc-900/35">
                              <td className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-cyan-200/90">
                                {r.type}
                              </td>
                              <td className="px-4 py-3 font-mono text-lime-200/90">#{r.tokenId}</td>
                              <td className="px-4 py-3 text-zinc-100">
                                <span className="font-semibold">{formatEth(r.priceEth)}</span>
                                {r.priceUsd != null ? (
                                  <span className="ml-2 text-xs text-zinc-500">{formatUsd(r.priceUsd)}</span>
                                ) : null}
                              </td>
                              <td className="hidden px-4 py-3 font-mono text-[11px] text-zinc-500 md:table-cell">
                                {r.from ? `${r.from.slice(0, 6)}…${r.from.slice(-4)}` : '—'}
                              </td>
                              <td className="hidden px-4 py-3 font-mono text-[11px] text-zinc-500 md:table-cell">
                                {r.to ? `${r.to.slice(0, 6)}…${r.to.slice(-4)}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {qActivity.hasNextPage ? (
                      <div className="mt-6 flex justify-center">
                        <button
                          type="button"
                          disabled={qActivity.isFetchingNextPage}
                          onClick={() => void qActivity.fetchNextPage()}
                          className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-lime-500/40 hover:bg-zinc-900/60 disabled:opacity-40"
                        >
                          {qActivity.isFetchingNextPage ? 'Loading…' : 'Load more'}
                        </button>
                      </div>
                    ) : null}
                  </>
                );
              })()
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
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                                {row.tokenImage ? (
                                  <FallbackImage
                                    src={row.tokenImage}
                                    alt={row.tokenName ?? `#${row.tokenId}`}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
                                    —
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-mono text-lime-200/90">#{row.tokenId}</p>
                                <p className="truncate text-xs text-zinc-500">
                                  {row.tokenName ?? 'HOODRAT'}
                                </p>
                              </div>
                            </div>
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

                {qListings.hasNextPage ? (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      disabled={qListings.isFetchingNextPage}
                      onClick={() => void qListings.fetchNextPage()}
                      className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-lime-500/40 hover:bg-zinc-900/60 disabled:opacity-40"
                    >
                      {qListings.isFetchingNextPage ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                ) : null}
              </>
            )}
            </section>
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

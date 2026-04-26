import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Web3Providers } from '../web3/Web3Providers';
import { SiteNav } from '../nav/SiteNav';
import { MintDockChrome } from '../mint/MintPanel';
import { HomeFooter } from '../home/HomeFooter';
import { fetchHoodratListingsPage } from '../../lib/hoodratListingsReservoir';
import { fetchHoodratsTraitCounts } from '../../lib/hoodratCollectionTraitsReservoir';
import { fetchHoodratActivityPage, type HoodratActivityType } from '../../lib/hoodratActivityReservoir';
import {
  fetchCollectionNftsPage,
  fetchOpenSeaCollectionStats,
  fetchOpenSeaPricing,
} from '../../lib/hoodratOpenSeaMarketExtras';
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

function intervalLabel(raw: string | undefined): string {
  if (!raw) return raw ?? '';
  if (raw === 'one_day') return '24h';
  if (raw === 'seven_day') return '7d';
  if (raw === 'thirty_day') return '30d';
  return raw.replace(/_/g, ' ');
}

function MarketplaceInner() {
  const [mode, setMode] = useState<'listings' | 'activity'>('listings');
  const [listingView, setListingView] = useState<'sale' | 'browse'>('sale');
  const [activityTypes, setActivityTypes] = useState<HoodratActivityType[]>(['ask']);
  const [qText, setQText] = useState('');
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  const selectedKey = useMemo(() => {
    const o: Record<string, string[]> = {};
    for (const [k, set] of Object.entries(selected)) {
      if (set?.size) o[k] = [...set].sort();
    }
    return JSON.stringify(o);
  }, [selected]);

  const traitsQ = useQuery({
    queryKey: ['hoodrat-market-traits'],
    queryFn: () => fetchHoodratsTraitCounts(),
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const statsQ = useQuery({
    queryKey: ['hoodrat-market-stats'],
    queryFn: () => fetchOpenSeaCollectionStats(),
    staleTime: 60_000,
    retry: 1,
  });

  const pricingQ = useQuery({
    queryKey: ['hoodrat-market-pricing'],
    queryFn: () => fetchOpenSeaPricing(),
    staleTime: 45_000,
    retry: 1,
  });

  const qListings = useInfiniteQuery({
    queryKey: ['hoodrat-market-asks', qText, selected],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchHoodratListingsPage(pageParam, 40),
    getNextPageParam: (last) => last.continuation ?? undefined,
    enabled: mode === 'listings' && listingView === 'sale',
  });

  const qBrowse = useInfiniteQuery({
    queryKey: ['hoodrat-market-browse', selectedKey],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchCollectionNftsPage(selected, pageParam, 40),
    getNextPageParam: (last) => last.continuation ?? undefined,
    enabled: mode === 'listings' && listingView === 'browse',
  });

  const qActivity = useInfiniteQuery({
    queryKey: ['hoodrat-market-activity', activityTypes],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchHoodratActivityPage(activityTypes, pageParam, 60),
    getNextPageParam: (last) => last.continuation ?? undefined,
    enabled: mode === 'activity',
  });

  const allRows = qListings.data?.pages.flatMap((p) => p.listings) ?? [];
  const browseRows = qBrowse.data?.pages.flatMap((p) => p.nfts) ?? [];

  const tokenThumbById = useMemo(() => {
    const m = new Map<number, { src: string; alternates?: string[] }>();
    for (const r of allRows) {
      if (r.tokenId == null) continue;
      if (typeof r.tokenImage === 'string' && r.tokenImage) {
        m.set(r.tokenId, {
          src: r.tokenImage,
          alternates: Array.isArray(r.tokenImageAlternates) ? r.tokenImageAlternates : undefined,
        });
      }
    }
    for (const n of browseRows) {
      if (n.tokenId == null) continue;
      if (typeof n.image === 'string' && n.image) {
        // Prefer listing images (often higher-res) if we already have them.
        if (m.has(n.tokenId)) continue;
        m.set(n.tokenId, {
          src: n.image,
          alternates: Array.isArray(n.imageFallbacks) ? n.imageFallbacks : undefined,
        });
      }
    }
    return m;
  }, [allRows, browseRows]);

  const err =
    mode === 'activity'
      ? (qActivity.error instanceof Error ? qActivity.error.message : qActivity.error ? String(qActivity.error) : null)
      : listingView === 'browse'
        ? (qBrowse.error instanceof Error ? qBrowse.error.message : qBrowse.error ? String(qBrowse.error) : null)
        : (qListings.error instanceof Error ? qListings.error.message : qListings.error ? String(qListings.error) : null);

  const rows = useMemo(() => {
    const needle = qText.trim().toLowerCase();
    const hasSelected = Object.keys(selected).some((k) => selected[k]?.size);
    const matchSelected = (r: (typeof allRows)[number]) => {
      if (!hasSelected) return true;
      const traits = r.tokenTraits ?? {};
      for (const [trait, values] of Object.entries(selected)) {
        if (!values || values.size === 0) continue;
        const raw = traits[trait];
        const v = typeof raw === 'string' ? raw.trim() : raw != null ? String(raw).trim() : '';
        if (!v) return false;
        let hit = false;
        for (const sel of values) {
          if (sel === v || sel.trim() === v) {
            hit = true;
            break;
          }
        }
        if (!hit) return false;
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

  const browseFiltered = useMemo(() => {
    const needle = qText.trim().toLowerCase();
    if (!needle) return browseRows;
    return browseRows.filter((r) => {
      const idHit = String(r.tokenId).includes(needle.replace('#', ''));
      const nameHit = (r.name ?? '').toLowerCase().includes(needle);
      return idHit || nameHit;
    });
  }, [browseRows, qText]);

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
            Live listings and traits from the{' '}
            <a
              className="text-lime-300/90 underline hover:text-lime-200"
              href="https://docs.opensea.io/"
              target="_blank"
              rel="noreferrer"
            >
              OpenSea API
            </a>
            . Purchase still happens on OpenSea. To list yours,
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

          <div className="mt-7 rounded-xl border border-zinc-800 bg-zinc-900/25 p-3.5 md:p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Collection pulse</p>
            <div className="mt-2 flex flex-wrap items-start gap-2 sm:gap-2.5 md:flex-nowrap md:justify-between">
              {statsQ.isLoading ? (
                <p className="text-xs text-zinc-500">Loading OpenSea stats…</p>
              ) : statsQ.data?.total ? (
                <>
                  <div className="flex flex-wrap items-stretch gap-2 sm:gap-2.5 md:flex-nowrap">
                    {statsQ.data.total.floor_price != null && Number.isFinite(statsQ.data.total.floor_price) ? (
                      <div className="min-w-[118px] flex-1 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2.5 py-2 sm:min-w-[128px] sm:flex-none sm:px-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Floor</p>
                        <p className="mt-0.5 font-mono text-base text-lime-200 sm:text-lg">
                          {formatEth(statsQ.data.total.floor_price)}{' '}
                          <span className="text-xs text-zinc-500 sm:text-sm">
                            {statsQ.data.total.floor_price_symbol ?? 'ETH'}
                          </span>
                        </p>
                      </div>
                    ) : null}
                    {statsQ.data.total.num_owners != null ? (
                      <div className="min-w-[100px] flex-1 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2.5 py-2 sm:min-w-[108px] sm:flex-none sm:px-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Owners</p>
                        <p className="mt-0.5 font-mono text-base text-zinc-100 sm:text-lg">
                          {statsQ.data.total.num_owners.toLocaleString()}
                        </p>
                      </div>
                    ) : null}
                    {statsQ.data.total.volume != null && Number.isFinite(statsQ.data.total.volume) ? (
                      <div className="min-w-[118px] flex-1 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2.5 py-2 sm:min-w-[128px] sm:flex-none sm:px-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">All-time vol</p>
                        <p className="mt-0.5 font-mono text-base text-cyan-200/90 sm:text-lg">
                          {statsQ.data.total.volume.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
                          <span className="text-xs text-zinc-500 sm:text-sm">ETH</span>
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {statsQ.data?.intervals?.length ? (
                    <div className="flex w-full flex-wrap gap-2 md:w-auto md:flex-nowrap md:items-stretch md:gap-2.5 md:border-l md:border-zinc-800/80 md:pl-2.5">
                      {statsQ.data.intervals.map((iv) => (
                        <div
                          key={iv.interval ?? '?'}
                          className="min-w-[100px] flex-1 rounded-md border border-zinc-800/90 bg-zinc-950/30 px-2 py-1.5 md:flex-none"
                        >
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
                            {intervalLabel(iv.interval)}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-zinc-200">
                            {(iv.volume ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ETH vol
                          </p>
                          <p className="text-[10px] leading-tight text-zinc-500">{iv.sales ?? 0} sales</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-zinc-500">Stats unavailable.</p>
              )}
            </div>

            <div className="mt-2.5 border-t border-zinc-800/80 pt-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Pricing</p>
              {pricingQ.isLoading ? (
                <p className="mt-1.5 text-xs text-zinc-500">Loading best listing / offers…</p>
              ) : (
                <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-2.5 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Best listing</p>
                    {pricingQ.data?.bestListing ? (
                      <>
                        <p className="mt-0.5 font-mono text-xs text-lime-200/90">
                          #{pricingQ.data.bestListing.tokenId}{' '}
                          <span className="text-zinc-400">
                            {pricingQ.data.bestListing.tokenName ?? 'HOODRAT'}
                          </span>
                        </p>
                        <p className="mt-0.5 font-mono text-base text-white">
                          {formatEth(pricingQ.data.bestListing.priceEth)}
                          {pricingQ.data.bestListing.priceUsd != null &&
                          Number.isFinite(pricingQ.data.bestListing.priceUsd) ? (
                            <span className="ml-1.5 text-[10px] text-zinc-500 sm:text-xs">
                              {formatUsd(pricingQ.data.bestListing.priceUsd)}
                            </span>
                          ) : null}
                        </p>
                        <a
                          href={hoodratOpenSeaUrl(pricingQ.data.bestListing.tokenId)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-[10px] font-semibold text-lime-300/90 underline"
                        >
                          View on OpenSea
                        </a>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-500">No active best listing returned.</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-2.5 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Top offer</p>
                    {pricingQ.data?.topOffer?.priceEth != null && Number.isFinite(pricingQ.data.topOffer.priceEth) ? (
                      <>
                        <p className="mt-0.5 font-mono text-base text-cyan-200/90">
                          {formatEth(pricingQ.data.topOffer.priceEth)}
                        </p>
                        {pricingQ.data.topOffer.maker ? (
                          <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                            From {pricingQ.data.topOffer.maker.slice(0, 6)}…{pricingQ.data.topOffer.maker.slice(-4)}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-1 text-xs leading-snug text-zinc-500">
                        No collection offers in the first page.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <p className="mt-2 text-[10px] leading-snug text-zinc-600">
              Stats from{' '}
              <a
                className="text-zinc-400 underline hover:text-zinc-300"
                href="https://docs.opensea.io/reference/get_collection_stats"
                target="_blank"
                rel="noreferrer"
              >
                OpenSea collection stats
              </a>
              ; listings/offers from OpenSea marketplace endpoints.
            </p>
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

              {mode === 'listings' ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setListingView('sale')}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      listingView === 'sale'
                        ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-100'
                        : 'border-zinc-700 bg-zinc-950/40 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    Listed for sale
                  </button>
                  <button
                    type="button"
                    onClick={() => setListingView('browse')}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      listingView === 'browse'
                        ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-100'
                        : 'border-zinc-700 bg-zinc-950/40 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    Browse NFTs
                  </button>
                </div>
              ) : null}

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
                    Trait filters unavailable. Listings may still load without filters.
                  </p>
                ) : (
                  <div className="mt-2 space-y-4">
                    {Object.keys(selected).length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setSelected({})}
                        disabled={mode !== 'listings'}
                        className="mb-2 w-full rounded-lg border border-zinc-700 bg-zinc-950/50 px-2 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100 disabled:opacity-40"
                      >
                        Clear trait filters
                      </button>
                    ) : null}
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
            {mode === 'activity' && qActivity.isLoading ? (
              <p className="text-sm text-zinc-500">Loading activity…</p>
            ) : mode === 'listings' && listingView === 'sale' && qListings.isLoading ? (
              <p className="text-sm text-zinc-500">
                Loading listings… (OpenSea fetches per-token images & traits; first page can take a few seconds.)
              </p>
            ) : mode === 'listings' &&
              listingView === 'browse' &&
              qBrowse.isLoading &&
              (!qBrowse.data?.pages || qBrowse.data.pages.length === 0) ? (
              <p className="text-sm text-zinc-500">
                Scanning collection NFTs on OpenSea (server-side trait matching + pagination)…
              </p>
            ) : err ? (
              <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-5 text-sm text-red-200">
                <p className="font-semibold">Could not load marketplace data</p>
                <p className="mt-2 text-red-200/80">{err}</p>
                <p className="mt-3 text-xs text-zinc-500">
                  The marketplace uses OpenSea only. In the project root, add{' '}
                  <code className="text-zinc-300">OPENSEA_API_KEY=…</code> to <code className="text-zinc-300">.env</code> or{' '}
                  <code className="text-zinc-300">.env.local</code> (from OpenSea developer settings), then restart{' '}
                  <code className="text-zinc-300">astro dev</code>. If the slug in your OpenSea URL is not{' '}
                  <code className="text-zinc-300">hood-rats</code>, set <code className="text-zinc-300">OPENSEA_COLLECTION_SLUG</code>.
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
                              <td className="px-4 py-3">
                                <a
                                  href={`/rats/${r.tokenId}/`}
                                  className="group inline-flex items-center gap-3"
                                  title={`Open #${r.tokenId}`}
                                >
                                  <div className="h-9 w-9 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 transition group-hover:border-lime-500/30">
                                    {(() => {
                                      const t = tokenThumbById.get(r.tokenId);
                                      if (t?.src) {
                                        return (
                                          <FallbackImage
                                            src={t.src}
                                            alternates={t.alternates}
                                            alt={`#${r.tokenId}`}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                          />
                                        );
                                      }
                                      return (
                                        <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
                                          —
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <span className="font-mono text-lime-200/90 transition group-hover:text-lime-200">
                                    #{r.tokenId}
                                  </span>
                                </a>
                              </td>
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
            ) : mode === 'listings' && listingView === 'browse' ? (
              <>
                <p className="mb-4 text-xs leading-relaxed text-zinc-500">
                  <strong className="text-zinc-300">Browse by traits</strong> — the server pages through OpenSea{' '}
                  <a
                    className="text-lime-300/90 underline"
                    href="https://docs.opensea.io/reference/get_nfts_by_collection"
                    target="_blank"
                    rel="noreferrer"
                  >
                    collection NFTs
                  </a>{' '}
                  and returns tokens matching your sidebar (AND across traits, OR within each trait&rsquo;s selected
                  values). Empty filters show the newest IDs first.
                </p>
                {browseFiltered.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
                    No NFTs in the scanned pages match yet{qText.trim() ? ' (with your search text)' : ''}.
                    <p className="mt-3 text-xs text-zinc-600">
                      Try &ldquo;Load more&rdquo; to scan deeper, adjust traits, or clear filters.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {browseFiltered.map((n) => (
                      <div
                        key={n.tokenId}
                        className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/50 shadow-sm"
                      >
                        <a href={`/rats/${n.tokenId}/`} className="block aspect-square w-full bg-zinc-900">
                          {n.image ? (
                            <FallbackImage
                              src={n.image}
                              alternates={n.imageFallbacks}
                              alt={n.name ?? `#${n.tokenId}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-zinc-600">—</div>
                          )}
                        </a>
                        <div className="p-3">
                          <a href={`/rats/${n.tokenId}/`} className="group block">
                            <p className="font-mono text-sm text-lime-200/90 transition group-hover:text-lime-200">
                              #{n.tokenId}
                            </p>
                            <p className="truncate text-xs text-zinc-500 transition group-hover:text-zinc-300">
                              {n.name ?? 'HOODRAT'}
                            </p>
                          </a>
                          <a
                            href={n.openseaUrl ?? hoodratOpenSeaUrl(n.tokenId)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-xs font-semibold text-lime-300/90 underline"
                          >
                            View on OpenSea
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {qBrowse.hasNextPage ? (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      disabled={qBrowse.isFetchingNextPage}
                      onClick={() => void qBrowse.fetchNextPage()}
                      className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-lime-500/40 hover:bg-zinc-900/60 disabled:opacity-40"
                    >
                      {qBrowse.isFetchingNextPage ? 'Scanning…' : 'Load more'}
                    </button>
                  </div>
                ) : null}
              </>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
                {allRows.length > 0 &&
                Object.keys(selected).some((k) => (selected[k]?.size ?? 0) > 0) ? (
                  <>
                    <p>No listings match the selected traits{qText.trim() ? ' and search' : ''}.</p>
                    <p className="mt-3 text-xs text-zinc-500">
                      Showing {allRows.length} loaded listing{allRows.length === 1 ? '' : 's'} before filters.
                      Try clearing filters or loading more pages.
                    </p>
                  </>
                ) : (
                  <>
                    <p>No active fixed-price listings found for this collection right now.</p>
                    <p className="mt-4 text-xs text-zinc-600">
                      New listings can take a moment to show. Trade on{' '}
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
                  </>
                )}
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
                              <a
                                href={`/rats/${row.tokenId}/`}
                                className="group flex items-center gap-3"
                                title={`Open #${row.tokenId}`}
                              >
                                <div className="h-10 w-10 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 transition group-hover:border-lime-500/30">
                                  {row.tokenImage ? (
                                    <FallbackImage
                                      src={row.tokenImage}
                                      alternates={row.tokenImageAlternates}
                                      alt={row.tokenName ?? `#${row.tokenId}`}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
                                      —
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-mono text-lime-200/90 transition group-hover:text-lime-200">
                                    #{row.tokenId}
                                  </p>
                                  <p className="truncate text-xs text-zinc-500 transition group-hover:text-zinc-300">
                                    {row.tokenName ?? 'HOODRAT'}
                                  </p>
                                </div>
                              </a>
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

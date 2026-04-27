import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReadContract } from 'wagmi';
import { Web3Providers } from '../web3/Web3Providers';
import { HOODRATS_ADDRESS, hoodratsAbi } from '../../lib/contract';
import { hoodratsChainId } from '../../lib/chain';
import type { NftMetadata } from '../../lib/metadata';
import { hoodratEtherscanNftUrl, hoodratOpenSeaUrl } from '../../lib/nftMarketLinks';
import { resolveUri } from '../../lib/uri';
import { SiteNav } from '../nav/SiteNav';
import { MintDockChrome } from '../mint/MintPanel';
import { HomeFooter } from '../home/HomeFooter';
import { RatTokenExplorerCard } from './RatTokenExplorerCard';
import { TraitHoodratPreview } from './TraitHoodratPreview';
import { FallbackImage } from '../media/FallbackImage';
import { IframeWithFallback } from '../media/IframeWithFallback';

function parseIdFromSearch(): number | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search).get('id');
  const n = q != null ? Number(q) : NaN;
  if (Number.isFinite(n) && n >= 1 && n <= 99_999_999) return Math.floor(n);
  return null;
}

function RatDetailEmpty() {
  return (
    <main className="mx-auto max-w-lg shrink-0 px-4 py-16 text-center md:py-20">
      <h1 className="text-xl font-bold text-white">View a Hoodrat</h1>
      <p className="mt-4 text-sm text-zinc-400">
        Open a token page like{' '}
        <a className="font-mono text-lime-300 underline" href="/rats/1/">
          /rats/1/
        </a>
        .
      </p>
      <p className="mt-6 text-sm text-zinc-500">
        From{' '}
        <a className="text-lime-300 underline" href="/my-hoodrats/">
          My Hoodrats
        </a>{' '}
        each card links here automatically.
      </p>
      <p className="mt-4 text-xs text-zinc-600">
        Legacy query links like <code className="text-zinc-400">/rats/?id=1</code> still work too.
      </p>
      <a
        href="/"
        className="mt-8 inline-block rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-lime-500/40"
      >
        ← Home
      </a>
    </main>
  );
}

function RatDetailShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="flex min-h-svh flex-col bg-zinc-950">
        <SiteNav />
        <div className="flex min-h-0 flex-1 flex-col">
          {children}
          <div className="mt-auto w-full shrink-0">
            <HomeFooter />
          </div>
        </div>
      </div>
      <MintDockChrome />
    </>
  );
}

function RatDetailContent({ tokenId }: { tokenId: number }) {
  const {
    data: rawUri,
    isLoading: uriLoading,
    isError: uriError,
    error: uriErr,
  } = useReadContract({
    chainId: hoodratsChainId,
    address: HOODRATS_ADDRESS,
    abi: hoodratsAbi,
    functionName: 'tokenURI',
    args: [BigInt(tokenId)],
  });

  const {
    data: meta,
    isLoading: metaLoading,
    isError: metaError,
    error: metaErr,
  } = useQuery({
    queryKey: ['hoodrat-meta-detail', tokenId, rawUri],
    queryFn: async () => {
      const url = resolveUri(rawUri as string);
      const res = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
      });
      if (!res.ok) {
        throw new Error(`Metadata HTTP ${res.status}`);
      }
      return (await res.json()) as NftMetadata;
    },
    enabled: typeof rawUri === 'string' && rawUri.length > 0,
    retry: 2,
  });

  const loading = uriLoading || metaLoading;
  const title = meta?.name ?? `HOODRAT #${tokenId}`;
  const anim = meta?.animation_url ? resolveUri(meta.animation_url) : undefined;
  const img = meta?.image ? resolveUri(meta.image) : undefined;

  const errMsg = uriError
    ? (uriErr?.message ?? 'Could not read tokenURI')
    : metaError
      ? (metaErr instanceof Error ? metaErr.message : 'Could not load metadata')
      : null;

  useEffect(() => {
    document.title = `${title} · Hoodrats`;
    return () => {
      document.title = 'Hoodrats Super-Dapp';
    };
  }, [title]);

  return (
    <RatDetailShell>
      <main className="mx-auto max-w-6xl shrink-0 px-4 py-8">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading token #{tokenId}…</p>
        ) : errMsg ? (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-6 text-sm text-red-200">
            <p>{errMsg}</p>
            <p className="mt-2 text-xs text-zinc-500">
              Check <code className="text-zinc-300">PUBLIC_ETH_RPC_URL</code> in{' '}
              <code className="text-zinc-300">.env</code> if chain reads fail.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
              <div className="flex min-w-0 flex-1 flex-col lg:max-w-xl lg:pr-2">
                <h1 className="text-2xl font-black text-white md:text-3xl">{title}</h1>
                {meta?.description ? (
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    {meta.description}
                  </p>
                ) : null}
                <div className="mt-6 flex min-h-0 flex-1 flex-col lg:mt-8">
                  <RatTokenExplorerCard tokenId={tokenId} />
                </div>
              </div>
              <div
                className="relative mx-auto aspect-[9/16] w-full max-w-[200px] shrink-0 self-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60 shadow-lg sm:max-w-[228px] lg:mx-0 lg:max-w-[248px] lg:self-auto"
                aria-label="3D preview"
              >
                <TraitHoodratPreview compact attributes={meta?.attributes} />
              </div>
            </div>

            <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl">
              {anim ? (
                <div className="relative mx-auto aspect-square w-full overflow-hidden bg-black">
                  <IframeWithFallback
                    title={`Tokenbound ${tokenId}`}
                    src={anim}
                    className="absolute inset-0 h-full w-full border-0 bg-black [color-scheme:dark]"
                  />
                </div>
              ) : img ? (
                <FallbackImage
                  src={img}
                  alt={title}
                  className="w-full object-contain"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center p-8 text-sm text-zinc-500">
                  No artwork URL for this token in metadata.
                </div>
              )}
            </div>

            {meta?.attributes?.length ? (
              <section className="mt-10">
                <h2 className="text-lg font-bold text-white">Traits</h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {meta.attributes.map((a, i) => (
                    <li
                      key={`${a.trait_type}-${i}`}
                      className="flex justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm"
                    >
                      <span className="text-zinc-500">{a.trait_type}</span>
                      <span className="font-medium text-zinc-100">
                        {String(a.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-zinc-600">
              <a
                className="text-sky-300/90 hover:text-sky-200"
                href={hoodratOpenSeaUrl(tokenId)}
                target="_blank"
                rel="noreferrer"
              >
                OpenSea
              </a>
              <span className="text-zinc-700" aria-hidden>
                ·
              </span>
              <a
                className="hover:text-lime-300"
                href={hoodratEtherscanNftUrl(tokenId)}
                target="_blank"
                rel="noreferrer"
              >
                Etherscan
              </a>
            </p>
          </>
        )}
      </main>
    </RatDetailShell>
  );
}

/**
 * `/rats/?id=n` viewer — reads `id` in the **browser** (build-time Astro has no query string).
 * For prerendered tokens, prefer `/rats/n/` from featured links when in range.
 */
export function RatDetailApp() {
  const [tokenId, setTokenId] = useState<number | null>(() => parseIdFromSearch());

  useEffect(() => {
    const sync = () => setTokenId(parseIdFromSearch());
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  return (
    <Web3Providers>
      {tokenId == null ? (
        <RatDetailShell>
          <RatDetailEmpty />
        </RatDetailShell>
      ) : (
        <RatDetailContent tokenId={tokenId} />
      )}
    </Web3Providers>
  );
}

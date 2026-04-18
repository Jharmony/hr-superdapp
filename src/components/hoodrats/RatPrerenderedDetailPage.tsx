import type { NftMetadata } from '../../lib/metadata';
import { hoodratEtherscanNftUrl, hoodratOpenSeaUrl } from '../../lib/nftMarketLinks';
import { Web3Providers } from '../web3/Web3Providers';
import { SiteNav } from '../nav/SiteNav';
import { MintDockChrome } from '../mint/MintPanel';
import { HomeFooter } from '../home/HomeFooter';
import { RatTokenExplorerCard } from './RatTokenExplorerCard';
import { TraitHoodratPreview } from './TraitHoodratPreview';

type Props = {
  tokenId: number;
  title: string;
  description?: string;
  anim?: string;
  img?: string;
  attributes?: NftMetadata['attributes'];
};

/**
 * Prerendered `/rats/:id/` page in one React tree so we get a single `Web3Providers`
 * shell with global nav, mint dock, and footer (matches other app routes).
 */
export function RatPrerenderedDetailPage({
  tokenId,
  title,
  description,
  anim,
  img,
  attributes,
}: Props) {
  const openSeaUrl = hoodratOpenSeaUrl(tokenId);
  const etherscanUrl = hoodratEtherscanNftUrl(tokenId);
  const imgUrl = img ?? undefined;

  return (
    <Web3Providers>
      <div className="flex min-h-svh flex-col bg-zinc-950">
        <SiteNav />
        <div className="flex min-h-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-6xl shrink-0 px-4 py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
          <div className="flex min-w-0 flex-1 flex-col lg:max-w-xl lg:pr-2">
            <h1 className="text-2xl font-black text-white md:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
            ) : null}
            <div className="mt-6 flex min-h-0 flex-1 flex-col lg:mt-8">
              <RatTokenExplorerCard tokenId={tokenId} />
            </div>
          </div>
          <div
            className="relative mx-auto aspect-[9/16] w-full max-w-[200px] shrink-0 self-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60 shadow-lg sm:max-w-[228px] lg:mx-0 lg:max-w-[248px] touch-none lg:self-auto"
            aria-label="3D preview"
          >
            <TraitHoodratPreview compact attributes={attributes} />
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl">
          {anim ? (
            <div className="relative mx-auto aspect-square w-full overflow-hidden bg-black">
              <iframe
                title={`Tokenbound ${tokenId}`}
                src={anim}
                className="absolute inset-0 h-full w-full border-0 bg-black [color-scheme:dark]"
                loading="lazy"
                allow="clipboard-read; clipboard-write; accelerometer; gyroscope"
              />
            </div>
          ) : imgUrl ? (
            <img
              src={imgUrl}
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

        {attributes?.length ? (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-white">Traits</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {attributes.map((a, i) => (
                <li
                  key={`${a.trait_type}-${i}`}
                  className="flex justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm"
                >
                  <span className="text-zinc-500">{a.trait_type}</span>
                  <span className="font-medium text-zinc-100">{String(a.value)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-zinc-600">
          <a
            className="text-sky-300/90 hover:text-sky-200"
            href={openSeaUrl}
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
            href={etherscanUrl}
            target="_blank"
            rel="noreferrer"
          >
            Etherscan
          </a>
        </p>
          </main>
          <div className="mt-auto w-full shrink-0">
            <HomeFooter />
          </div>
        </div>
      </div>
      <MintDockChrome />
    </Web3Providers>
  );
}

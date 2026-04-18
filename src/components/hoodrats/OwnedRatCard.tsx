import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useReadContract } from 'wagmi';
import { HOODRATS_ADDRESS, hoodratsAbi } from '../../lib/contract';
import { hoodratsChainId } from '../../lib/chain';
import type { NftMetadata } from '../../lib/metadata';
import { resolveUri } from '../../lib/uri';
import { downloadHoodratTraitGlb } from '../../lib/exportHoodratTraitGlb';
import { hoodratOpenSeaUrl } from '../../lib/nftMarketLinks';
import { TraitHoodratPreview } from './TraitHoodratPreview';

/** Thumbnail + links; holders can open an inline 3D preview and download a tinted `.glb`. */
export function OwnedRatCard({ tokenId }: { tokenId: number }) {
  const [studioOpen, setStudioOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);

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
    queryKey: ['hoodrat-meta-owned', tokenId, rawUri],
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
    enabled: typeof rawUri === 'string' && rawUri.length > 0,
    retry: 2,
  });

  const loading = uriLoading || metaLoading;
  const img = meta?.image ? resolveUri(meta.image) : undefined;
  const errMsg = uriError
    ? (uriErr?.message ?? 'Chain read failed')
    : metaError
      ? (metaErr instanceof Error ? metaErr.message : 'Metadata failed')
      : null;

  const viewerHref = `/rats/?id=${tokenId}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 transition hover:border-lime-500/40 hover:shadow-[0_0_28px_rgba(163,230,53,0.12)]">
      <div className="flex">
        <div className="relative h-28 w-28 shrink-0 bg-zinc-950 sm:h-32 sm:w-32">
          {loading ? (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">
              …
            </div>
          ) : errMsg ? (
            <div className="flex h-full items-center justify-center p-2 text-center text-[10px] leading-tight text-red-300/90">
              {errMsg.slice(0, 48)}
            </div>
          ) : img ? (
            <img
              src={img}
              alt={meta?.name ?? `HOODRAT ${tokenId}`}
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">
              No img
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4">
          <div>
            <div className="flex min-w-0 items-baseline gap-2">
              <p className="min-w-0 truncate font-bold text-white">
                {meta?.name ?? `HOODRAT #${tokenId}`}
              </p>
              <a
                href={hoodratOpenSeaUrl(tokenId)}
                target="_blank"
                rel="noreferrer"
                title="List for sale on OpenSea"
                aria-label="List for sale on OpenSea"
                className="shrink-0 rounded border border-zinc-700/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300/90 transition hover:border-sky-500/50 hover:bg-zinc-800/80 hover:text-sky-200"
              >
                OpenSea
              </a>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
              {meta?.description ?? 'Tokenbound + traits on the full page.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={viewerHref}
              className="inline-flex rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-lime-500/40 hover:bg-zinc-800/80 hover:text-lime-200"
            >
              Open page
            </a>
            <button
              type="button"
              disabled={Boolean(errMsg) || loading}
              onClick={() => {
                setStudioOpen((o) => !o);
                setExportErr(null);
              }}
              className="inline-flex rounded-lg border border-lime-500/35 bg-lime-950/25 px-3 py-1.5 text-xs font-semibold text-lime-200 transition hover:border-lime-400/50 hover:bg-lime-950/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {studioOpen ? 'Hide 3D' : '3D + GLB'}
            </button>
          </div>
        </div>
      </div>

      {studioOpen ? (
        <div className="border-t border-zinc-800/90 bg-zinc-950/40 px-4 py-4">
          <p className="text-center text-[11px] leading-relaxed text-zinc-500">
            Preview uses the same tribe body tint as your on-chain metadata. Download
            the rig as a <span className="font-mono text-zinc-400">.glb</span> for
            personal renders &mdash; redistribution of the base mesh is still subject
            to your collection license.
          </p>
          <div className="mx-auto mt-3 h-[min(52vh,440px)] w-full max-w-[220px] sm:max-w-[248px]">
            <TraitHoodratPreview compact attributes={meta?.attributes} />
          </div>
          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              disabled={exporting || loading || Boolean(errMsg)}
              onClick={() => {
                void (async () => {
                  setExportErr(null);
                  setExporting(true);
                  try {
                    await downloadHoodratTraitGlb(meta?.attributes, `hoodrat-${tokenId}`);
                  } catch (e) {
                    setExportErr(e instanceof Error ? e.message : 'Could not export GLB');
                  } finally {
                    setExporting(false);
                  }
                })();
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-lime-400 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_20px_rgba(163,230,53,0.2)] transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {exporting ? 'Preparing…' : 'Download .glb'}
            </button>
            {exportErr ? (
              <p className="max-w-md text-center text-xs text-red-300/90">{exportErr}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

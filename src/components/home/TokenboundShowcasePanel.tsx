import { useQuery } from '@tanstack/react-query';
import { useReadContract } from 'wagmi';
import { HOODRATS_ADDRESS, hoodratsAbi } from '../../lib/contract';
import { hoodratsChainId } from '../../lib/chain';
import type { NftMetadata } from '../../lib/metadata';
import { resolveUri } from '../../lib/uri';
import { FallbackImage } from '../media/FallbackImage';

const SHOWCASE_TOKEN_ID = Number(
  (import.meta.env.PUBLIC_TOKENBOUND_DEMO_TOKEN_ID as string | undefined)?.trim() ||
    '275',
);

export function TokenboundShowcasePanel() {
  const tokenId = Number.isFinite(SHOWCASE_TOKEN_ID) ? SHOWCASE_TOKEN_ID : 275;

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
    queryKey: ['hoodrat-meta-tokenbound-showcase', tokenId, rawUri],
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
  const anim = meta?.animation_url ? resolveUri(meta.animation_url) : undefined;
  const img = meta?.image ? resolveUri(meta.image) : undefined;
  const title = meta?.name ?? `HOODRAT #${tokenId}`;

  const errMsg = uriError
    ? (uriErr?.message ?? 'Could not read tokenURI')
    : metaError
      ? (metaErr instanceof Error ? metaErr.message : 'Could not load metadata')
      : null;

  /** Token pages render on-demand on Vercel (`/rats/[id]`). */
  const detailHref = `/rats/${tokenId}/`;

  return (
    <div className="mx-auto mt-8 w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-lime-300/90">
            Tokenbound preview
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Same interactive surface as the full token page when{' '}
            <code className="text-zinc-300">animation_url</code> is in metadata.
          </p>
        </div>
        <a
          href={detailHref}
          className="shrink-0 rounded-xl border border-zinc-600 bg-zinc-900/80 px-4 py-2.5 text-center text-sm font-semibold text-zinc-200 transition hover:border-lime-500/40"
        >
          Open full token page
        </a>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl">
        {loading ? (
          <div className="flex aspect-video items-center justify-center text-sm text-zinc-500">
            Loading metadata…
          </div>
        ) : errMsg ? (
          <div className="flex flex-col gap-2 p-6 text-center text-sm text-red-300/90">
            <span>{errMsg}</span>
            <span className="text-xs text-zinc-500">
              You can still open the token page — it uses the same reader as here.
            </span>
            <a
              href={detailHref}
              className="text-xs font-semibold text-lime-300 underline-offset-2 hover:underline"
            >
              Open token page →
            </a>
          </div>
        ) : anim ? (
          <div className="relative mx-auto aspect-square w-full max-w-[min(100%,560px)] overflow-hidden bg-black">
            <iframe
              title={`Tokenbound preview ${tokenId}`}
              src={anim}
              className="absolute inset-0 h-full w-full border-0 bg-black [color-scheme:dark]"
              loading="lazy"
              allow="clipboard-read; clipboard-write; accelerometer; gyroscope"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : img ? (
          <div className="p-4 text-center">
            <p className="mb-3 text-xs text-zinc-500">
              This token has no <code className="text-zinc-300">animation_url</code> in
              metadata yet — showing static image instead.
            </p>
            <FallbackImage
              src={img}
              alt={title}
              className="mx-auto max-h-[min(70vh,520px)] w-full object-contain"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-3 p-6 text-center text-sm text-zinc-500">
            <span>No animation or image URL in metadata for this token.</span>
            <a
              href={detailHref}
              className="text-xs font-semibold text-lime-300 underline-offset-2 hover:underline"
            >
              Open token page →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { useReadContract } from 'wagmi';
import { HOODRATS_ADDRESS, hoodratsAbi } from '../../lib/contract';
import { hoodratsChainId } from '../../lib/chain';
import type { NftMetadata } from '../../lib/metadata';
import { resolveUri } from '../../lib/uri';
import { FallbackImage } from '../media/FallbackImage';

export function FeaturedRatCard({ tokenId }: { tokenId: number }) {
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
    queryKey: ['hoodrat-meta', tokenId, rawUri],
    queryFn: async () => {
      const url = resolveUri(rawUri as string);
      const res = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
      });
      if (!res.ok) {
        throw new Error(`Metadata HTTP ${res.status} for ${url.slice(0, 48)}…`);
      }
      return (await res.json()) as NftMetadata;
    },
    enabled: typeof rawUri === 'string' && rawUri.length > 0,
    retry: 2,
  });

  const loading = uriLoading || metaLoading;
  const img = meta?.image ? resolveUri(meta.image) : undefined;
  const errMsg = uriError
    ? (uriErr?.message ?? 'Could not read tokenURI from chain')
    : metaError
      ? (metaErr instanceof Error ? metaErr.message : 'Could not load metadata')
      : null;

  /** Prefer static `/rats/n/` when that HTML was prerendered (faster, SEO). */
  const prerenderMax = Number(import.meta.env.PUBLIC_STATIC_RAT_COUNT ?? 50);
  const detailHref =
    tokenId > 0 && tokenId <= prerenderMax
      ? `/rats/${tokenId}/`
      : `/rats/?id=${tokenId}`;

  return (
    <a
      href={detailHref}
      className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 transition hover:border-lime-500/40 hover:shadow-[0_0_40px_rgba(163,230,53,0.12)]"
    >
      <div className="aspect-square w-full overflow-hidden bg-zinc-950">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Loading…
          </div>
        ) : errMsg ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-red-300/90">
            <span>{errMsg}</span>
            <span className="text-zinc-500">
              Set <code className="text-zinc-300">PUBLIC_ETH_RPC_URL</code> in{' '}
              <code className="text-zinc-300">.env</code> if RPC limits hit.
            </span>
          </div>
        ) : img ? (
          <FallbackImage
            src={img}
            alt={meta?.name ?? `HOODRAT ${tokenId}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="font-bold text-white">
          {meta?.name ?? `Token #${tokenId}`}
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
          {meta?.description ?? ' '}
        </p>
        <span className="mt-3 inline-block text-xs font-semibold text-lime-300">
          View token →
        </span>
      </div>
    </a>
  );
}

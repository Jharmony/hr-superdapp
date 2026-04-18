import { hoodratEtherscanNftUrl, hoodratOpenSeaUrl } from '../../lib/nftMarketLinks';

const linkBase =
  'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/50';

export function RatTokenExplorerCard({
  tokenId,
  className = '',
}: {
  tokenId: number;
  className?: string;
}) {
  const openSea = hoodratOpenSeaUrl(tokenId);
  const etherscan = hoodratEtherscanNftUrl(tokenId);

  return (
    <aside
      className={`flex h-full min-h-[10.5rem] flex-1 flex-col justify-between rounded-2xl border border-zinc-800/90 bg-gradient-to-br from-zinc-900/55 via-zinc-950/70 to-zinc-950 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ${className}`}
    >
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
          On-chain
        </p>
        <p className="mt-1.5 font-mono text-xs text-lime-200/90">
          Token #{tokenId}
          <span className="text-zinc-600"> · </span>
          <span className="text-zinc-400">Ethereum</span>
        </p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <a
            href={openSea}
            target="_blank"
            rel="noreferrer"
            className={`${linkBase} border-sky-500/35 bg-sky-950/25 text-sky-100 hover:border-sky-400/50 hover:bg-sky-950/40`}
          >
            OpenSea
          </a>
          <a
            href={etherscan}
            target="_blank"
            rel="noreferrer"
            className={`${linkBase} border-zinc-600/50 bg-zinc-900/50 text-zinc-200 hover:border-lime-500/35 hover:bg-zinc-800/60`}
          >
            Etherscan
          </a>
        </div>
      </div>
      <p className="mt-5 border-t border-zinc-800/80 pt-4 text-xs leading-relaxed text-zinc-500">
        Open the live listing, bids, and activity on OpenSea — or inspect contract reads,
        transfers, and provenance on Etherscan.
      </p>
    </aside>
  );
}

import type { HoodratsMint } from './useHoodratsMint';

/** High-visibility breakdown: contract payment, gas cap, max total out of wallet. */
export function MintCostSummary(props: HoodratsMint) {
  const m = props;
  const showGas =
    m.isConnected &&
    m.chainId === m.hoodratsChainId &&
    m.totalWei != null &&
    m.maxQty > 0;

  return (
    <div className="mt-6 rounded-2xl border border-lime-500/25 bg-gradient-to-br from-lime-500/10 via-zinc-900/60 to-zinc-950 p-5 md:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-200/80">
        What leaves your wallet (this mint)
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-zinc-500">Mint price (contract)</p>
          <p className="mt-1 font-mono text-xl font-bold text-white md:text-2xl">
            {m.totalLabel}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">Goes to Hoodrats · not gas</p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">Network fee (est. max)</p>
          {!showGas ? (
            <p className="mt-1 text-sm text-zinc-500">Connect on mainnet</p>
          ) : m.gasEstimating ? (
            <p className="mt-1 font-mono text-xl font-bold text-zinc-400 md:text-2xl">
              …
            </p>
          ) : m.estimatedGasLabel ? (
            <p className="mt-1 font-mono text-xl font-bold text-amber-100/95 md:text-2xl">
              {m.estimatedGasLabel}
            </p>
          ) : m.gasEstimateFailed ? (
            <p className="mt-1 text-xs leading-snug text-red-300/90">
              {m.gasEstimateMessage ?? 'Unavailable'}
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">—</p>
          )}
          <p className="mt-1 text-[11px] text-zinc-500">
            Gas × max fee — you often pay less
          </p>
        </div>
        <div className="sm:border-l sm:border-zinc-700/80 sm:pl-4">
          <p className="text-xs font-medium text-zinc-500">
            Max total (mint + gas cap)
          </p>
          {!showGas ? (
            <p className="mt-1 text-sm text-zinc-500">—</p>
          ) : m.gasEstimating ? (
            <p className="mt-1 font-mono text-xl font-bold text-zinc-400 md:text-2xl">
              …
            </p>
          ) : m.maxTotalOutLabel ? (
            <p className="mt-1 font-mono text-xl font-bold text-lime-200 md:text-2xl">
              {m.maxTotalOutLabel}
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">
              {m.totalLabel} + gas (see above)
            </p>
          )}
          <p className="mt-1 text-[11px] text-zinc-500">
            Conservative ceiling for planning
          </p>
        </div>
      </div>
    </div>
  );
}

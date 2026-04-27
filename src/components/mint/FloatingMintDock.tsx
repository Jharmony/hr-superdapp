import type { HoodratsMint } from './useHoodratsMint';

export type FloatingMintDockProps = HoodratsMint & {
  dockCompact?: boolean;
  onToggleDockCompact?: () => void;
  /** In-page `#mint` on home; use `"/#mint"` on other routes. */
  detailsHref?: string;
  /** Z-index class for overlaying different shells (worlds use higher). */
  zIndexClass?: string;
};

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconChevronUp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M14.77 12.79a.75.75 0 0 1-1.06-.02L10 9.06 6.29 12.77a.75.75 0 0 1-1.06-1.06l4.24-4.25a.75.75 0 0 1 1.06 0l4.25 4.24a.75.75 0 0 1-.02 1.09Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function FloatingMintDock(props: FloatingMintDockProps) {
  const {
    dockCompact = false,
    onToggleDockCompact,
    detailsHref = '#mint',
    zIndexClass = 'z-[100]',
    ...m
  } = props;
  const canMint =
    m.isConnected &&
    !m.paused &&
    !m.minting &&
    m.cost != null &&
    m.totalWei != null &&
    m.maxQty > 0;

  if (dockCompact && onToggleDockCompact) {
    return (
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 ${zIndexClass} flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1`}
        aria-label="Quick mint"
      >
        <div className="pointer-events-auto flex h-11 w-full max-w-lg items-center gap-2 rounded-2xl border border-zinc-700/90 bg-zinc-950/95 px-3 shadow-[0_-8px_40px_rgba(0,0,0,0.55)] backdrop-blur-md md:max-w-2xl">
          <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-zinc-500">
            <span className="text-zinc-300">Mint</span>
            <span className="text-zinc-600"> · </span>
            <span>{m.supplyLabel}</span>
            <span className="text-zinc-600"> · </span>
            <span>{m.costLabel}/ea</span>
          </p>
          <a
            href={detailsHref}
            className="shrink-0 rounded-lg border border-zinc-700 px-2 py-1.5 text-[10px] font-semibold text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          >
            Details
          </a>
          <button
            type="button"
            onClick={onToggleDockCompact}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-900/90 text-zinc-300 transition hover:border-lime-500/40 hover:bg-zinc-800 hover:text-lime-200"
            aria-expanded={false}
            aria-label="Expand mint bar"
            title="Expand mint bar"
          >
            <IconChevronUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-0 ${zIndexClass} flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1`}
      aria-label="Quick mint"
    >
      <div className="pointer-events-auto relative w-full max-w-lg rounded-2xl border border-zinc-700/90 bg-zinc-950/95 p-2.5 shadow-[0_-8px_40px_rgba(0,0,0,0.55)] backdrop-blur-md md:max-w-2xl md:p-3">
        {onToggleDockCompact ? (
          <button
            type="button"
            onClick={onToggleDockCompact}
            className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900/95 text-zinc-400 shadow-sm transition hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
            aria-expanded
            aria-label="Minimize mint bar"
            title="Minimize mint bar"
          >
            <IconChevronDown className="h-4 w-4" />
          </button>
        ) : null}

        <div
          className={`flex flex-wrap items-center gap-2 gap-y-2 md:flex-nowrap md:gap-4 ${onToggleDockCompact ? 'pr-10' : ''}`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Mint · {m.supplyLabel} · {m.costLabel}/ea
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/80 px-2 py-1">
                <label htmlFor="dock-qty" className="sr-only">
                  Quantity
                </label>
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={m.maxQty <= 0 || m.clampedQty <= 1}
                  className="rounded px-1.5 text-sm font-bold text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
                  onClick={() => m.setQty((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <input
                  id="dock-qty"
                  type="number"
                  min={1}
                  max={m.maxQty}
                  value={m.clampedQty <= 0 ? '' : m.clampedQty}
                  onChange={(e) => m.setQty(Number(e.target.value) || 1)}
                  className="w-9 bg-transparent text-center text-sm font-bold text-white tabular-nums outline-none"
                />
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={m.maxQty <= 0 || m.clampedQty >= m.maxQty}
                  className="rounded px-1.5 text-sm font-bold text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
                  onClick={() => m.setQty((q) => Math.min(m.maxQty, q + 1))}
                >
                  +
                </button>
              </div>
              <span className="text-xs font-semibold text-lime-200/95 md:text-sm">
                Total {m.totalLabel}
              </span>
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center gap-2 md:w-auto">
            <a
              href={detailsHref}
              className="hidden rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 sm:inline"
            >
              Details
            </a>
            <button
              type="button"
              disabled={!canMint}
              onClick={() => void m.onMint()}
              className="min-h-[44px] flex-1 rounded-xl bg-lime-400 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_20px_rgba(163,230,53,0.25)] transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40 md:flex-none md:px-6 md:text-sm"
            >
              {m.minting ? '…' : m.maxQty <= 0 ? 'Sold out' : 'Mint'}
            </button>
          </div>
        </div>

        {m.isConnected &&
        m.chainId === m.hoodratsChainId &&
        m.maxQty > 0 &&
        m.totalWei != null ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-2 text-[11px] md:text-xs">
            <span className="text-zinc-500">
              Gas (est. max):{' '}
              <span className="font-mono font-semibold text-amber-100/90">
                {m.gasEstimating ? '…' : m.estimatedGasLabel ?? (m.gasEstimateFailed ? '—' : '—')}
              </span>
            </span>
            <span className="text-zinc-500">
              Max total out:{' '}
              <span className="font-mono font-bold text-lime-200">
                {m.gasEstimating ? '…' : m.maxTotalOutLabel ?? m.totalLabel}
              </span>
            </span>
          </div>
        ) : null}

        {m.wrongChain ? (
          <p className="mt-2 border-t border-zinc-800 pt-2 text-center text-[11px] text-amber-200/90">
            Wrong network — use header or tap Mint to switch to {m.hoodratsChain.name}.
          </p>
        ) : null}
        {(m.error || m.actionError) && !m.isSuccess ? (
          <p className="mt-2 max-h-16 overflow-y-auto border-t border-red-500/20 pt-2 text-center text-[11px] text-red-300">
            {m.error?.shortMessage || m.error?.message || m.actionError}
          </p>
        ) : null}
        {m.isSuccess ? (
          <p className="mt-2 border-t border-lime-500/20 pt-2 text-center text-[11px] text-lime-200">
            Sent —{' '}
            {m.hash ? (
              <a
                className="underline"
                target="_blank"
                rel="noreferrer"
                href={`https://etherscan.io/tx/${m.hash}`}
              >
                Etherscan
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}

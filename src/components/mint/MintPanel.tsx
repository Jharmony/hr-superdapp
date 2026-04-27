import { FloatingMintDock } from './FloatingMintDock';
import { MintCostSummary } from './MintCostSummary';
import { useHoodratsMint, type HoodratsMint } from './useHoodratsMint';
import { useMintDockLayout } from './useMintDockLayout';

/** Floating mint bar only (use on pages that do not render `MintSection`). */
export function MintDockChrome({
  detailsHref = '/#mint',
  zIndexClass,
}: {
  detailsHref?: string;
  zIndexClass?: string;
}) {
  const mint = useHoodratsMint();
  const { dockCompact, toggleDockCompact } = useMintDockLayout();

  return (
    <FloatingMintDock
      {...mint}
      dockCompact={dockCompact}
      onToggleDockCompact={toggleDockCompact}
      detailsHref={detailsHref}
      zIndexClass={zIndexClass}
    />
  );
}

/** Full mint card + floating quick-mint bar (shared state). */
export function MintSection() {
  const mint = useHoodratsMint();
  const { dockCompact, toggleDockCompact } = useMintDockLayout();

  return (
    <>
      <FloatingMintDock
        {...mint}
        dockCompact={dockCompact}
        onToggleDockCompact={toggleDockCompact}
        detailsHref="#mint"
      />
      <MintPanelMain {...mint} />
    </>
  );
}

function MintPanelMain(m: HoodratsMint) {
  return (
    <section
      id="mint"
      className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)] md:p-8"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Mint
          </h2>
          <p className="text-sm text-zinc-400">
            Public mint on Ethereum mainnet. Price reads live from the contract.
            Use the bar at the bottom while you scroll, or controls here.
          </p>
        </div>
        {m.paused ? (
          <span className="inline-flex w-fit rounded-full border border-amber-500/40 bg-amber-950/50 px-3 py-1 text-xs font-semibold text-amber-200">
            Paused on-chain
          </span>
        ) : m.maxQty <= 0 ? (
          <span className="inline-flex w-fit rounded-full border border-zinc-600 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
            Sold out
          </span>
        ) : (
          <span className="inline-flex w-fit rounded-full border border-lime-500/30 bg-lime-950/40 px-3 py-1 text-xs font-semibold text-lime-200">
            Live
          </span>
        )}
      </div>

      {m.wrongChain ? (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-100">
          Switch to <strong>{m.hoodratsChain.name}</strong> to mint. Your wallet is
          on a different network.
          <button
            type="button"
            className="ml-3 rounded-lg border border-amber-400/50 px-3 py-1 text-xs font-bold text-amber-50 hover:bg-amber-500/20"
            disabled={m.switching}
            onClick={() =>
              void m
                .switchChainAsync({ chainId: m.hoodratsChainId })
                .catch(() => {})
            }
          >
            {m.switching ? 'Switching…' : 'Switch network'}
          </button>
        </p>
      ) : null}

      <MintCostSummary {...m} />

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Price (each)" value={m.costLabel} />
        <Stat label="Supply" value={m.supplyLabel} />
        <Stat
          label="Max / tx"
          value={m.maxPerTx != null ? m.maxPerTx.toString() : '…'}
        />
        <Stat
          label="Your wallet"
          value={
            m.address
              ? `${m.address.slice(0, 6)}…${m.address.slice(-4)}`
              : 'Not connected'
          }
        />
      </dl>

      <aside className="mt-6 rounded-xl border border-zinc-700/80 bg-zinc-900/35 p-4 text-sm leading-relaxed text-zinc-400">
        <p className="font-semibold text-zinc-200">Mint price vs gas (network fee)</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-mono text-lime-200/90">{m.totalLabel}</span> is
            the <strong className="text-zinc-200">mint price</strong> — it goes to
            the Hoodrats contract (set by <code className="text-zinc-300">cost()</code>
            ).
          </li>
          <li>
            <strong className="text-zinc-200">Gas</strong> is a separate Ethereum
            fee paid to validators. It goes up and down with congestion. No website
            can remove or discount mainnet gas; the contract is fixed on L1.
          </li>
          {m.estimatedGasLabel ? (
            <li>
              The highlighted box above uses <code className="text-zinc-300">eth_estimateGas</code>{' '}
              + current <strong className="text-zinc-200">max fee per gas</strong> for
              a conservative network-fee ceiling (
              <span className="font-mono text-lime-200/90">{m.estimatedGasLabel}</span>
              ).
            </li>
          ) : m.isConnected && m.chainId === m.hoodratsChainId ? (
            <li className="list-none pl-0 text-zinc-500">
              If the box above stays empty on gas, set{' '}
              <code className="text-zinc-300">PUBLIC_ETH_RPC_URL</code> to a solid
              mainnet RPC in <code className="text-zinc-300">.env</code> and reload.
              MetaMask &quot;Network fee unavailable&quot; is usually the same RPC /
              estimation issue.
            </li>
          ) : null}
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          Save on fees by minting when gas is low — check the{' '}
          <a
            className="text-lime-300/90 underline hover:text-lime-200"
            href="https://etherscan.io/gastracker"
            target="_blank"
            rel="noreferrer"
          >
            Etherscan gas tracker
          </a>
          .
        </p>
      </aside>

      <div className="mt-8 flex flex-col gap-4 border-t border-zinc-800 pt-6 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-400" htmlFor="qty-main">
            Quantity
          </label>
          <input
            id="qty-main"
            type="number"
            min={1}
            max={m.maxQty}
            value={m.clampedQty}
            onChange={(e) => m.setQty(Number(e.target.value) || 1)}
            className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-sm font-semibold text-white"
          />
        </div>
        <div className="flex-1 text-sm text-zinc-300">
          Total:{' '}
          <span className="font-bold text-lime-200">{m.totalLabel}</span>
        </div>
        <button
          type="button"
          disabled={
            !m.isConnected ||
            m.paused ||
            m.minting ||
            m.cost == null ||
            m.totalWei == null ||
            m.maxQty <= 0
          }
          onClick={() => void m.onMint()}
          className="rounded-xl bg-lime-400 px-6 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_24px_rgba(163,230,53,0.35)] transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {m.minting ? 'Confirming…' : 'Mint now'}
        </button>
      </div>

      {m.error ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">
          {m.error.shortMessage || m.error.message}
        </p>
      ) : null}
      {m.actionError ? (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-200">
          {m.actionError}
        </p>
      ) : null}
      {m.isSuccess ? (
        <p className="mt-4 rounded-lg border border-lime-500/30 bg-lime-950/20 p-3 text-sm text-lime-100">
          Mint submitted.{' '}
          {m.hash ? (
            <a
              className="underline"
              target="_blank"
              rel="noreferrer"
              href={`https://etherscan.io/tx/${m.hash}`}
            >
              View on Etherscan
            </a>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="mt-1 font-mono text-sm font-semibold text-zinc-100">
        {value}
      </dd>
    </div>
  );
}

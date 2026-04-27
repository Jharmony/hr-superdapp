import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useCallback } from 'react';
import { formatEther } from 'viem';
import { useBalance } from 'wagmi';
import { hoodratsChainId } from '../../lib/chain';
import { etherscanAddressUrl } from '../../lib/nftMarketLinks';

function shortenAddress(a: string): string {
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function formatWalletEth(wei: bigint | undefined): string {
  if (wei == null) return '—';
  const v = Number(formatEther(wei));
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  if (v < 1e-8) return v.toExponential(2);
  if (v < 0.0001) return v.toFixed(8).replace(/\.?0+$/, '');
  if (v < 1) return v.toFixed(6).replace(/\.?0+$/, '');
  return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

type ConnectedProps = {
  address: `0x${string}`;
  ensName?: string | null;
  chainName: string;
  chainId: number;
  onOpenAccount: () => void;
};

function ConnectedWalletPanel({ address, ensName, chainName, chainId, onOpenAccount }: ConnectedProps) {
  const displayLabel = ensName?.trim() || shortenAddress(address);
  const { data: bal, isLoading } = useBalance({ address });
  const onMainnet = chainId === hoodratsChainId;

  const copy = useCallback(async () => {
    if (!navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      /* ignore */
    }
  }, [address]);

  return (
    <div className="w-full max-w-[15rem] rounded-xl border border-emerald-500/35 bg-zinc-950/92 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/90">Wallet</p>
      <button
        type="button"
        onClick={onOpenAccount}
        className="mt-1 w-full truncate text-left font-mono text-[11px] text-zinc-100 underline-offset-2 hover:text-emerald-200 hover:underline"
        title={address}
      >
        {displayLabel}
      </button>
      <p className="mt-0.5 text-[10px] text-zinc-500">{chainName}</p>
      {!onMainnet ? (
        <p className="mt-1 text-[9px] leading-snug text-amber-200/90">
          Hoodrats worlds expect <span className="font-semibold text-amber-100">Ethereum</span> — switch
          network in your wallet if assets look wrong.
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-zinc-800/90 pt-2">
        <span className="text-[10px] text-zinc-500">Balance</span>
        <span className="font-mono text-[11px] text-zinc-200">
          {isLoading ? '…' : `${formatWalletEth(bal?.value)} ETH`}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded border border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-300 hover:border-emerald-500/40"
        >
          Copy
        </button>
        <a
          href={etherscanAddressUrl(address)}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-300 hover:border-emerald-500/40"
        >
          Etherscan
        </a>
      </div>
    </div>
  );
}

/**
 * Compact wallet strip for 3D worlds — bottom-right, mirrors {@link WorldTbaHud} on the left.
 */
export function WorldWalletHud() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            className="pointer-events-auto absolute bottom-4 right-3 z-[228] w-[min(15rem,calc(100vw-1.5rem))] md:bottom-5 md:right-4"
            {...(!ready && {
              'aria-hidden': true,
              style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
            })}
          >
            {!ready ? null : !connected ? (
              <button
                type="button"
                onClick={openConnectModal}
                className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-left text-[11px] font-semibold text-emerald-100 shadow-lg backdrop-blur-sm transition hover:border-emerald-400/55 hover:bg-emerald-500/15"
              >
                Connect wallet
              </button>
            ) : chain.unsupported ? (
              <button
                type="button"
                onClick={openChainModal}
                className="w-full rounded-xl border border-red-500/45 bg-red-950/50 px-3 py-2 text-left text-[11px] font-semibold text-red-100 shadow-lg backdrop-blur-sm transition hover:border-red-400/60"
              >
                Wrong network — tap to switch
              </button>
            ) : (
              <ConnectedWalletPanel
                address={account.address as `0x${string}`}
                ensName={account.ensName}
                chainName={chain.name ?? 'Unknown chain'}
                chainId={chain.id}
                onOpenAccount={openAccountModal}
              />
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

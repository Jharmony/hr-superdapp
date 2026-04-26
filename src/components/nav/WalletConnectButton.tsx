import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NavActiveRatChip } from './NavActiveRatChip';

export function WalletConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className="rounded-lg border border-lime-400/40 bg-lime-400/10 px-4 py-2 text-sm font-semibold text-lime-200 shadow-[0_0_20px_rgba(163,230,53,0.15)] transition hover:bg-lime-400/20"
                  >
                    Connect wallet
                  </button>
                );
              }
              if (chain.unsupported) {
                return (
                  <button
                    type="button"
                    onClick={openChainModal}
                    className="rounded-lg border border-red-500/50 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-200"
                  >
                    Wrong network
                  </button>
                );
              }
              return (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <NavActiveRatChip />
                  <button
                    type="button"
                    onClick={openChainModal}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-600"
                  >
                    {chain.hasIcon && chain.iconUrl ? (
                      <span className="mr-2 inline-flex h-4 w-4 align-middle">
                        <img
                          alt={chain.name ?? 'chain'}
                          src={chain.iconUrl}
                          className="h-4 w-4 rounded-full"
                        />
                      </span>
                    ) : null}
                    {chain.name}
                  </button>
                  <button
                    type="button"
                    onClick={openAccountModal}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-100 hover:border-lime-500/40"
                  >
                    {account.displayName}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

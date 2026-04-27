import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MergedWalletMenu } from './MergedWalletMenu';

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
                <MergedWalletMenu
                  chain={chain}
                  account={account}
                  openAccountModal={openAccountModal}
                  openChainModal={openChainModal}
                />
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { hoodratsChain } from './chain';

const projectId =
  import.meta.env.PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'demo-placeholder';

/** Stable public RPC — default public endpoints in wallets often 429 or throttle reads. */
const defaultRpc = 'https://ethereum.publicnode.com';
const rpcUrl =
  (import.meta.env.PUBLIC_ETH_RPC_URL as string | undefined)?.trim() ||
  defaultRpc;

export const wagmiConfig = getDefaultConfig({
  appName: 'Hoodrats Super-Dapp',
  projectId,
  chains: [hoodratsChain],
  transports: {
    [hoodratsChain.id]: http(rpcUrl),
  },
  ssr: true,
});

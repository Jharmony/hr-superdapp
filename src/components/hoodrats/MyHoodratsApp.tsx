import { useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Web3Providers } from '../web3/Web3Providers';
import { SiteNav } from '../nav/SiteNav';
import { MintDockChrome } from '../mint/MintPanel';
import { HomeFooter } from '../home/HomeFooter';
import { HOODRATS_ADDRESS, hoodratsAbi } from '../../lib/contract';
import { hoodratsChainId } from '../../lib/chain';
import { OwnedRatCard } from './OwnedRatCard';

function MyHoodratsInner() {
  const { address, isConnected } = useAccount();

  const { data: tokenIds, isLoading } = useReadContract({
    chainId: hoodratsChainId,
    address: HOODRATS_ADDRESS,
    abi: hoodratsAbi,
    functionName: 'tokensOfOwner',
    args: [address!],
    query: {
      enabled: Boolean(address && isConnected),
    },
  });

  const ids = useMemo(() => {
    if (!tokenIds || !Array.isArray(tokenIds)) return [];
    return [...tokenIds].map((b) => Number(b)).sort((a, b) => a - b);
  }, [tokenIds]);

  return (
    <>
      <div className="flex min-h-svh flex-col bg-zinc-950">
        <SiteNav />
        <div className="flex min-h-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-6xl shrink-0 px-4 py-12">
            <h1 className="text-3xl font-black text-white md:text-4xl">
              My Hoodrats
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Connect the same wallet you use on the home page. Owned token IDs
              come from <code className="text-lime-200/90">tokensOfOwner</code> on
              the contract.
            </p>

            {!isConnected ? (
              <p className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-300">
                Connect your wallet with the button in the header to load your
                rats.
              </p>
            ) : isLoading ? (
              <p className="mt-10 text-sm text-zinc-500">Loading your rats…</p>
            ) : ids.length === 0 ? (
              <p className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-300">
                No Hoodrats found for this wallet on mainnet.
              </p>
            ) : (
              <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ids.map((id) => (
                  <li key={id}>
                    <OwnedRatCard tokenId={id} />
                  </li>
                ))}
              </ul>
            )}
          </main>
          <div className="mt-auto w-full shrink-0">
            <HomeFooter />
          </div>
        </div>
      </div>
      <MintDockChrome />
    </>
  );
}

export function MyHoodratsApp() {
  return (
    <Web3Providers>
      <MyHoodratsInner />
    </Web3Providers>
  );
}

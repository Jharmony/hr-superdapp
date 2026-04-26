import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Web3Providers } from '../web3/Web3Providers';
import { SiteNav } from '../nav/SiteNav';
import { MintDockChrome } from '../mint/MintPanel';
import { HomeFooter } from '../home/HomeFooter';
import {
  clearActiveHoodratTokenId,
  readActiveHoodratTokenId,
  writeActiveHoodratTokenId,
} from '../../lib/activeHoodratStorage';
import { HOODRATS_ADDRESS, hoodratsAbi } from '../../lib/contract';
import { hoodratsChainId } from '../../lib/chain';
import { OwnedRatCard } from './OwnedRatCard';

function MyHoodratsInner() {
  const { address, isConnected } = useAccount();
  const wallet = address?.toLowerCase();
  const [pickTick, setPickTick] = useState(0);

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

  const storedActive = wallet ? readActiveHoodratTokenId(wallet) : null;

  useEffect(() => {
    if (!wallet || storedActive == null || ids.length === 0) return;
    if (!ids.includes(storedActive)) {
      clearActiveHoodratTokenId(wallet);
      setPickTick((t) => t + 1);
    }
  }, [wallet, storedActive, ids]);

  const activeId = useMemo(() => {
    void pickTick;
    if (!wallet) return null;
    const s = readActiveHoodratTokenId(wallet);
    return s != null && ids.includes(s) ? s : null;
  }, [wallet, ids, pickTick]);

  return (
    <>
      <div className="flex min-h-svh flex-col bg-zinc-950">
        <SiteNav />
        <div className="flex min-h-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-6xl shrink-0 px-4 py-12">
            <h1 className="text-3xl font-black text-white md:text-4xl">
              My Hoodrats
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              This page lists every Hoodrat your connected wallet holds on Ethereum
              mainnet. Open a token, use <span className="text-zinc-300">3D + GLB</span> for a
              tribe-accurate preview and export, or tap the{' '}
              <span className="font-semibold text-lime-200/90">+</span> on a rat’s art to set your{' '}
              <span className="text-zinc-300">active rat</span> — that drives the header profile,
              home hero tint, cyber / UR worlds, and Tokenbound backpack views.
            </p>

            {!isConnected ? (
              <p className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-300">
                Connect your wallet with the button in the header to see your Hoodrats here.
              </p>
            ) : isLoading ? (
              <p className="mt-10 text-sm text-zinc-500">Loading your rats…</p>
            ) : ids.length === 0 ? (
              <p className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-300">
                No Hoodrats found for this wallet on mainnet.
              </p>
            ) : (
              <>
                {activeId != null ? (
                  <div className="mt-8 rounded-2xl border border-lime-500/35 bg-lime-950/20 px-5 py-4">
                    <p className="text-sm text-zinc-200">
                      <span className="font-semibold text-lime-200">Active rat for 3D worlds:</span>{' '}
                      #{activeId} — same tribe tint as My Hoodrats preview / GLB export.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <a
                        href="/world/"
                        className="inline-flex rounded-lg bg-lime-400 px-4 py-2 text-xs font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_18px_rgba(163,230,53,0.25)] transition hover:bg-lime-300"
                      >
                        Enter cyber district
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          if (wallet) clearActiveHoodratTokenId(wallet);
                          setPickTick((t) => t + 1);
                        }}
                        className="inline-flex rounded-lg border border-zinc-600 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900/80"
                      >
                        Clear active
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-8 max-w-2xl rounded-xl border border-zinc-800/90 bg-zinc-900/30 px-4 py-3 text-xs leading-relaxed text-zinc-500">
                    Tap the <span className="font-medium text-zinc-400">+</span> on a rat’s thumbnail
                    (top-left) to set the active Hoodrat for 3D worlds, or use the{' '}
                    <span className="font-medium text-zinc-400">Active</span> chip in the header once
                    you have one — tribe tint comes from on-chain metadata.
                  </p>
                )}
                <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {ids.map((id) => (
                    <li key={id}>
                      <OwnedRatCard
                        tokenId={id}
                        isActive={activeId === id}
                        onSetActive={
                          wallet
                            ? () => {
                                writeActiveHoodratTokenId(wallet, id);
                                setPickTick((t) => t + 1);
                              }
                            : undefined
                        }
                      />
                    </li>
                  ))}
                </ul>
              </>
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

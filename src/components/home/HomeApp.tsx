import { AppErrorBoundary } from '../AppErrorBoundary';
import { HoodratHeroCanvas } from '../hero/HoodratHeroCanvas';
import { Web3Providers } from '../web3/Web3Providers';
import { SiteNav } from '../nav/SiteNav';
import { MintSection } from '../mint/MintPanel';
import { FeaturedRatCard } from './FeaturedRatCard';
import { HomeFooter } from './HomeFooter';
import { TokenboundShowcasePanel } from './TokenboundShowcasePanel';

export function HomeApp() {
  return (
    <Web3Providers>
      <div className="flex min-h-svh flex-col bg-zinc-950">
        <SiteNav />
        <div className="flex min-h-0 flex-1 flex-col">
          <main className="shrink-0">
            <section className="relative overflow-hidden border-b border-zinc-800">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(163,230,53,0.12),_transparent_55%)]" />
              <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] md:items-center md:gap-12 md:py-24">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-lime-300/90">
                    Ethereum · ERC-721A · ERC-6551 · Arweave media
                  </p>
                  <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight text-white md:text-6xl">
                    Hoodrats Super-Dapp
                  </h1>
                  <p className="mt-2 text-lg font-medium text-lime-100/80 md:text-xl">
                    Interdimensional invasive Rodentia from exoplanet HOOD-420PJ.
                  </p>
                  <p className="mt-6 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
                    A 10,000-piece ERC-721A collection: mint on-chain, metadata and art
                    on Arweave, and each token can carry an ERC-6551 tokenbound
                    experience when you open its detail page.
                  </p>
                  <div className="mt-10 flex flex-wrap gap-3">
                    <a
                      href="#mint"
                      className="rounded-xl bg-lime-400 px-6 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_28px_rgba(163,230,53,0.35)] transition hover:bg-lime-300"
                    >
                      Mint
                    </a>
                    <a
                      href="/my-hoodrats/"
                      className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:border-lime-500/40"
                    >
                      My Hoodrats
                    </a>
                  </div>
                </div>
                <div className="relative min-h-[280px] md:min-h-0">
                  <div className="pointer-events-auto rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-1 shadow-[0_0_0_1px_rgba(24,24,27,0.6)] ring-1 ring-lime-400/10">
                    <AppErrorBoundary
                      title="Hero 3D could not load"
                      hint={
                        <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                          Set <code className="text-lime-200/90">PUBLIC_HOODRATS_MODEL_URL</code> to your
                          public HTTPS URL for <code className="text-zinc-200">hoodrats.glb</code>, or ship the
                          file under <code className="text-zinc-200">public/models/</code>.
                        </p>
                      }
                    >
                      <HoodratHeroCanvas />
                    </AppErrorBoundary>
                    <a
                      href="/world/"
                      className="pointer-events-auto absolute top-3 left-1/2 z-20 w-[max(92%,220px)] -translate-x-1/2 rounded-full border border-fuchsia-500/45 bg-zinc-950/90 px-4 py-2.5 text-center text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-100 shadow-[0_0_28px_rgba(217,70,239,0.28)] backdrop-blur-sm transition hover:border-cyan-400/55 hover:text-cyan-100 md:top-4"
                    >
                      Enter cyber district
                    </a>
                  </div>
                  <p className="mt-2 text-center text-[11px] text-zinc-500">
                    {
                      'Orbit + scroll zoom · W walk · Shift+W or R run · Space jump · I idle · pill controls · Enter cyber district (button above)'
                    }
                  </p>
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-16">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <h2 className="text-2xl font-black text-white">Featured rats</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Live metadata from <code className="text-lime-200/90">tokenURI</code>{' '}
                    — tokens 1, 2, 3.
                  </p>
                </div>
              </div>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((id) => (
                  <FeaturedRatCard key={id} tokenId={id} />
                ))}
              </div>
            </section>

            <section className="border-y border-zinc-800 bg-zinc-900/20 py-12 pb-10 md:py-14 md:pb-10">
              <div className="mx-auto max-w-6xl px-4">
                <h2 className="text-2xl font-black text-white">ERC-6551 · Tokenbound</h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
                  When metadata includes <code className="text-zinc-200">animation_url</code>,
                  the token page centers that interactive frame so you get the full
                  tokenbound surface in one responsive view.
                </p>
                <TokenboundShowcasePanel />
              </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 pt-10 pb-3 md:pt-12 md:pb-4">
              <div className="mx-auto w-full max-w-4xl">
                <MintSection />
              </div>
            </section>
          </main>
          <div className="mt-auto w-full shrink-0">
            <HomeFooter />
          </div>
        </div>
      </div>
    </Web3Providers>
  );
}

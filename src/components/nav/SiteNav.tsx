import { WalletConnectButton } from './WalletConnectButton';

const links: { href: string; label: string; ext?: true }[] = [
  { href: '/', label: 'Home' },
  { href: '/marketplace/', label: 'Market' },
  { href: '/my-hoodrats/', label: 'My Hoodrats' },
  { href: 'https://opensea.io/collection/hood-rats', label: 'OpenSea', ext: true },
  {
    href: 'https://etherscan.io/address/0xa05803e679f517cfd9f20031816ab57a7b2fc2d3',
    label: 'Contract',
    ext: true,
  },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <a href="/" className="font-black tracking-tight text-lime-200">
          Hoodrats <span className="text-zinc-500">Super-Dapp</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="transition hover:text-lime-200"
              {...(l.ext ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <WalletConnectButton />
      </div>
      <nav className="flex flex-wrap gap-x-4 gap-y-2 border-t border-zinc-800/80 px-4 py-2 text-xs text-zinc-500 md:hidden">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="hover:text-lime-200"
            {...(l.ext ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            {l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

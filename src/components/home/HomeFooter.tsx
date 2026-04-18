import type { JSX } from 'react';

/** Page / footer background (Tailwind `zinc-950`). */
const BG = '#09090b';
/** Primary accent (Tailwind `lime-400`). */
const ACCENT = '#a3e635';

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}

function IconDiscord({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
      />
    </svg>
  );
}

/**
 * Linktree-style mark: rounded tile matches page bg; tree strokes in lime (inverted
 * from typical green-tile / black-tree artwork).
 */
function IconLinktreeThemed({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="6.25" fill={BG} />
      <g fill="none" stroke={ACCENT} strokeWidth="2.05" strokeLinecap="round">
        <path d="M12 4.6v3.35M12 16.05V19.4M4.6 12h3.35M16.05 12H19.4M6.45 6.45l2.37 2.37M15.18 15.18l2.37 2.37M6.45 17.55l2.37-2.37M15.18 8.82l2.37-2.37" />
        <path d="M12 12.4V19.25" strokeWidth="2.2" />
      </g>
    </svg>
  );
}

function IconOpenSeaAsset({ className }: { className?: string }) {
  return (
    <img
      src="/icons/opensea.png"
      alt=""
      width={20}
      height={20}
      decoding="async"
      draggable={false}
      className={`pointer-events-none object-contain opacity-[0.82] transition group-hover:opacity-100 ${className ?? ''}`}
      style={{
        filter:
          'brightness(0) saturate(100%) invert(72%) sepia(3%) saturate(120%) hue-rotate(169deg)',
      }}
    />
  );
}

const iconBtn =
  'group inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800/80 text-zinc-400 transition hover:border-lime-500/30 hover:bg-zinc-900/80 hover:text-lime-200';

const ICON_LINKS: {
  href: string;
  label: string;
  render: (iconClass: string) => JSX.Element;
}[] = [
  { href: 'https://x.com/HoodRatNFTs', label: 'X (Twitter)', render: (c) => <IconX className={c} /> },
  {
    href: 'https://discord.com/invite/f5xjzbvAeW',
    label: 'Discord',
    render: (c) => <IconDiscord className={c} />,
  },
  {
    href: 'https://linktr.ee/jharmonydesigns',
    label: 'Linktree',
    render: (c) => <IconLinktreeThemed className={c} />,
  },
  {
    href: 'https://opensea.io/collection/hood-rats',
    label: 'OpenSea',
    render: (c) => <IconOpenSeaAsset className={c} />,
  },
];

export function HomeFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 pt-2.5 md:pt-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+var(--mint-dock-scroll-pad,5.5rem)))]">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between md:gap-3">
          <p className="shrink-0 text-center text-sm text-zinc-500 md:text-left">
            Contract{' '}
            <a
              className="font-mono text-lime-200/90 underline-offset-2 hover:underline"
              href="https://etherscan.io/address/0xa05803e679f517cfd9f20031816ab57a7b2fc2d3"
              target="_blank"
              rel="noreferrer"
            >
              0xa058…c2d3
            </a>
          </p>

          <p className="text-center text-[11px] leading-snug text-zinc-600 md:flex-1 md:px-3">
            © {year} Protocol Growth Studio, LLC. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-1.5 md:shrink-0 md:justify-end">
            {ICON_LINKS.map(({ href, label, render }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                className={iconBtn}
                aria-label={label}
                title={label}
              >
                {render('h-5 w-5')}
              </a>
            ))}
            <a
              href="https://mint_hoodrats.ar.io"
              target="_blank"
              rel="noreferrer"
              className="ml-1 inline-flex h-10 items-center rounded-lg border border-transparent px-2.5 text-sm font-medium text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-900/60 hover:text-lime-200"
            >
              Legacy Mint
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

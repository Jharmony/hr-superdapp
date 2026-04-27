import { useEffect, useRef, useState } from 'react';

type ChainLike = {
  hasIcon?: boolean;
  iconUrl?: string;
  name?: string;
  unsupported?: boolean;
};

type AccountLike = {
  displayName: string;
};

/**
 * Single compact control: chain icon + truncated address; menu opens account vs network modals.
 */
export function MergedWalletMenu({
  chain,
  account,
  openAccountModal,
  openChainModal,
}: {
  chain: ChainLike;
  account: AccountLike;
  openAccountModal: () => void;
  openChainModal: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Wallet menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 max-w-[min(100vw-8rem,13rem)] items-center gap-2 rounded-lg border border-zinc-700/90 bg-zinc-900/95 py-0 pl-2 pr-2 text-left shadow-sm transition hover:border-lime-500/35 hover:bg-zinc-900"
      >
        {chain.hasIcon && chain.iconUrl ? (
          <span className="relative h-[18px] w-[18px] shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-600/70">
            <img alt="" src={chain.iconUrl} className="h-full w-full object-cover" />
          </span>
        ) : (
          <span className="h-[18px] w-[18px] shrink-0 rounded-full bg-zinc-700" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-medium text-zinc-100">
          {account.displayName}
        </span>
        <span
          className={`inline-block shrink-0 text-[9px] text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-[200] min-w-[12.5rem] rounded-lg border border-zinc-700 bg-zinc-950 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
        >
          <p className="border-b border-zinc-800/90 px-3 py-2 text-[10px] text-zinc-500">
            Connected on <span className="font-medium text-zinc-400">{chain.name ?? 'network'}</span>
          </p>
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2.5 text-left text-xs font-medium text-zinc-200 transition hover:bg-zinc-800/80"
            onClick={() => {
              setOpen(false);
              openAccountModal();
            }}
          >
            Wallet & activity
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2.5 text-left text-xs font-medium text-zinc-200 transition hover:bg-zinc-800/80"
            onClick={() => {
              setOpen(false);
              openChainModal();
            }}
          >
            Switch network
          </button>
        </div>
      ) : null}
    </div>
  );
}

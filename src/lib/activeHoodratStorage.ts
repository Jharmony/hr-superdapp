const STORAGE_KEY = 'superdapp:activeHoodrat:v1';

type StoreV1 = {
  v: 1;
  /** Lowercase `0x` wallet address → Hoodrats token id */
  walletToTokenId: Record<string, number>;
};

function emptyStore(): StoreV1 {
  return { v: 1, walletToTokenId: {} };
}

function readStore(): StoreV1 {
  if (typeof window === 'undefined') return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw?.trim()) return emptyStore();
    const o = JSON.parse(raw) as Partial<StoreV1>;
    if (o?.v !== 1 || o.walletToTokenId == null || typeof o.walletToTokenId !== 'object') {
      return emptyStore();
    }
    const walletToTokenId: Record<string, number> = {};
    for (const [k, v] of Object.entries(o.walletToTokenId)) {
      const addr = String(k).trim().toLowerCase();
      const id = typeof v === 'number' ? v : Number(v);
      if (addr.startsWith('0x') && Number.isFinite(id) && id >= 0) {
        walletToTokenId[addr] = Math.floor(id);
      }
    }
    return { v: 1, walletToTokenId };
  } catch {
    return emptyStore();
  }
}

function writeStore(s: StoreV1) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota / private mode */
  }
}

function emitChanged() {
  try {
    window.dispatchEvent(new CustomEvent('superdapp:activeHoodratChanged'));
  } catch {
    /* ignore */
  }
}

/** Active Hoodrat token id for this wallet, or `null` if none / unreadable. */
export function readActiveHoodratTokenId(walletAddress: string | undefined): number | null {
  const w = walletAddress?.trim().toLowerCase();
  if (!w?.startsWith('0x')) return null;
  const id = readStore().walletToTokenId[w];
  return typeof id === 'number' && Number.isFinite(id) ? id : null;
}

export function writeActiveHoodratTokenId(walletAddress: string, tokenId: number): void {
  const w = walletAddress.trim().toLowerCase();
  if (!w.startsWith('0x')) return;
  const tid = Math.floor(tokenId);
  if (!Number.isFinite(tid) || tid < 0) return;
  const s = readStore();
  s.walletToTokenId[w] = tid;
  writeStore(s);
  emitChanged();
}

export function clearActiveHoodratTokenId(walletAddress: string): void {
  const w = walletAddress.trim().toLowerCase();
  if (!w.startsWith('0x')) return;
  const s = readStore();
  if (s.walletToTokenId[w] === undefined) return;
  delete s.walletToTokenId[w];
  writeStore(s);
  emitChanged();
}

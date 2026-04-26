import { useMemo, useState, type ImgHTMLAttributes } from 'react';
import { arweaveFallbackUrls } from '../../lib/arweaveGateways';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | undefined;
  /** Extra URLs tried in order after `src` (and its Arweave variants) fail — e.g. OpenSea CDN fallbacks. */
  alternates?: string[] | undefined;
};

function expandUrlChain(primary: string | undefined, alternates: string[] | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  if (primary?.trim()) {
    for (const u of arweaveFallbackUrls(primary.trim())) push(u);
  }
  for (const alt of alternates ?? []) {
    const t = typeof alt === 'string' ? alt.trim() : '';
    if (!t) continue;
    for (const u of arweaveFallbackUrls(t)) push(u);
  }
  return out;
}

export function FallbackImage({ src, alternates, onError, ...rest }: Props) {
  const fallbacks = useMemo(() => expandUrlChain(src, alternates), [src, alternates]);
  const [idx, setIdx] = useState(0);

  const activeSrc = fallbacks[idx];
  if (!activeSrc) return null;

  return (
    <img
      {...rest}
      src={activeSrc}
      onError={(e) => {
        if (idx + 1 < fallbacks.length) {
          setIdx((v) => v + 1);
        }
        onError?.(e);
      }}
    />
  );
}

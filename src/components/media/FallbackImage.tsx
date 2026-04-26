import { useMemo, useState, type ImgHTMLAttributes } from 'react';
import { arweaveFallbackUrls } from '../../lib/arweaveGateways';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | undefined;
};

export function FallbackImage({ src, onError, ...rest }: Props) {
  const fallbacks = useMemo(() => (src ? arweaveFallbackUrls(src) : []), [src]);
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


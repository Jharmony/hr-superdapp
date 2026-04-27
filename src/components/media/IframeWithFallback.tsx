import { useEffect, useRef, useState } from 'react';

export function IframeWithFallback({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setTimedOut(true), 4500);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [src]);

  return (
    <div className="relative h-full w-full bg-black">
      <iframe
        title={title}
        src={src}
        className={className}
        // Match prior behavior as closely as possible; some embeds are sensitive to referrer policy.
        loading="eager"
        allow="clipboard-read; clipboard-write; accelerometer; gyroscope; fullscreen"
        onLoad={() => {
          setLoaded(true);
          if (timerRef.current) window.clearTimeout(timerRef.current);
        }}
      />
      {timedOut && !loaded ? (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center p-6 text-center">
          <div className="max-w-sm rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 text-xs text-zinc-300 backdrop-blur">
            <p className="font-semibold text-zinc-100">Interactive view didn’t load in time.</p>
            <p className="mt-1 text-zinc-500">
              Some browsers or extensions block embedded iframes. Open it directly:
            </p>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-1.5 font-semibold text-zinc-200 transition hover:border-lime-500/35 hover:text-lime-200"
            >
              Open interactive view
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}


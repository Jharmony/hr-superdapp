function uniq(list: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of list) {
    const k = u.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/**
 * Returns a list of fallback URLs for Arweave assets.
 *
 * Why: Some gateways intermittently 404/timeout, or return inconsistent headers. `<img>` doesn't
 * need CORS, but a gateway outage still breaks UX — so we try multiple known-good gateways.
 *
 * Note: Turbo Gateway generally supports `/{txId}` and `/{txId}/{path}` similarly to `arweave.net`.
 */
export function arweaveFallbackUrls(raw: string): string[] {
  const input = raw.trim();
  if (!input) return [];

  let url: URL | null = null;
  try {
    url = new URL(input);
  } catch {
    return [input];
  }

  const host = url.hostname.toLowerCase();
  const path = `${url.pathname}${url.search}${url.hash}`;

  const isArweaveLike =
    host === 'arweave.net' ||
    host === 'www.arweave.net' ||
    host.endsWith('.arweave.net') ||
    host === 'arweave.dev' ||
    host === 'www.arweave.dev' ||
    host.endsWith('.arweave.dev') ||
    host === 'ar-io.net' ||
    host === 'www.ar-io.net' ||
    host.endsWith('.ar-io.net') ||
    host === 'g8way.io' ||
    host === 'www.g8way.io' ||
    host.endsWith('.g8way.io') ||
    host === 'turbo-gateway.com' ||
    host.endsWith('.turbo-gateway.com');

  if (!isArweaveLike) return [input];

  return uniq([
    input,
    `https://arweave.net${path}`,
    `https://ar-io.net${path}`,
    `https://g8way.io${path}`,
    `https://arweave.dev${path}`,
    `https://turbo-gateway.com${path}`,
  ]);
}

/** Prefer Turbo gateway for Arweave-like URLs (more reliable for GLBs). */
export function preferTurboGatewayUrl(raw: string): string {
  const input = raw.trim();
  if (!input) return input;
  let url: URL | null = null;
  try {
    url = new URL(input);
  } catch {
    return input;
  }
  const host = url.hostname.toLowerCase();
  if (
    host === 'arweave.net' ||
    host === 'www.arweave.net' ||
    host.endsWith('.arweave.net') ||
    host === 'arweave.dev' ||
    host === 'www.arweave.dev' ||
    host.endsWith('.arweave.dev') ||
    host === 'ar-io.net' ||
    host === 'www.ar-io.net' ||
    host.endsWith('.ar-io.net') ||
    host === 'g8way.io' ||
    host === 'www.g8way.io' ||
    host.endsWith('.g8way.io')
  ) {
    url.hostname = 'turbo-gateway.com';
    return url.toString();
  }
  return input;
}


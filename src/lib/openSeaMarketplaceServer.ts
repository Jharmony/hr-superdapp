import { HOODRATS_ADDRESS } from './contract';

const OPENSEA = 'https://api.opensea.io';
const CONTRACT = HOODRATS_ADDRESS.toLowerCase();

function osHeaders(key: string): Record<string, string> {
  return { accept: 'application/json', 'x-api-key': key };
}

function weiToEth(quantity: string | undefined, decimals: number): number | null {
  if (quantity == null) return null;
  const n = Number(quantity);
  if (!Number.isFinite(n)) return null;
  const d = Number.isFinite(decimals) && decimals >= 0 ? decimals : 18;
  return n / 10 ** d;
}

type OpenSeaNftMeta = {
  name?: string;
  image?: string;
  imageFallbacks?: string[];
  attributes?: unknown[];
};

async function fetchOpenSeaNftMetadata(
  key: string,
  chain: string,
  contract: string,
  tokenId: string,
): Promise<OpenSeaNftMeta | null> {
  const url = `${OPENSEA}/api/v2/chain/${encodeURIComponent(chain)}/contract/${encodeURIComponent(
    contract,
  )}/nfts/${encodeURIComponent(tokenId)}`;
  try {
    const res = await fetch(url, { headers: osHeaders(key), signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { nft?: Record<string, unknown> };
    const nft = data.nft;
    if (!nft || typeof nft !== 'object') return null;

    const disp =
      typeof nft.display_image_url === 'string' && nft.display_image_url.trim()
        ? nft.display_image_url.trim()
        : undefined;
    const img =
      typeof nft.image_url === 'string' && nft.image_url.trim() ? nft.image_url.trim() : undefined;
    const orig =
      typeof nft.original_image_url === 'string' && nft.original_image_url.trim()
        ? nft.original_image_url.trim()
        : undefined;

    const candidates = [disp, img, orig].filter(Boolean) as string[];
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const u of candidates) {
      if (seen.has(u)) continue;
      seen.add(u);
      unique.push(u);
    }
    const primary = unique[0];
    const imageFallbacks = unique.length > 1 ? unique.slice(1) : undefined;

    const nameRaw = typeof nft.name === 'string' ? nft.name.trim() : '';
    const traits = Array.isArray(nft.traits) ? nft.traits : [];
    const attributes = traits.map((raw) => {
      const tr = raw != null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      return { trait_type: tr.trait_type, value: tr.value };
    });

    return {
      name: nameRaw || undefined,
      image: primary,
      imageFallbacks,
      attributes: attributes.length ? attributes : undefined,
    };
  } catch {
    return null;
  }
}

/** Attach name, image(s), and traits to each order’s `token` for marketplace filters + thumbnails. */
export async function enrichOrdersWithOpenSeaNfts(orders: unknown[], key: string): Promise<void> {
  const chain = 'ethereum';
  const uniqueKeys = new Map<string, { contract: string; tokenId: string }>();
  for (const ord of orders) {
    const o = ord as Record<string, unknown>;
    const tok = o.token as Record<string, unknown> | undefined;
    if (!tok) continue;
    const contract = typeof tok.contract === 'string' ? tok.contract.toLowerCase() : '';
    const tokenId = tok.tokenId != null ? String(tok.tokenId).trim() : '';
    if (!contract.startsWith('0x') || !tokenId) continue;
    const ck = `${contract}:${tokenId}`;
    if (!uniqueKeys.has(ck)) uniqueKeys.set(ck, { contract, tokenId });
  }

  const list = [...uniqueKeys.values()];
  const cache = new Map<string, OpenSeaNftMeta | null>();
  const batchSize = 5;

  for (let i = 0; i < list.length; i += batchSize) {
    const chunk = list.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async ({ contract, tokenId }) => {
        const ck = `${contract}:${tokenId}`;
        const meta = await fetchOpenSeaNftMetadata(key, chain, contract, tokenId);
        cache.set(ck, meta);
      }),
    );
  }

  for (const ord of orders) {
    const o = ord as Record<string, unknown>;
    const tok = o.token as Record<string, unknown> | undefined;
    if (!tok) continue;
    const contract = typeof tok.contract === 'string' ? tok.contract.toLowerCase() : '';
    const tokenId = tok.tokenId != null ? String(tok.tokenId).trim() : '';
    const meta = cache.get(`${contract}:${tokenId}`);
    if (!meta) continue;
    if (meta.name) tok.name = meta.name;
    if (meta.image) tok.image = meta.image;
    if (meta.imageFallbacks?.length) tok.imageFallbacks = meta.imageFallbacks;
    if (meta.attributes?.length) tok.attributes = meta.attributes;
  }
}

/** OpenSea `/api/v2/listings/collection/{slug}/all` → Reservoir-style `orders` items. */
export function mapOpenSeaListingsToReservoirOrders(os: unknown): unknown[] {
  const root = os != null && typeof os === 'object' ? (os as Record<string, unknown>) : null;
  const listings = root && Array.isArray(root.listings) ? root.listings : [];
  const out: unknown[] = [];

  for (const L of listings) {
    const listing = L != null && typeof L === 'object' ? (L as Record<string, unknown>) : null;
    if (!listing) continue;
    const params =
      listing.protocol_data != null && typeof listing.protocol_data === 'object'
        ? ((listing.protocol_data as Record<string, unknown>).parameters as Record<string, unknown> | undefined)
        : undefined;
    const offerer = typeof params?.offerer === 'string' ? params.offerer : null;
    const offer = Array.isArray(params?.offer) ? (params!.offer as Record<string, unknown>[]) : [];
    const erc721 = offer.find((o) => Number(o.itemType) === 2);
    if (!erc721) continue;
    const contract = typeof erc721.token === 'string' ? erc721.token.toLowerCase() : '';
    if (!contract.startsWith('0x') || contract !== CONTRACT) continue;
    const tokenIdRaw = erc721.identifierOrCriteria;
    const tokenId = tokenIdRaw != null ? String(tokenIdRaw).trim() : '';
    if (!tokenId) continue;

    const priceObj =
      listing.price != null && typeof listing.price === 'object'
        ? ((listing.price as Record<string, unknown>).current as Record<string, unknown> | undefined)
        : undefined;
    const wei = typeof priceObj?.value === 'string' ? priceObj.value : undefined;
    const dec = typeof priceObj?.decimals === 'number' ? priceObj.decimals : 18;
    const eth = weiToEth(wei, dec);

    const id =
      typeof listing.order_hash === 'string' && listing.order_hash
        ? listing.order_hash
        : `opensea:${contract}:${tokenId}`;

    out.push({
      id,
      maker: offerer,
      source: { name: 'OpenSea', domain: 'opensea.io' },
      token: {
        contract,
        tokenId,
        name: undefined,
        image: undefined,
        attributes: undefined,
      },
      price: { amount: { decimal: eth, usd: null } },
    });
  }
  return out;
}

/** OpenSea `/api/v2/traits/{slug}` → Reservoir traits shape `{ attributes: [...] }`. */
export function mapOpenSeaTraitsToReservoirAttributes(os: unknown): { attributes: unknown[] } {
  const root = os != null && typeof os === 'object' ? (os as Record<string, unknown>) : null;
  const counts = root?.counts != null && typeof root.counts === 'object' ? (root.counts as Record<string, unknown>) : {};
  const attributes: unknown[] = [];

  for (const [key, valueMap] of Object.entries(counts)) {
    if (!key || valueMap == null || typeof valueMap !== 'object' || Array.isArray(valueMap)) continue;
    const rows: { value: string; count: number }[] = [];
    for (const [value, countRaw] of Object.entries(valueMap as Record<string, unknown>)) {
      if (value == null) continue;
      if (typeof countRaw === 'object') continue; // numeric trait ranges { min, max }
      const count = typeof countRaw === 'number' && Number.isFinite(countRaw) ? countRaw : 0;
      const v = typeof value === 'string' ? value.trim() : String(value);
      if (!v) continue;
      rows.push({ value: v, count });
    }
    rows.sort((a, b) => b.count - a.count);
    if (rows.length) attributes.push({ key, values: rows });
  }

  return { attributes };
}

type HoodratActivityType = 'ask' | 'sale' | 'transfer';

function mapOpenSeaEventToReservoirActivity(ev: Record<string, unknown>): Record<string, unknown> | null {
  const eventType = typeof ev.event_type === 'string' ? ev.event_type.toLowerCase() : '';
  const ts = ev.event_timestamp;
  const timestamp = typeof ts === 'number' && Number.isFinite(ts) ? ts : undefined;

  if (eventType === 'order' && String(ev.order_type).toLowerCase() === 'listing') {
    const asset = ev.asset != null && typeof ev.asset === 'object' ? (ev.asset as Record<string, unknown>) : null;
    if (!asset) return null;
    const contract = typeof asset.contract === 'string' ? asset.contract.toLowerCase() : '';
    if (contract !== CONTRACT) return null;
    const id0 = asset.identifier;
    const tokenId = typeof id0 === 'number' ? id0 : Number(String(id0 ?? '').trim());
    if (!Number.isFinite(tokenId)) return null;
    const pay = ev.payment != null && typeof ev.payment === 'object' ? (ev.payment as Record<string, unknown>) : null;
    const eth = weiToEth(typeof pay?.quantity === 'string' ? pay.quantity : undefined, Number(pay?.decimals) || 18);

    return {
      id: typeof ev.order_hash === 'string' && ev.order_hash ? ev.order_hash : `ask:${timestamp}:${tokenId}`,
      type: 'ask',
      token: { tokenId, contract },
      collection: { id: HOODRATS_ADDRESS },
      price: { amount: { decimal: eth, usd: null } },
      from: typeof ev.maker === 'string' ? ev.maker : undefined,
      to: typeof ev.taker === 'string' && ev.taker.startsWith('0x') ? ev.taker : undefined,
      timestamp,
      txHash: typeof ev.transaction === 'string' ? ev.transaction : undefined,
    };
  }

  if (eventType === 'sale') {
    const nft = ev.nft != null && typeof ev.nft === 'object' ? (ev.nft as Record<string, unknown>) : null;
    if (!nft) return null;
    const contract = typeof nft.contract === 'string' ? nft.contract.toLowerCase() : '';
    if (contract !== CONTRACT) return null;
    const id0 = nft.identifier;
    const tokenId = typeof id0 === 'number' ? id0 : Number(String(id0 ?? '').trim());
    if (!Number.isFinite(tokenId)) return null;
    const pay = ev.payment != null && typeof ev.payment === 'object' ? (ev.payment as Record<string, unknown>) : null;
    const eth = weiToEth(typeof pay?.quantity === 'string' ? pay.quantity : undefined, Number(pay?.decimals) || 18);

    return {
      id: typeof ev.transaction === 'string' ? ev.transaction : `sale:${timestamp}:${tokenId}`,
      type: 'sale',
      token: { tokenId, contract },
      collection: { id: HOODRATS_ADDRESS },
      price: { amount: { decimal: eth, usd: null } },
      from: typeof ev.seller === 'string' ? ev.seller : undefined,
      to: typeof ev.buyer === 'string' ? ev.buyer : undefined,
      timestamp,
      txHash: typeof ev.transaction === 'string' ? ev.transaction : undefined,
    };
  }

  if (eventType === 'transfer') {
    const nft = ev.nft != null && typeof ev.nft === 'object' ? (ev.nft as Record<string, unknown>) : null;
    if (!nft) return null;
    const contract = typeof nft.contract === 'string' ? nft.contract.toLowerCase() : '';
    if (contract !== CONTRACT) return null;
    const id0 = nft.identifier;
    const tokenId = typeof id0 === 'number' ? id0 : Number(String(id0 ?? '').trim());
    if (!Number.isFinite(tokenId)) return null;

    return {
      id: typeof ev.transaction === 'string' ? `${ev.transaction}:${tokenId}` : `xfer:${timestamp}:${tokenId}`,
      type: 'transfer',
      token: { tokenId, contract },
      collection: { id: HOODRATS_ADDRESS },
      price: { amount: { decimal: null, usd: null } },
      from: typeof ev.from_address === 'string' ? ev.from_address : undefined,
      to: typeof ev.to_address === 'string' ? ev.to_address : undefined,
      timestamp,
      txHash: typeof ev.transaction === 'string' ? ev.transaction : undefined,
    };
  }

  return null;
}

function hoodratTypeToOpenSeaEventType(t: HoodratActivityType): string {
  if (t === 'ask') return 'listing';
  return t;
}

export async function proxyOpenSeaListings(
  key: string,
  slug: string,
  continuation: string | null,
  limit: number,
): Promise<Response> {
  const url = new URL(`${OPENSEA}/api/v2/listings/collection/${encodeURIComponent(slug)}/all`);
  url.searchParams.set('limit', String(Math.min(200, Math.max(1, limit))));
  if (continuation) url.searchParams.set('next', continuation);

  const res = await fetch(url.toString(), { headers: osHeaders(key) });
  const text = await res.text();
  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: 'opensea_listings_failed', status: res.status, message: text.slice(0, 240) }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ error: 'opensea_bad_json' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
  const root = parsed != null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  const next = typeof root?.next === 'string' ? root.next : null;
  const orders = mapOpenSeaListingsToReservoirOrders(parsed);
  if (orders.length) {
    await enrichOrdersWithOpenSeaNfts(orders, key);
  }
  return new Response(JSON.stringify({ orders, continuation: next }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 's-maxage=30, stale-while-revalidate=300',
    },
  });
}

export async function proxyOpenSeaTraits(key: string, slug: string): Promise<Response> {
  const url = `${OPENSEA}/api/v2/traits/${encodeURIComponent(slug)}`;
  const res = await fetch(url, { headers: osHeaders(key) });
  const text = await res.text();
  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: 'opensea_traits_failed', status: res.status, message: text.slice(0, 240) }),
      { status: res.status, headers: { 'content-type': 'application/json' } },
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ attributes: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  const body = mapOpenSeaTraitsToReservoirAttributes(parsed);
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 's-maxage=600, stale-while-revalidate=86400',
    },
  });
}

export async function proxyOpenSeaActivity(
  key: string,
  slug: string,
  types: HoodratActivityType[],
  continuation: string | null,
  limit: number,
): Promise<Response> {
  const perTypeLimit = Math.min(200, Math.max(1, limit));
  const osTypes = [...new Set(types.map(hoodratTypeToOpenSeaEventType))];

  if (osTypes.length === 1) {
    const url = new URL(`${OPENSEA}/api/v2/events/collection/${encodeURIComponent(slug)}`);
    url.searchParams.set('limit', String(perTypeLimit));
    url.searchParams.append('event_type', osTypes[0]);
    if (continuation) url.searchParams.set('next', continuation);

    const res = await fetch(url.toString(), { headers: osHeaders(key) });
    const text = await res.text();
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'opensea_events_failed', status: res.status, message: text.slice(0, 240) }),
        { status: res.status, headers: { 'content-type': 'application/json' } },
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ activities: [], continuation: null }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'cache-control': 's-maxage=30, stale-while-revalidate=300' },
      });
    }
    const root = parsed != null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    const rawEvents = root && Array.isArray(root.asset_events) ? root.asset_events : [];
    const events = rawEvents as Record<string, unknown>[];
    const next = typeof root?.next === 'string' ? root.next : null;
    const activities: unknown[] = [];
    for (const ev of events) {
      const row = mapOpenSeaEventToReservoirActivity(ev);
      if (row) activities.push(row);
    }
    return new Response(JSON.stringify({ activities, continuation: next }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 's-maxage=30, stale-while-revalidate=300',
      },
    });
  }

  const cap = Math.min(200, Math.max(1, limit));
  const results = await Promise.all(
    osTypes.map(async (et) => {
      const url = new URL(`${OPENSEA}/api/v2/events/collection/${encodeURIComponent(slug)}`);
      url.searchParams.set('limit', String(cap));
      url.searchParams.append('event_type', et);
      const res = await fetch(url.toString(), { headers: osHeaders(key) });
      const text = await res.text();
      if (!res.ok) return [] as Record<string, unknown>[];
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        const events = Array.isArray(parsed.asset_events)
          ? (parsed.asset_events as Record<string, unknown>[])
          : [];
        return events;
      } catch {
        return [];
      }
    }),
  );

  const merged: Record<string, unknown>[] = [];
  for (const batch of results) {
    for (const ev of batch) {
      const row = mapOpenSeaEventToReservoirActivity(ev);
      if (row) merged.push(row);
    }
  }
  merged.sort((a, b) => {
    const ta = typeof a.timestamp === 'number' ? a.timestamp : 0;
    const tb = typeof b.timestamp === 'number' ? b.timestamp : 0;
    return tb - ta;
  });
  const slice = merged.slice(0, cap);
  return new Response(JSON.stringify({ activities: slice, continuation: null }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 's-maxage=30, stale-while-revalidate=300',
    },
  });
}

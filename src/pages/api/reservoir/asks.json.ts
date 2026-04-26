import type { APIRoute } from 'astro';
import { HOODRATS_ADDRESS } from '../../../lib/contract';

const BASE = 'https://api.reservoir.tools';
const OPENSEA_BASE = 'https://api.opensea.io';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const u = new URL(request.url);
  const continuation = u.searchParams.get('continuation');
  const limit = u.searchParams.get('limit') ?? '40';

  const url = new URL(`${BASE}/orders/asks/v5`);
  url.searchParams.set('contracts', HOODRATS_ADDRESS);
  url.searchParams.set('status', 'active');
  url.searchParams.set('limit', String(Math.min(200, Math.max(1, Number(limit) || 40))));
  url.searchParams.set('sortBy', 'price');
  url.searchParams.set('sortDirection', 'asc');
  url.searchParams.set('includeCriteriaMetadata', 'true');
  if (continuation) url.searchParams.set('continuation', continuation);

  const headers: Record<string, string> = { accept: 'application/json' };
  const key = (import.meta.env.RESERVOIR_API_KEY as string | undefined)?.trim();
  if (key) headers['x-api-key'] = key;

  // #region agent log
  fetch('http://127.0.0.1:7735/ingest/f179b99b-f463-435e-ad76-a5fc4552aef7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9acc9b'},body:JSON.stringify({sessionId:'9acc9b',runId:'pre-fix',hypothesisId:'H1',location:'asks.json.ts:29',message:'reservoir asks proxy request',data:{base:BASE,host:url.host,path:url.pathname,hasKey:Boolean(key),limit,hasContinuation:Boolean(continuation)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion agent log

  try {
    const res = await fetch(url.toString(), { headers });
    // #region agent log
    fetch('http://127.0.0.1:7735/ingest/f179b99b-f463-435e-ad76-a5fc4552aef7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9acc9b'},body:JSON.stringify({sessionId:'9acc9b',runId:'pre-fix',hypothesisId:'H4',location:'asks.json.ts:36',message:'reservoir asks proxy response',data:{status:res.status,ok:res.ok,contentType:res.headers.get('content-type')},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') ?? 'application/json',
        'cache-control': 's-maxage=30, stale-while-revalidate=300',
      },
    });
  } catch (e) {
    const err = e as { name?: string; message?: string; cause?: unknown };
    const cause = err && typeof err === 'object' ? (err as any).cause : undefined;
    // #region agent log
    fetch('http://127.0.0.1:7735/ingest/f179b99b-f463-435e-ad76-a5fc4552aef7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9acc9b'},body:JSON.stringify({sessionId:'9acc9b',runId:'pre-fix',hypothesisId:'H3',location:'asks.json.ts:54',message:'reservoir asks proxy fetch threw',data:{name:err?.name,message:err?.message,causeName:(cause as any)?.name,causeCode:(cause as any)?.code,causeErrno:(cause as any)?.errno,causeSyscall:(cause as any)?.syscall,causeHostname:(cause as any)?.hostname},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    // Fallback: if Reservoir DNS is down, try OpenSea collection listings so the marketplace still works.
    if ((cause as any)?.code === 'ENOTFOUND') {
      const slug =
        (import.meta.env.OPENSEA_COLLECTION_SLUG as string | undefined)?.trim() || 'hood-rats';
      const osKey = (import.meta.env.OPENSEA_API_KEY as string | undefined)?.trim();

      // #region agent log
      fetch('http://127.0.0.1:7735/ingest/f179b99b-f463-435e-ad76-a5fc4552aef7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9acc9b'},body:JSON.stringify({sessionId:'9acc9b',runId:'pre-fix',hypothesisId:'H2',location:'asks.json.ts:63',message:'falling back to opensea listings',data:{slug,hasOpenSeaKey:Boolean(osKey)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log

      if (!osKey) {
        return new Response(
          JSON.stringify({
            error: 'opensea_key_missing',
            message: 'Reservoir DNS failed and OPENSEA_API_KEY is not set',
          }),
          { status: 502, headers: { 'content-type': 'application/json' } },
        );
      }

      const next = continuation ?? undefined;
      const osUrl = new URL(`${OPENSEA_BASE}/api/v2/listings/collection/${slug}/all`);
      osUrl.searchParams.set('limit', String(Math.min(200, Math.max(1, Number(limit) || 40))));
      if (next) osUrl.searchParams.set('next', next);

      try {
        const osRes = await fetch(osUrl.toString(), {
          headers: { accept: 'application/json', 'x-api-key': osKey },
        });
        const osText = await osRes.text();
        if (!osRes.ok) {
          return new Response(
            JSON.stringify({
              error: 'opensea_failed',
              status: osRes.status,
              message: osText.slice(0, 200),
            }),
            { status: 502, headers: { 'content-type': 'application/json' } },
          );
        }

        const osJson = JSON.parse(osText) as any;
        const orders = Array.isArray(osJson?.orders) ? osJson.orders : [];
        const mapped: any[] = [];
        for (const o of orders) {
          const assets = o?.maker_asset_bundle?.assets;
          const a0 = Array.isArray(assets) ? assets[0] : null;
          const tokenId = a0?.token_id ?? a0?.tokenId;
          const contract = a0?.asset_contract?.address ?? a0?.asset_contract_address ?? a0?.assetContract?.address;
          if (!tokenId || !contract) continue;

          const eth = (() => {
            const p = o?.current_price;
            const n = typeof p === 'string' ? Number(p) : typeof p === 'number' ? p : NaN;
            // current_price is wei string in legacy; best-effort convert if huge
            if (!Number.isFinite(n)) return null;
            return n > 1e12 ? n / 1e18 : n;
          })();

          mapped.push({
            id: o?.order_hash ?? o?.orderHash ?? `opensea:${String(tokenId)}`,
            maker: o?.maker?.address ?? o?.maker ?? null,
            source: { name: 'OpenSea', domain: 'opensea.io' },
            token: {
              contract,
              tokenId,
              name: a0?.name ?? undefined,
              image: a0?.image_url ?? a0?.imageUrl ?? undefined,
              attributes: a0?.traits ?? a0?.traits ?? undefined,
            },
            price: { amount: { decimal: eth, usd: null } },
          });
        }

        return new Response(
          JSON.stringify({ orders: mapped, continuation: typeof osJson?.next === 'string' ? osJson.next : null }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      } catch (osErr) {
        return new Response(
          JSON.stringify({ error: 'opensea_exception', message: (osErr as any)?.message ?? 'opensea fetch failed' }),
          { status: 502, headers: { 'content-type': 'application/json' } },
        );
      }
    }

    return new Response(JSON.stringify({ error: 'fetch_failed', message: err?.message ?? 'fetch failed' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
};


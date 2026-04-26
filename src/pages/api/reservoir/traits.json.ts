import type { APIRoute } from 'astro';
import { HOODRATS_ADDRESS } from '../../../lib/contract';

const BASE = 'https://api.reservoir.tools';

export const prerender = false;

export const GET: APIRoute = async () => {
  const url = `${BASE}/collections/${HOODRATS_ADDRESS}/attributes/all/v2`;
  const headers: Record<string, string> = { accept: 'application/json' };
  const key = (import.meta.env.RESERVOIR_API_KEY as string | undefined)?.trim();
  if (key) headers['x-api-key'] = key;

  try {
    const res = await fetch(url, { headers });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') ?? 'application/json',
        'cache-control': 's-maxage=600, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    const err = e as any;
    // If Reservoir DNS is down, return empty traits so the UI still works.
    // #region agent log
    fetch('http://127.0.0.1:7735/ingest/f179b99b-f463-435e-ad76-a5fc4552aef7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9acc9b'},body:JSON.stringify({sessionId:'9acc9b',runId:'pre-fix',hypothesisId:'H1',location:'traits.json.ts:28',message:'reservoir traits proxy fetch threw',data:{message:err?.message,causeCode:err?.cause?.code,causeHostname:err?.cause?.hostname},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    return new Response(JSON.stringify({ attributes: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
};


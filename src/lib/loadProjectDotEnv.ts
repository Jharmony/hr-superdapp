import fs from 'node:fs';
import path from 'node:path';

/**
 * Astro API routes do not always receive `.env` values on `process.env` / `import.meta.env`.
 * Read `.env` then `.env.local` from the project root (same merge order as Vite: local overrides).
 */
let cache: Record<string, string> | null = null;

function parseEnvText(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    let body = t.startsWith('export ') ? t.slice(7).trim() : t;
    const eq = body.indexOf('=');
    if (eq === -1) continue;
    const k = body.slice(0, eq).trim();
    if (!k) continue;
    let v = body.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

export function loadProjectDotEnv(): Record<string, string> {
  if (cache) return cache;
  const root = process.cwd();
  const merged: Record<string, string> = {};
  for (const fname of ['.env', '.env.local']) {
    const fp = path.join(root, fname);
    try {
      if (!fs.existsSync(fp)) continue;
      const text = fs.readFileSync(fp, 'utf8');
      Object.assign(merged, parseEnvText(text));
    } catch {
      // ignore missing/unreadable
    }
  }
  cache = merged;
  return cache;
}

/** For tests / rare reload scenarios */
export function resetProjectDotEnvCache(): void {
  cache = null;
}

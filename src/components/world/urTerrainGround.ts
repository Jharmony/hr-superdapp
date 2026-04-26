import * as THREE from 'three';

const _origin = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);
const _n = new THREE.Vector3();
const _ray = new THREE.Raycaster();

export type WalkableTerrainSampleOpts = {
  minY: number;
  maxY: number;
  /** Minimum world-space face normal Y to count as a walkable tread (skip walls / steep). */
  normalMinY: number;
  /** Rays start at max(minY + pad, referenceY + this) */
  originYOffset: number;
  originMinPad: number;
  /** First pass: only surfaces within this distance (m) — avoids snapping to subway through a sidewalk slit. */
  farShort?: number;
  /** Second pass when short pass has no hits (openings, stairs down). */
  farLong?: number;
};

function medianOfSortedCopy(values: number[]): number | null {
  if (values.length === 0) return null;
  const a = [...values].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  if (a.length % 2 === 1) return a[m]!;
  return (a[m - 1]! + a[m]!) * 0.5;
}

const XZ_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.24, 0],
  [-0.24, 0],
  [0, 0.24],
  [0, -0.24],
  [0.17, 0.17],
  [-0.17, 0.17],
];

/**
 * Per XZ offset, pick the **highest** walkable Y at or under `referenceY` (feet band), else the
 * lowest walkable above (step-up). Avoids locking to the first ray hit when multiple decks exist
 * (subway stairs, mezzanines) so descent follows the tread under the body.
 */
function collectWalkableYs(
  root: THREE.Object3D,
  px: number,
  pz: number,
  originY: number,
  far: number,
  opts: Pick<WalkableTerrainSampleOpts, 'minY' | 'maxY' | 'normalMinY'>,
  referenceY: number,
): number[] {
  const out: number[] = [];
  const footBand = 0.38;
  for (const [ox, oz] of XZ_OFFSETS) {
    _origin.set(px + ox, originY, pz + oz);
    _ray.set(_origin, _down);
    _ray.far = far;
    const hits = _ray.intersectObject(root, true);
    const candidates: number[] = [];
    for (const h of hits) {
      if (h.distance < 0.012) continue;
      const f = h.face;
      if (f) {
        _n.copy(f.normal).transformDirection(h.object.matrixWorld);
        if (_n.y < opts.normalMinY) continue;
      }
      const y = h.point.y;
      if (y < opts.minY || y > opts.maxY) continue;
      candidates.push(y);
    }
    if (candidates.length === 0) continue;
    const below = candidates.filter((y) => y <= referenceY + footBand);
    if (below.length > 0) {
      out.push(Math.max(...below));
    } else {
      out.push(Math.min(...candidates));
    }
  }
  return out;
}

/**
 * Downward samples on the Ur city GLB. Uses a **short** ray first (stay on the current deck /
 * sidewalk paint), then a **long** ray if the short pass finds nothing (subway openings, stairs).
 * Aggregates with the **median** of hits so one stray low ray does not bury the Hoodrat.
 */
export function sampleWalkableTerrainY(
  root: THREE.Object3D,
  px: number,
  pz: number,
  referenceY: number,
  opts: WalkableTerrainSampleOpts,
): number | null {
  const farShort = opts.farShort ?? 2.35;
  const farLong = opts.farLong ?? 14;
  const originY = Math.max(opts.minY + opts.originMinPad, referenceY + opts.originYOffset);

  const shortYs = collectWalkableYs(root, px, pz, originY, farShort, opts, referenceY);
  if (shortYs.length > 0) {
    return medianOfSortedCopy(shortYs);
  }

  const longYs = collectWalkableYs(root, px, pz, originY, farLong, opts, referenceY);
  if (longYs.length === 0) return null;
  return medianOfSortedCopy(longYs);
}

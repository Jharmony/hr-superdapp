import { Environment, Html, KeyboardControls, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { AppErrorBoundary } from '../AppErrorBoundary';
import { useActiveHoodratTraitAttributes } from '../../hooks/useActiveHoodratTraitAttributes';
import { useBackpackWorldVisuals } from '../../hooks/useBackpackWorldVisuals';
import type { TraitAttr } from '../../lib/traitVisual';
import { Web3Providers } from '../web3/Web3Providers';
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { HoodratPlayer } from './HoodratPlayer';
import { WorldTbaHud } from './WorldTbaHud';
import { circleIntersectsObstacle, type XZRect } from './collision';
import { GROUND_Y, keyMap, PLAYER_RADIUS } from './worldConstants';

const UR_WORLD_MODEL_URL =
  (import.meta.env.PUBLIC_UR_WORLD_MODEL_URL as string | undefined)?.trim() ||
  '/models/ur-2-version-2.glb';

/** World XZ span after fit (larger ⇒ buildings feel bigger vs the Hoodrat). Default 124. */
const UR_TARGET_SPAN = (() => {
  const raw = (import.meta.env.PUBLIC_UR_WORLD_TARGET_SPAN as string | undefined)?.trim();
  if (raw === undefined || raw === '') return 124;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 50 ? n : 124;
})();

/**
 * Uniform multiplier on the city GLB **after** `UR_TARGET_SPAN` shrink (applied before floor snap).
 * Larger values make props / streets read bigger vs the Hoodrat (default 1.5). Cyber ignores.
 */
const UR_WORLD_SCALE_BOOST = (() => {
  const raw = (import.meta.env.PUBLIC_UR_WORLD_SCALE_BOOST as string | undefined)?.trim();
  if (raw === undefined || raw === '') return 1.5;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0.85 && n <= 1.85 ? n : 1.5;
})();

/** Hoodrat mesh scale in the rift only (cyber district unchanged). Default 0.82 reads closer to human scale. */
const UR_HOODRAT_MODEL_SCALE = (() => {
  const raw = (import.meta.env.PUBLIC_UR_WORLD_HOODRAT_SCALE as string | undefined)?.trim();
  if (raw === undefined || raw === '') return 0.82;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0.35 && n < 1.6 ? n : 0.82;
})();

const UR_WORLD_Y_BIAS = Number(
  (import.meta.env.PUBLIC_UR_WORLD_Y_BIAS as string | undefined)?.trim() || '0',
);

/** Raises logical feet + ray target together (m). Fixes “half under asphalt” vs ray subsurface. */
const UR_SPAWN_GROUND_LIFT = (() => {
  const raw = (import.meta.env.PUBLIC_UR_WORLD_SPAWN_LIFT as string | undefined)?.trim();
  if (raw === undefined || raw === '') return 0.42;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0.42;
})();

function urFootTargetY(): number {
  return GROUND_Y + UR_WORLD_Y_BIAS + UR_SPAWN_GROUND_LIFT;
}

/**
 * Added to `urFootTargetY()` for the Hoodrat only (rift). Negative moves the rat down in world
 * space so soles meet visible asphalt when the city GLB and skinned mesh disagree. Cyber ignores.
 */
const UR_PLAYER_Y_OFFSET = (() => {
  const raw = (import.meta.env.PUBLIC_UR_RIFT_PLAYER_Y_OFFSET as string | undefined)?.trim();
  if (raw === undefined || raw === '') return -0.09;
  const n = Number(raw);
  return Number.isFinite(n) ? n : -0.09;
})();

function urRiftPlayerGroundY(): number {
  return urFootTargetY() + UR_PLAYER_Y_OFFSET;
}

/**
 * Optional fine nudge after ray snap (meters). Positive moves the GLB down. Default 0 — ray snap
 * should place the street on the rat floor; use this only if you need a tiny manual tweak.
 */
const UR_EXTRA_DROP = (() => {
  const raw = (import.meta.env.PUBLIC_UR_WORLD_EXTRA_DROP as string | undefined)?.trim();
  if (raw === undefined || raw === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
})();

/**
 * After ray snap, lower the GLB a bit more so the **visible** asphalt / sidewalk sits on the
 * rat’s logical floor (rays often lock to a subsurface or shell slightly above the paint).
 * Positive = move world down. Use with `urFootTargetY()` + `PUBLIC_UR_WORLD_SPAWN_LIFT`.
 */
const UR_STREET_SURFACE_DROP = (() => {
  const raw = (import.meta.env.PUBLIC_UR_WORLD_STREET_DROP as string | undefined)?.trim();
  if (raw === undefined || raw === '') return 0.58;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0.58;
})();

/**
 * Rift-only: after ray + street drop, lowers the **city GLB** a bit further so painted walk
 * mesh meets Hoodrat soles (external GLB vs skinned mesh mismatch). Positive = world moves down.
 * Does not affect HOOD-420PJ. Set `PUBLIC_UR_WORLD_FEET_CLEAR_DROP=0` to disable.
 */
const UR_FEET_CLEAR_WORLD_DROP = (() => {
  const raw = (import.meta.env.PUBLIC_UR_WORLD_FEET_CLEAR_DROP as string | undefined)?.trim();
  if (raw === undefined || raw === '') return 0.44;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0.44;
})();

/**
 * Max inward shrink per edge on each obstacle XZ hull (m). Opens real door gaps when the GLB
 * merged a facade into one fat AABB. Set `PUBLIC_UR_OBSTACLE_XZ_INSET_MAX=0` to disable.
 */
const UR_OBSTACLE_XZ_INSET_MAX = (() => {
  const raw = (import.meta.env.PUBLIC_UR_OBSTACLE_XZ_INSET_MAX as string | undefined)?.trim();
  if (raw === undefined || raw === '') return 0.22;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 0.6 ? n : 0.22;
})();

/** Rift-only foot snap for the skinned mesh (cyber flat floor uses `CYBER_FEET_SINK`). */
const UR_HOODRAT_FEET_SINK = (() => {
  const raw = (import.meta.env.PUBLIC_UR_WORLD_FEET_SINK as string | undefined)?.trim();
  if (raw === undefined || raw === '') return 3.22;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0.5 && n < 6 ? n : 3.22;
})();

type UrBounds = { worldXZLim: number; obstacles: XZRect[]; terrainRoot: THREE.Object3D };

const _tmpBox = new THREE.Box3();
const _tmpSize = new THREE.Vector3();
const _rayN = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();

/** XZ offsets (m) for downward rays around spawn — median stabilizes single-column misses. */
const UR_FLOOR_RAY_XZ: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [3.4, 0],
  [-3.4, 0],
  [0, 3.4],
  [0, -3.4],
  [2.4, 2.4],
  [-2.4, -2.4],
];

/**
 * After coarse bbox snap, align so an **up-facing** walk mesh under the spawn sits at `footY`.
 * Picks the highest hit at or just under the toe line per ray, then uses the **median** across rays.
 */
function alignUrRootWalkableToFootY(root: THREE.Object3D, footY: number): void {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible) return;
    const pos = o.geometry?.getAttribute('position');
    if (!pos || pos.count < 3) return;
    meshes.push(o);
  });
  if (!meshes.length) return;

  const raycaster = new THREE.Raycaster();
  raycaster.far = 560;
  const down = new THREE.Vector3(0, -1, 0);

  /** Highest up-facing hit per ray inside [yLo, yHi] — “top” of walk mesh near the feet line. */
  const collectBand = (yLo: number, yHi: number, minNormalY: number): number[] => {
    const out: number[] = [];
    for (const [x, z] of UR_FLOOR_RAY_XZ) {
      _rayOrigin.set(x, footY + 340, z);
      raycaster.set(_rayOrigin, down);
      const hits = raycaster.intersectObjects(meshes, false);
      let best = -Infinity;
      for (const h of hits) {
        if (!h.face) continue;
        _rayN.copy(h.face.normal).transformDirection(h.object.matrixWorld);
        if (_rayN.y < minNormalY) continue;
        if (h.point.y < yLo || h.point.y > yHi) continue;
        if (h.point.y > best) best = h.point.y;
      }
      if (best > -1e8) out.push(best);
    }
    return out;
  };

  for (let iter = 0; iter < 10; iter++) {
    root.updateMatrixWorld(true);
    let ys = collectBand(footY - 160, footY + 1.25, 0.28);
    if (ys.length < 3) ys = collectBand(footY - 140, footY + 8.5, 0.24);
    if (ys.length === 0) break;

    ys.sort((a, b) => a - b);
    const median = ys[Math.floor(ys.length / 2)]!;
    const err = footY - median;
    if (Math.abs(err) < 0.05) break;
    root.position.y += err;
    if (iter >= 1 && Math.abs(err) < 0.25) break;
  }
}

/**
 * Shrink an obstacle rect in XZ so merged mesh AABBs leave walkable gaps at door widths.
 */
function shrinkUrObstacleXZ(r: XZRect, insetCap: number): XZRect | null {
  if (insetCap <= 0) return r;
  const w = r.maxx - r.minx;
  const d = r.maxz - r.minz;
  if (w < 0.04 || d < 0.04) return null;
  const minSpan = Math.min(w, d);
  const t = Math.min(insetCap, Math.max(0.035, minSpan * 0.058));
  const ix = Math.min(t, w * 0.5 - 0.03);
  const iz = Math.min(t, d * 0.5 - 0.03);
  if (ix <= 0.005 || iz <= 0.005) return r;
  const minx = r.minx + ix;
  const maxx = r.maxx - ix;
  const minz = r.minz + iz;
  const maxz = r.maxz - iz;
  if (maxx <= minx + 0.06 || maxz <= minz + 0.06) return null;
  return { minx, maxx, minz, maxz };
}

/**
 * XZ collision from mesh world bounds (same sliding model as the cyber district). Skips broad
 * horizontal slabs so you can walk streets; keeps vertical mass as walls. Not full physics
 * (single ground plane at GROUND_Y; no multi-storey vertical stacking).
 *
 * Doorways: merged shells get XZ hulls shrunk so gaps fit the player circle; squat merged
 * volumes that seal whole storefronts are skipped. Shallow horizontal slabs / stair decks /
 * thin railing strips are skipped so xz hulls do not seal door openings or subway stairs —
 * walkable height still comes from terrain raycasts on the Hoodrat.
 */
function buildUrWorldObstacles(root: THREE.Object3D): XZRect[] {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const sz = new THREE.Vector3();
  const out: XZRect[] = [];

  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible) return;
    const pos = o.geometry?.getAttribute('position');
    if (!pos || pos.count < 6) return;

    box.setFromObject(o);
    box.getSize(sz);
    if (sz.y < 1.15) return;

    const foot = Math.max(sz.x, sz.z);

    if (sz.y < 3.2 && foot > 5.2) return;
    if (sz.y < 4.8 && foot > 13 && sz.y <= foot * 0.42) return;
    // Broad low chunks (merged pads) that still slip through the rules above
    if (sz.y < 5.2 && foot > 9 && Math.min(sz.x, sz.z) > 5.5) return;

    const minSpan = Math.min(sz.x, sz.z);
    const maxSpan = Math.max(sz.x, sz.z);
    const areaXZ = sz.x * sz.z;
    const aspectY = sz.y / Math.max(minSpan, 0.04);
    const spanRatio = maxSpan / Math.max(minSpan, 0.04);

    // Wide horizontal plates (sidewalk tiles, plaza slabs) — xz blocks door gaps; Y from terrain.
    if (areaXZ > 80 && aspectY < 0.26 && sz.y < 2.55 && minSpan > 1.85) return;
    // Merged low stair / ramp pads (subway mouth, wide shallow flight)
    if (areaXZ > 38 && aspectY < 0.52 && sz.y < 2.15 && minSpan > 1.65 && maxSpan > 2.6) return;
    // Long thin railing / fence strip (one AABB around many bars)
    if (spanRatio > 4.8 && minSpan < 0.68 && sz.y > 0.35 && sz.y < 4.8) return;
    // Thin vertical door / window jambs only (narrow xz + modest depth) — avoid skipping real walls.
    if (
      minSpan < 0.48 &&
      maxSpan > 0.85 &&
      maxSpan < 2.25 &&
      sz.y > 1.25 &&
      sz.y < 6.2 &&
      aspectY > 1.62
    ) {
      return;
    }

    const rect: XZRect = {
      minx: box.min.x,
      maxx: box.max.x,
      minz: box.min.z,
      maxz: box.max.z,
    };
    const area = (rect.maxx - rect.minx) * (rect.maxz - rect.minz);
    if (area > 260 && sz.y < 7.2 && circleIntersectsObstacle(0, 0, rect, PLAYER_RADIUS + 1.4)) {
      return;
    }

    // One big merged “block” AABB (short vs wide) — blocks interior doors; real walls stay thin/tall.
    if (area > 130 && minSpan > 3.9 && maxSpan > 6.2 && sz.y < maxSpan * 0.52) {
      return;
    }

    const hull = shrinkUrObstacleXZ(rect, UR_OBSTACLE_XZ_INSET_MAX);
    if (hull) out.push(hull);
  });

  return filterUrObstaclesForSpawn(out).slice(0, 420);
}

/** Drop XZ hulls that trap the player at (0,0): big overlaps with spawn = stuck “can’t walk”. */
function filterUrObstaclesForSpawn(rects: XZRect[]): XZRect[] {
  const spawnR = PLAYER_RADIUS + 2.85;
  return rects.filter((r) => {
    if (!circleIntersectsObstacle(0, 0, r, spawnR)) return true;
    const w = r.maxx - r.minx;
    const d = r.maxz - r.minz;
    const area = w * d;
    const minSide = Math.min(w, d);
    if (area > 40) return false;
    if (area > 16 && minSide > 6.2) return false;
    return true;
  });
}

/**
 * World Y used as “floor” for snapping: `root.y = target - bottom`. A **higher** `bottom` moves
 * the model **down** (you end up less “under” it). We skip the lowest outlier meshes, then take
 * `Math.max` of two moderate trims so we do not lock to the deepest basement mesh or a lone roof.
 */
function worldMinYForGroundSnap(root: THREE.Object3D): number {
  root.updateMatrixWorld(true);
  const meshMins: number[] = [];
  const slabMins: number[] = [];

  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible) return;
    const pos = o.geometry?.getAttribute('position');
    if (!pos || pos.count < 6) return;

    _tmpBox.setFromObject(o);
    const y0 = _tmpBox.min.y;
    meshMins.push(y0);
    _tmpBox.getSize(_tmpSize);
    const horiz = Math.max(_tmpSize.x, _tmpSize.z);
    const area = _tmpSize.x * _tmpSize.z;
    if (horiz >= 3 && _tmpSize.y <= 55 && area >= 8) {
      slabMins.push(y0);
    }
  });

  /** Sorted ascending; index at `frac * length` skips the lowest `frac` fraction of mesh bottoms. */
  const trimLow = (ys: number[], frac: number): number | null => {
    if (ys.length === 0) return null;
    ys.sort((a, b) => a - b);
    const i = Math.min(ys.length - 1, Math.max(0, Math.floor(ys.length * frac)));
    return ys[i]!;
  };

  const tAll = trimLow([...meshMins], 0.12);
  const tSlab = trimLow([...slabMins], 0.1);

  _tmpBox.setFromObject(root);
  const hierMin = _tmpBox.min.y;

  if (tAll == null) return hierMin;
  if (tSlab == null) return tAll;
  /** Higher Y reference → lower GLB → less stuck under the city. */
  return Math.max(tAll, tSlab);
}

function UrEnvironment({ onSized }: { onSized: (b: UrBounds) => void }) {
  const gltf = useGLTF(UR_WORLD_MODEL_URL);
  const root = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene]);
  const sizedRef = useRef(false);
  const onSizedRef = useRef(onSized);
  onSizedRef.current = onSized;

  useLayoutEffect(() => {
    const r = root;
    r.position.set(0, 0, 0);
    r.rotation.set(0, 0, 0);
    r.scale.setScalar(1);
    r.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(r);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.z, 1);
    let spanScale = 1;
    if (maxDim > UR_TARGET_SPAN) {
      spanScale = UR_TARGET_SPAN / maxDim;
    }
    r.scale.setScalar(spanScale * UR_WORLD_SCALE_BOOST);
    r.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(r);

    // Coarse snap, then ray-based alignment so street / sidewalk tops match Hoodrat feet.
    const targetFloorY = urFootTargetY();
    const bottom = worldMinYForGroundSnap(r);
    r.position.set(0, targetFloorY - bottom, 0);
    r.updateMatrixWorld(true);
    alignUrRootWalkableToFootY(r, targetFloorY);
    r.position.y -= UR_STREET_SURFACE_DROP;
    r.position.y -= UR_EXTRA_DROP;
    r.position.y -= UR_FEET_CLEAR_WORLD_DROP;

    r.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(r);
    const halfX = Math.max(Math.abs(box.max.x), Math.abs(box.min.x));
    const halfZ = Math.max(Math.abs(box.max.z), Math.abs(box.min.z));
    const rad = Math.max(halfX, halfZ);
    const worldXZLim = Math.min(145, Math.max(42, rad * 0.94 + 0.5));
    const obstacles = buildUrWorldObstacles(r);
    if (!sizedRef.current) {
      sizedRef.current = true;
      onSizedRef.current({ worldXZLim, obstacles, terrainRoot: r });
    }
  }, [root]);

  useEffect(() => {
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const raw of mats) {
          const m = raw as THREE.MeshStandardMaterial;
          if (!m) continue;
          if (m.transparent && typeof m.opacity === 'number' && m.opacity < 0.999) {
            m.depthWrite = true;
          }
        }
      }
    });
  }, [root]);

  return <primitive object={root} />;
}

function UrWorldScene({
  onLockChange,
  onViewModeChange,
  traitAttributes,
  companionTraitAttributes,
}: {
  onLockChange: (locked: boolean) => void;
  onViewModeChange?: (mode: 'tp' | 'fp') => void;
  traitAttributes?: TraitAttr[];
  companionTraitAttributes?: TraitAttr[];
}) {
  const [bounds, setBounds] = useState<UrBounds | null>(null);
  const onSized = useCallback((b: UrBounds) => {
    setBounds((prev) => prev ?? b);
  }, []);

  return (
    <>
      <color attach="background" args={['#0a0a12']} />
      <fog attach="fog" args={['#1a1a2e', 28, 220]} />

      <hemisphereLight args={['#c8d4ff', '#1a1020', 0.45]} />
      <ambientLight color="#8a90b0" intensity={0.22} />

      <directionalLight
        position={[120, 85, 60]}
        intensity={1.35}
        color="#ffe8d0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={420}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
      />
      <directionalLight position={[-60, 40, -80]} intensity={0.35} color="#6eb8ff" castShadow={false} />

      <Environment preset="night" />

      <Suspense fallback={null}>
        <UrEnvironment onSized={onSized} />
      </Suspense>

      <Suspense
        fallback={
          <Html center>
            <div className="rounded-xl border border-cyan-500/30 bg-zinc-950/90 px-4 py-3 text-xs text-cyan-100/90">
              Loading rift world…
            </div>
          </Html>
        }
      >
        {bounds ? (
          <HoodratPlayer
            // Do not key on stringified traits: companion metadata often resolves after the
            // rift GLB sets `bounds`; remounting the whole player on that update can leave the pet
            // missing. Cyber district omits this key — trait / companion scenes update inside
            // `HoodratPlayer` via `useMemo` instead.
            key={`${bounds.worldXZLim}-${bounds.obstacles.length}`}
            onLockChange={onLockChange}
            onViewModeChange={onViewModeChange}
            obstacleRects={bounds.obstacles}
            worldXZLim={bounds.worldXZLim}
            initialXZ={{ x: 0, z: 0 }}
            groundY={urRiftPlayerGroundY()}
            modelScale={UR_HOODRAT_MODEL_SCALE}
            feetSink={UR_HOODRAT_FEET_SINK}
            snapFeetToGround
            footSkinEpsilon={0.022}
            traitAttributes={traitAttributes}
            companionTraitAttributes={companionTraitAttributes}
            terrainGround={{
              root: bounds.terrainRoot,
              minY: urFootTargetY() - 24,
              maxY: urFootTargetY() + 34,
              soleBias: -0.02,
            }}
            portal={null}
          />
        ) : null}
      </Suspense>
    </>
  );
}

function UrWorldCanvas({
  onLockChange,
  onViewModeChange,
  traitAttributes,
  companionTraitAttributes,
}: {
  onLockChange: (locked: boolean) => void;
  onViewModeChange?: (mode: 'tp' | 'fp') => void;
  traitAttributes?: TraitAttr[];
  companionTraitAttributes?: TraitAttr[];
}) {
  const dpr = useMemo((): [number, number] => [1, Math.min(2, window.devicePixelRatio || 1)], []);

  return (
    <Canvas
      className="!h-full !w-full"
      shadows
      camera={{
        position: [0, 3.2, 9.5],
        fov: 68,
        near: 0.08,
        far: 420,
      }}
      dpr={dpr}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        logarithmicDepthBuffer: true,
      }}
    >
      <KeyboardControls map={keyMap}>
        <UrWorldScene
          onLockChange={onLockChange}
          onViewModeChange={onViewModeChange}
          traitAttributes={traitAttributes}
          companionTraitAttributes={companionTraitAttributes}
        />
      </KeyboardControls>
    </Canvas>
  );
}

function UrRiftWorldExperience() {
  const { traitAttributes, activeTokenId } = useActiveHoodratTraitAttributes();
  const { companionTraitAttributes } = useBackpackWorldVisuals(activeTokenId);
  const [locked, setLocked] = useState(false);
  const [viewMode, setViewMode] = useState<'tp' | 'fp'>('tp');

  return (
    <div className="fixed inset-0 z-[220] overflow-hidden bg-black">
      <a
        href="/world/"
        className="pointer-events-auto absolute left-3 top-3 z-[230] rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-4 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200 shadow-lg backdrop-blur-sm transition hover:border-cyan-500/40 hover:text-cyan-200 md:left-4 md:top-4"
      >
        ← Cyber district
      </a>
      <a
        href="/"
        className="pointer-events-auto absolute left-3 top-[3.25rem] z-[230] rounded-xl border border-zinc-700/80 bg-zinc-950/85 px-4 py-2 text-xs font-semibold text-zinc-300 shadow-lg backdrop-blur-sm transition hover:border-zinc-500 md:left-4 md:top-[3.75rem]"
      >
        Home
      </a>
      <div className="pointer-events-none absolute right-3 top-3 z-[230] rounded-lg border border-cyan-500/25 bg-zinc-950/75 px-3 py-1.5 text-right md:right-4 md:top-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">UR rift</p>
        <p className="text-[10px] text-zinc-500">
          {viewMode === 'fp' ? 'first-person' : 'third-person'}
        </p>
      </div>

      <WorldTbaHud activeTokenId={activeTokenId} />

      <div className="h-full w-full pt-14 md:pt-0">
        <AppErrorBoundary
          layout="immersive"
          title="UR rift world could not load"
          hint={
            <p className="mt-3 max-w-md text-xs leading-relaxed text-zinc-400">
              The rift map and/or Hoodrat GLB failed to load. Set{' '}
              <code className="text-lime-200/90">PUBLIC_UR_WORLD_MODEL_URL</code> and{' '}
              <code className="text-lime-200/90">PUBLIC_HOODRATS_MODEL_URL</code> to HTTPS URLs, or ship the
              files under <code className="text-zinc-200">public/models/</code>.
            </p>
          }
        >
          <UrWorldCanvas
            onLockChange={setLocked}
            onViewModeChange={setViewMode}
            traitAttributes={traitAttributes}
            companionTraitAttributes={companionTraitAttributes}
          />
        </AppErrorBoundary>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-[225] bg-gradient-to-t from-black/80 to-transparent px-4 pb-6 pt-16 text-center transition-opacity duration-300 ${
          locked ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <p className="text-xs font-semibold text-cyan-200/90">Click the world — explore the rift</p>
        <p className="mt-1 text-[11px] text-zinc-500">
          WASD move · Shift run · Space jump · V view mode · Esc unlocks
        </p>
      </div>
    </div>
  );
}

export function UrRiftWorldApp() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const fn = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  if (reduceMotion) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-zinc-950 px-6 text-center">
        <p className="max-w-md text-sm text-zinc-400">
          This rift world uses pointer-lock 3D motion. Turn off reduced motion in your system settings
          to enter, or{' '}
          <a className="text-lime-300 underline" href="/world/">
            return to the cyber district
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <Web3Providers>
      <UrRiftWorldExperience />
    </Web3Providers>
  );
}

import {
  Environment,
  Grid,
  Html,
  KeyboardControls,
  useGLTF,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AppErrorBoundary } from '../AppErrorBoundary';
import { useActiveHoodratTraitAttributes } from '../../hooks/useActiveHoodratTraitAttributes';
import { useBackpackWorldVisuals } from '../../hooks/useBackpackWorldVisuals';
import type { TraitAttr } from '../../lib/traitVisual';
import { Web3Providers } from '../web3/Web3Providers';
import type { XZRect } from './collision';
import { HoodratPlayer } from './HoodratPlayer';
import { WorldTbaHud } from './WorldTbaHud';
import { CAM_DIST, CAM_HEIGHT, GROUND_Y, keyMap, PLAYER_RADIUS } from './worldConstants';

const PORTAL_MODEL_URL =
  (import.meta.env.PUBLIC_PORTAL_MODEL_URL as string | undefined)?.trim() || '';

function portalFallbackUrls(): string[] {
  const out: string[] = [];
  const primary = PORTAL_MODEL_URL.trim();
  if (primary) out.push(primary);
  if (primary.includes('arweave.net/')) out.push(primary.replace('arweave.net/', 'turbo-gateway.com/'));
  out.push('/models/portal.glb');
  return [...new Set(out)];
}

async function loadFirstPortalGltf(urls: string[]): Promise<{ url: string; scene: THREE.Object3D }> {
  const loader = new GLTFLoader();
  let lastErr: unknown = null;
  for (const url of urls) {
    try {
      const gltf = await loader.loadAsync(url);
      return { url, scene: (gltf as any).scene as THREE.Object3D };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('portal_glb_failed');
}

const WORLD_XZ_LIM = 46;

/** Corridor center, deeper toward the short pink pillar row (~z -42). */
const PORTAL_X = 0;
const PORTAL_Z = -36;
/** Extra downward after bbox snap so the gate sits flush on the floor like the rat. */
const PORTAL_GROUND_BIAS = 0.48;
/** Visual scale — slightly larger than the Hoodrat (~1.12). */
const PORTAL_VISUAL_SCALE = 2.4;
/**
 * Solid collider only (narrower than the mesh) so you can walk into the arch;
 * otherwise you never get close enough for a tight trigger ring to fire.
 */
const PORTAL_COLLIDER_HALF = 1.48;
/** Fires when you actually reach the gate: collider edge + player radius + small margin. */
const PORTAL_TRIGGER_RADIUS = PORTAL_COLLIDER_HALF + PLAYER_RADIUS + 0.28;
const PORTAL_TELEPORT_HREF =
  (import.meta.env.PUBLIC_PORTAL_DESTINATION as string | undefined)?.trim() ||
  '/world/next/';

type CyberBlock = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
};

function buildCyberBlocks(): CyberBlock[] {
  const out: CyberBlock[] = [];
  const colors = ['#c026d3', '#06b6d4', '#a3e635', '#e11d48', '#6366f1'];
  for (let i = 0; i < 36; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -42 + (i >> 1) * 2.4;
    const x = side * (7 + (i % 5) * 1.8 + ((i * 13) % 7) * 0.35);
    const h = 4 + ((i * 17) % 11) + ((i * 3) % 4);
    const w = 1.8 + ((i * 5) % 3) * 0.4;
    const d = 1.8 + ((i * 11) % 3) * 0.4;
    out.push({ x, z, w, d, h, color: colors[i % colors.length]! });
  }
  return out;
}

const CYBER_BLOCKS = buildCyberBlocks();

const CYBER_BUILDING_OBSTACLE_XZ: XZRect[] = CYBER_BLOCKS.map((b) => ({
  minx: b.x - b.w / 2,
  maxx: b.x + b.w / 2,
  minz: b.z - b.d / 2,
  maxz: b.z + b.d / 2,
}));

const PORTAL_COLLIDER_XZ: XZRect = {
  minx: PORTAL_X - PORTAL_COLLIDER_HALF,
  maxx: PORTAL_X + PORTAL_COLLIDER_HALF,
  minz: PORTAL_Z - PORTAL_COLLIDER_HALF,
  maxz: PORTAL_Z + PORTAL_COLLIDER_HALF,
};

const CYBER_OBSTACLE_XZ: XZRect[] = [
  ...CYBER_BUILDING_OBSTACLE_XZ,
  PORTAL_COLLIDER_XZ,
];

function PortalNeonGate() {
  return (
    <group position={[PORTAL_X, GROUND_Y + 0.02, PORTAL_Z]}>
      <pointLight position={[0, 2.8, 0]} intensity={10} distance={26} decay={1.9} color="#f0abfc" />
      <mesh position={[0, 0.12, 0]} castShadow={false} receiveShadow={false}>
        <sphereGeometry args={[0.18, 18, 18]} />
        <meshStandardMaterial emissive="#a3e635" emissiveIntensity={1.2} color="#0a0a0a" />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.1, 3.0, 0.45]} />
        <meshStandardMaterial
          color="#07070a"
          emissive="#d946ef"
          emissiveIntensity={0.85}
          metalness={0.25}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 1.35, 0.03]} castShadow={false} receiveShadow={false}>
        <boxGeometry args={[2.25, 2.25, 0.1]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#22d3ee"
          emissiveIntensity={0.55}
          transparent
          opacity={0.22}
        />
      </mesh>
      <Html center position={[0, 2.85, 0]} transform>
        <div className="pointer-events-none rounded-lg border border-fuchsia-500/35 bg-zinc-950/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-fuchsia-200/90 backdrop-blur-sm">
          Rift portal
        </div>
      </Html>
    </group>
  );
}

class PortalErrorBoundary extends Component<
  { children: React.ReactNode; fallback: (err: Error) => React.ReactNode },
  { err: Error | null }
> {
  state: { err: Error | null } = { err: null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  componentDidCatch(err: Error) {
    // Surface loader failures in dev tools.
    // eslint-disable-next-line no-console
    console.error('[portal-glb] failed to load', PORTAL_MODEL_URL, err);
  }
  render() {
    if (this.state.err) return this.props.fallback(this.state.err);
    return this.props.children;
  }
}

function PortalGlb() {
  const [rawScene, setRawScene] = useState<THREE.Object3D | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<Error | null>(null);
  const urlsKey = useMemo(() => portalFallbackUrls().join('|'), []);

  useEffect(() => {
    let cancelled = false;
    setRawScene(null);
    setResolvedUrl(null);
    setLoadErr(null);
    void (async () => {
      try {
        const urls = portalFallbackUrls();
        const r = await loadFirstPortalGltf(urls);
        if (cancelled) return;
        setResolvedUrl(r.url);
        setRawScene(r.scene);
      } catch (e) {
        if (cancelled) return;
        setLoadErr(e instanceof Error ? e : new Error('portal_glb_failed'));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlsKey]);

  if (loadErr) throw loadErr;
  if (!rawScene) return null;

  const portalRoot = useMemo(() => SkeletonUtils.clone(rawScene), [rawScene]);
  const axes = useMemo(() => new THREE.AxesHelper(2), []);

  useLayoutEffect(() => {
    const root = portalRoot;
    root.position.set(0, 0, 0);
    root.scale.setScalar(PORTAL_VISUAL_SCALE);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    root.position.y = -box.min.y - PORTAL_GROUND_BIAS;
  }, [portalRoot]);

  useEffect(() => {
    portalRoot.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const raw of mats) {
          const m = raw as THREE.MeshStandardMaterial;
          if (m?.isMeshStandardMaterial) {
            m.emissiveIntensity = Math.max(m.emissiveIntensity ?? 0, 0.45);
          }
        }
      }
    });
  }, [portalRoot]);

  return (
    <group position={[PORTAL_X, GROUND_Y, PORTAL_Z]}>
      <ambientLight intensity={0.35} />
      <primitive object={portalRoot} />
      <primitive object={axes} />
      {resolvedUrl ? (
        <Html center position={[0, 3.35, 0]} transform>
          <div className="pointer-events-none rounded-lg border border-zinc-700/50 bg-zinc-950/60 px-2 py-1 text-[9px] font-semibold text-zinc-300 backdrop-blur-sm">
            portal: <span className="font-mono">{resolvedUrl.includes('/models/') ? 'local' : 'remote'}</span>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function CyberRiftPortal() {
  const fallback = (err: Error) => (
    <>
      <PortalNeonGate />
      <Html center position={[PORTAL_X, GROUND_Y + 2.1, PORTAL_Z]} transform>
        <div className="pointer-events-none w-[min(22rem,92vw)] rounded-lg border border-amber-500/30 bg-zinc-950/75 px-3 py-2 text-[10px] font-semibold text-amber-200/90 backdrop-blur-sm">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/90">
            Portal GLB failed to load
          </div>
          <div className="mt-1 break-all text-amber-100/90">
            URL: <span className="font-mono">{PORTAL_MODEL_URL}</span>
          </div>
          <div className="mt-1 break-words text-amber-200/80">
            {err.message ? `Error: ${err.message}` : 'Error: unknown'}
          </div>
          <div className="mt-2 text-amber-200/70">
            If you just edited <span className="font-mono">.env</span>, restart <span className="font-mono">astro dev</span> so
            <span className="font-mono"> PUBLIC_PORTAL_MODEL_URL</span> is picked up.
          </div>
        </div>
      </Html>
    </>
  );

  return (
    <>
      {/* Always visible “gate” so the portal never disappears */}
      <PortalNeonGate />
      {/* GLB layered on top once loaded */}
      <PortalErrorBoundary fallback={fallback}>
        <Suspense fallback={null}>
          <PortalGlb />
        </Suspense>
      </PortalErrorBoundary>
    </>
  );
}

function CyberBuildings() {
  return (
    <group>
      {CYBER_BLOCKS.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, b.h / 2 - 1.05, b.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            color="#0c0c12"
            emissive={b.color}
            emissiveIntensity={0.55}
            metalness={0.35}
            roughness={0.42}
          />
        </mesh>
      ))}
    </group>
  );
}

function NeonFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial
        color="#050508"
        metalness={0.2}
        roughness={0.85}
        emissive="#0d3b2a"
        emissiveIntensity={0.08}
      />
    </mesh>
  );
}

function WorldScene({
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
  return (
    <>
      <color attach="background" args={['#120706']} />
      <fog attach="fog" args={['#3a1814', 16, 78]} />

      {/* Dusty sky / rust ground bounce — Mars / thin-air read */}
      <hemisphereLight args={['#c98c78', '#4a2218', 0.52]} />
      <ambientLight color="#b89588" intensity={0.26} />

      {/* Main “sun”: small, harsh, far — primary visibility on geometry */}
      <directionalLight
        position={[48, 26, 36]}
        intensity={1.65}
        color="#ffd4b0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={95}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
      />
      {/* Cool rim so forms don’t go flat in IR-ish dust */}
      <directionalLight position={[-28, 14, -22]} intensity={0.22} color="#7eb8d4" castShadow={false} />

      <pointLight position={[-14, 6, -8]} intensity={1.55} color="#22d3ee" distance={60} />
      <pointLight position={[16, 4, 10]} intensity={1.65} color="#e879f9" distance={60} />
      <pointLight position={[0, 8, -2]} intensity={0.85} color="#a3e635" distance={48} />

      <Environment preset="night" />

      <NeonFloor />
      <Grid
        args={[120, 120]}
        position={[0, -1.04, 0]}
        cellSize={0.65}
        sectionSize={3.9}
        fadeDistance={48}
        fadeStrength={1}
        infiniteGrid
        cellColor="#22d3ee"
        sectionColor="#d946ef"
        cellThickness={0.85}
        sectionThickness={1.35}
      />

      <CyberBuildings />

      <CyberRiftPortal />

      <Suspense
        fallback={
          <Html center>
            <div className="rounded-xl border border-fuchsia-500/30 bg-zinc-950/90 px-4 py-3 text-xs text-fuchsia-100/90">
              Loading rat…
            </div>
          </Html>
        }
      >
        <HoodratPlayer
          onLockChange={onLockChange}
          onViewModeChange={onViewModeChange}
          obstacleRects={CYBER_OBSTACLE_XZ}
          worldXZLim={WORLD_XZ_LIM}
          initialCamYaw={0}
          feetSink={0}
          snapFeetToGround
          traitAttributes={traitAttributes}
          companionTraitAttributes={companionTraitAttributes}
          portal={{
            x: PORTAL_X,
            z: PORTAL_Z,
            triggerRadius: PORTAL_TRIGGER_RADIUS,
            href: PORTAL_TELEPORT_HREF,
          }}
        />
      </Suspense>
    </>
  );
}

/** Matches `HoodratPlayer` third-person defaults: camYaw 0, orbitPitch 0.3, player at origin on GROUND_Y. */
const CYBER_INIT_ORBIT_PITCH = 0.3;
const cyberInitialCameraPosition: [number, number, number] = [
  0,
  GROUND_Y +
    Math.sin(CYBER_INIT_ORBIT_PITCH) * CAM_DIST +
    CAM_HEIGHT,
  Math.cos(CYBER_INIT_ORBIT_PITCH) * CAM_DIST,
];

function WorldCanvas({
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
        position: cyberInitialCameraPosition,
        fov: 68,
        near: 0.05,
        far: 120,
      }}
      dpr={dpr}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        logarithmicDepthBuffer: true,
      }}
    >
      <KeyboardControls map={keyMap}>
        <WorldScene
          onLockChange={onLockChange}
          onViewModeChange={onViewModeChange}
          traitAttributes={traitAttributes}
          companionTraitAttributes={companionTraitAttributes}
        />
      </KeyboardControls>
    </Canvas>
  );
}

function CyberWorldExperience() {
  const { traitAttributes, activeTokenId } = useActiveHoodratTraitAttributes();
  const { companionTraitAttributes } = useBackpackWorldVisuals(activeTokenId);
  const [locked, setLocked] = useState(false);
  const [viewMode, setViewMode] = useState<'tp' | 'fp'>('tp');

  return (
    <div className="fixed inset-0 z-[220] overflow-hidden bg-black">
      <a
        href="/"
        className="pointer-events-auto absolute left-3 top-3 z-[230] rounded-xl border border-zinc-700/90 bg-zinc-950/90 px-4 py-2 text-xs font-bold uppercase tracking-wide text-zinc-200 shadow-lg backdrop-blur-sm transition hover:border-lime-500/40 hover:text-lime-200 md:left-4 md:top-4"
      >
        ← Exit
      </a>
      <div className="pointer-events-none absolute right-3 top-3 z-[230] rounded-lg border border-fuchsia-500/25 bg-zinc-950/75 px-3 py-1.5 text-right md:right-4 md:top-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-200/90">
          HOOD-420PJ
        </p>
        <p className="text-[10px] text-zinc-500">
          {viewMode === 'fp' ? 'first-person' : 'third-person'}
        </p>
      </div>

      <WorldTbaHud activeTokenId={activeTokenId} />

      <div className="h-full w-full pt-14 md:pt-0">
        <AppErrorBoundary
          layout="immersive"
          title="Cyber district 3D could not load"
          hint={
            <p className="mt-3 max-w-md text-xs leading-relaxed text-zinc-400">
              The Hoodrat and/or portal GLB failed to load. Set{' '}
              <code className="text-lime-200/90">PUBLIC_HOODRATS_MODEL_URL</code> and{' '}
              <code className="text-lime-200/90">PUBLIC_PORTAL_MODEL_URL</code> to HTTPS URLs (for example
              Arweave), or include the files under <code className="text-zinc-200">public/models/</code>.
            </p>
          }
        >
          <WorldCanvas
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
        <p className="text-xs font-semibold text-cyan-200/90">
          Click the world — you are the Hoodrat
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">
          WASD move · Shift run · Space jump · walk to the rift ahead to travel · V view mode · Esc unlocks
        </p>
      </div>
    </div>
  );
}

export function CyberWorldApp() {
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
          The cyber district uses pointer-lock 3D motion. Turn off reduced motion in
          your system settings to enter, or{' '}
          <a className="text-lime-300 underline" href="/">
            return home
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <Web3Providers>
      <CyberWorldExperience />
    </Web3Providers>
  );
}

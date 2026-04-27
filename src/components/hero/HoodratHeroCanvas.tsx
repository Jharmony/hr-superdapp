import {
  Environment,
  Html,
  OrbitControls,
  useAnimations,
  useGLTF,
} from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { useActiveHoodratTraitAttributes } from '../../hooks/useActiveHoodratTraitAttributes';
import {
  applyTraitAttributesToScene,
  disposeColoredHoodratScene,
} from '../../lib/hoodratTraitApplyThree';
import type { TraitAttr } from '../../lib/traitVisual';

const MODEL_URL =
  (import.meta.env.PUBLIC_HOODRATS_MODEL_URL as string | undefined)?.trim() ||
  '/models/hoodrats.glb';

/** Logical controls — mapped to whatever clip names exist on the GLB. */
export type HoodratHeroIntent = 'idle' | 'walk' | 'run' | 'jump';

export type ResolvedClips = {
  idle: string | undefined;
  walk: string | undefined;
  run: string | undefined;
  jump: string | undefined;
};

function resolveClips(animations: THREE.AnimationClip[]): ResolvedClips {
  const match = (re: RegExp) => animations.find((c) => re.test(c.name))?.name;
  return {
    idle:
      match(/\b(idle|stand|breath|tpose)\b/i) ??
      animations[0]?.name,
    walk: match(/\bwalk(ing)?\b/i),
    run: match(/\brun(ning)?\b/i),
    jump: match(/\bjump(ing)?\b/i),
  };
}

type HoodratSceneProps = {
  intent: HoodratHeroIntent;
  setIntent: (v: HoodratHeroIntent) => void;
  onClips: (c: ResolvedClips) => void;
  traitAttributes?: TraitAttr[];
};

function HoodratScene({ intent, setIntent, onClips, traitAttributes }: HoodratSceneProps) {
  const gltf = useGLTF(MODEL_URL);

  const sceneForAnim = useMemo(() => {
    if (traitAttributes === undefined) return gltf.scene;
    const c = SkeletonUtils.clone(gltf.scene);
    applyTraitAttributesToScene(c, traitAttributes);
    return c;
  }, [gltf.scene, traitAttributes]);

  useEffect(() => {
    return () => {
      if (sceneForAnim !== gltf.scene) {
        disposeColoredHoodratScene(sceneForAnim);
      }
    };
  }, [sceneForAnim, gltf.scene]);

  const { actions, mixer } = useAnimations(gltf.animations, sceneForAnim);

  const clips = useMemo(() => resolveClips(gltf.animations), [gltf.animations]);

  useEffect(() => {
    onClips(clips);
  }, [clips, onClips]);

  const patrolRef = useRef<THREE.Group>(null);
  const patrolAngle = useRef(0);
  const prevActionRef = useRef<THREE.AnimationAction | null>(null);
  const prevLocoRef = useRef<Exclude<HoodratHeroIntent, 'jump'>>('idle');

  useEffect(() => {
    sceneForAnim.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const raw of mats) {
          const m = raw as THREE.MeshStandardMaterial;
          if (!m) continue;
          if (m.transparent && typeof m.opacity === 'number') {
            if (m.opacity < 0.999) {
              m.depthWrite = true;
            } else {
              m.transparent = false;
              m.depthWrite = true;
            }
          }
          if (typeof m.alphaTest === 'number' && m.alphaTest > 0) {
            m.depthWrite = true;
          }
        }
      }
    });
  }, [sceneForAnim]);

  useEffect(() => {
    if (intent !== 'jump') {
      prevLocoRef.current = intent;
    }
  }, [intent]);

  const fadeTo = (next: THREE.AnimationAction | null | undefined) => {
    if (!next) return;
    prevActionRef.current?.fadeOut(0.22);
    next.reset().fadeIn(0.22).play();
    prevActionRef.current = next;
  };

  useEffect(() => {
    if (!actions || !mixer || intent === 'jump') return;

    const name =
      intent === 'idle'
        ? clips.idle
        : intent === 'walk'
          ? clips.walk
          : intent === 'run'
            ? clips.run
            : undefined;

    if (!name || !actions[name]) {
      const fallback = clips.idle && actions[clips.idle] ? clips.idle : undefined;
      if (fallback && actions[fallback]) fadeTo(actions[fallback]);
      return;
    }

    fadeTo(actions[name] ?? null);
  }, [intent, actions, mixer, clips.idle, clips.walk, clips.run]);

  useEffect(() => {
    if (intent !== 'jump' || !actions || !mixer) return;

    const j = clips.jump ? actions[clips.jump] : undefined;
    if (!j) {
      setIntent(prevLocoRef.current);
      return;
    }

    prevActionRef.current?.fadeOut(0.12);
    j.reset();
    j.setLoop(THREE.LoopOnce, 1);
    j.clampWhenFinished = true;
    j.fadeIn(0.1).play();
    prevActionRef.current = j;

    const onFinished = (e: { action?: THREE.AnimationAction }) => {
      if (e.action !== j) return;
      mixer.removeEventListener('finished', onFinished);
      setIntent(prevLocoRef.current);
    };
    mixer.addEventListener('finished', onFinished);
    return () => {
      mixer.removeEventListener('finished', onFinished);
    };
  }, [intent, actions, mixer, clips.jump, setIntent]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;

      if (e.code === 'KeyW') {
        e.preventDefault();
        if (e.shiftKey && clips.run) setIntent('run');
        else if (clips.walk) setIntent('walk');
        else if (clips.run) setIntent('run');
      } else if (e.code === 'KeyI' && clips.idle) {
        e.preventDefault();
        setIntent('idle');
      } else if (e.code === 'Space' && clips.jump) {
        e.preventDefault();
        setIntent('jump');
      } else if (e.code === 'KeyR' && clips.run) {
        e.preventDefault();
        setIntent('run');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clips, setIntent]);

  useFrame((_, delta) => {
    const g = patrolRef.current;
    if (!g) return;

    if (intent === 'walk' || intent === 'run') {
      const spd = intent === 'run' ? 1.18 : 0.74;
      patrolAngle.current += delta * spd;
      const r = 0.38;
      g.position.x = Math.cos(patrolAngle.current) * r;
      g.position.z = Math.sin(patrolAngle.current) * r;
      g.rotation.y = -patrolAngle.current + Math.PI / 2;
    } else if (intent === 'idle') {
      g.position.x = THREE.MathUtils.lerp(g.position.x, 0, Math.min(1, delta * 3.2));
      g.position.z = THREE.MathUtils.lerp(g.position.z, 0, Math.min(1, delta * 3.2));
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, 0, Math.min(1, delta * 3.2));
    }
  });

  return (
    <>
      <group position={[0, -1.05, 0]} scale={1.12}>
        <group ref={patrolRef}>
          <primitive object={sceneForAnim} />
        </group>
      </group>
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={5.55}
        maxDistance={10.5}
        minPolarAngle={Math.PI * 0.26}
        maxPolarAngle={Math.PI * 0.5}
        target={[0, 0.45, 0]}
      />
    </>
  );
}

function AnimToolbar({
  clips,
  intent,
  setIntent,
}: {
  clips: ResolvedClips;
  intent: HoodratHeroIntent;
  setIntent: (v: HoodratHeroIntent) => void;
}) {
  const btn = (key: HoodratHeroIntent, label: string, clip?: string) =>
    clip ? (
      <button
        type="button"
        key={key}
        onClick={() => setIntent(key)}
        className={`rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
          intent === key
            ? 'bg-lime-400 text-zinc-950 shadow-[0_0_16px_rgba(163,230,53,0.35)]'
            : 'border border-zinc-600 bg-zinc-900/90 text-zinc-200 hover:border-lime-500/50'
        }`}
      >
        {label}
      </button>
    ) : null;

  return (
    <div className="pointer-events-auto flex max-w-[min(100%,22rem)] flex-wrap justify-center gap-2">
      {btn('idle', 'Idle', clips.idle)}
      {btn('walk', 'Walk', clips.walk)}
      {btn('run', 'Run', clips.run)}
      {btn('jump', 'Jump', clips.jump)}
    </div>
  );
}

export function HoodratHeroCanvas() {
  const { traitAttributes } = useActiveHoodratTraitAttributes();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [intent, setIntent] = useState<HoodratHeroIntent>('walk');
  const [clips, setClips] = useState<ResolvedClips | null>(null);

  const sceneKey =
    traitAttributes === undefined ? 'hero-default' : `hero-${JSON.stringify(traitAttributes)}`;

  const clipsInitRef = useRef(false);
  const onClips = useCallback((c: ResolvedClips) => {
    setClips(c);
    if (!clipsInitRef.current) {
      clipsInitRef.current = true;
      if (c.walk) setIntent('walk');
      else if (c.idle) setIntent('idle');
    }
  }, [setIntent]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const dpr = useMemo(() => [1, Math.min(2, window.devicePixelRatio || 1)] as const, []);

  if (reduceMotion) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 px-6 text-center">
        <p className="text-sm text-zinc-400">
          3D preview respects reduced motion. You can still explore the rest of the
          dapp below.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[min(52vh,440px)] w-full touch-none md:h-[min(58vh,500px)]">
      <Canvas
        className="!h-full !w-full rounded-2xl"
        shadows
        camera={{
          position: [0, 1.72, 6.82],
          fov: 38,
          near: 0.015,
          far: 200,
        }}
        dpr={dpr}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          logarithmicDepthBuffer: true,
        }}
      >
        <Suspense
          fallback={
            <Html center>
              <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/90 px-5 py-4 text-center shadow-lg backdrop-blur-sm">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-lime-400/25 border-t-lime-400" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Loading 3D…
                </span>
              </div>
            </Html>
          }
        >
          <color attach="background" args={['#09090b']} />
          <ambientLight intensity={0.38} />
          <directionalLight
            position={[4.5, 7, 3.5]}
            intensity={1.15}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0002}
          />
          <directionalLight
            position={[-3.2, 2.4, -2]}
            intensity={0.32}
            color="#c8f7a0"
          />
          <Environment preset="city" />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]} receiveShadow>
            <planeGeometry args={[12, 12]} />
            <shadowMaterial opacity={0.35} />
          </mesh>
          <HoodratScene
            key={sceneKey}
            intent={intent}
            setIntent={setIntent}
            onClips={onClips}
            traitAttributes={traitAttributes}
          />
        </Suspense>
      </Canvas>

      {clips ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center px-2">
          <AnimToolbar clips={clips} intent={intent} setIntent={setIntent} />
        </div>
      ) : null}
      {traitAttributes !== undefined ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-[4.75rem] z-10 text-center text-[10px] font-medium text-lime-300/85 md:bottom-[5rem]">
          Your active Hoodrat · tribe tint from metadata
        </p>
      ) : null}
    </div>
  );
}

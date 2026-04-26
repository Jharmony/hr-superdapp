import {
  Html,
  OrbitControls,
  useAnimations,
  useGLTF,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { AppErrorBoundary } from '../AppErrorBoundary';
import type { AnimationClip } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  applyTraitAttributesToScene,
  disposeColoredHoodratScene,
} from '../../lib/hoodratTraitApplyThree';
import type { TraitAttr } from '../../lib/traitVisual';

const MODEL_URL =
  (import.meta.env.PUBLIC_HOODRATS_MODEL_URL as string | undefined)?.trim() ||
  '/models/hoodrats.glb';

function resolveClips(animations: AnimationClip[]) {
  const match = (re: RegExp) => animations.find((c) => re.test(c.name))?.name;
  return {
    idle:
      match(/\b(idle|stand|breath|tpose)\b/i) ??
      animations[0]?.name,
  };
}

type TraitSceneProps = { attributes: TraitAttr[] | undefined };

/** Orbit pivot / bust line in world space — lights aim here so the face stays lit while orbiting. */
const PREVIEW_LIGHT_TARGET: [number, number, number] = [0, 0.62, 0];

/**
 * Key ~35° off the camera axis (+X, +Z): classic 3/4 portrait — shape on the face without
 * the flat “deer in headlights” frontal stack. Still stays in front of the subject (−Z backlights).
 */
function PortraitSpotKey() {
  const spot = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
  useLayoutEffect(() => {
    const s = spot.current;
    const t = target.current;
    if (!s || !t) return;
    s.target = t;
  }, []);
  return (
    <>
      <object3D ref={target} position={PREVIEW_LIGHT_TARGET} />
      <spotLight
        ref={spot}
        position={[1.65, 2.28, 5.92]}
        angle={0.58}
        penumbra={0.94}
        intensity={820}
        distance={24}
        decay={1.38}
        color="#f4f1ec"
      />
    </>
  );
}

/** Low parallel fill, same side as spot but higher — backs the cone without a second hot spec. */
function FrontDirectionalFill() {
  const ref = useRef<THREE.DirectionalLight>(null);
  useLayoutEffect(() => {
    const L = ref.current;
    if (!L) return;
    L.target.position.set(PREVIEW_LIGHT_TARGET[0], PREVIEW_LIGHT_TARGET[1], PREVIEW_LIGHT_TARGET[2]);
    L.target.updateMatrixWorld();
  }, []);
  return (
    <directionalLight
      ref={ref}
      position={[1.35, 3.15, 6.95]}
      intensity={0.92}
      color="#ebe8e3"
    />
  );
}

function TraitHoodratScene({ attributes }: TraitSceneProps) {
  const gltf = useGLTF(MODEL_URL);
  const attrKey = useMemo(() => JSON.stringify(attributes ?? []), [attributes]);

  const cloneRoot = useMemo(() => {
    const attrs = JSON.parse(attrKey) as TraitAttr[];
    const c = cloneSkinned(gltf.scene);
    applyTraitAttributesToScene(c, attrs);
    return c;
  }, [gltf.scene, attrKey]);

  useEffect(() => {
    return () => disposeColoredHoodratScene(cloneRoot);
  }, [cloneRoot]);

  const clips = useMemo(() => resolveClips(gltf.animations), [gltf.animations]);
  const { actions } = useAnimations(gltf.animations, cloneRoot);

  useEffect(() => {
    if (!actions) return;
    const idleName = clips.idle;
    if (!idleName || !actions[idleName]) return;
    const idle = actions[idleName];
    idle.reset().fadeIn(0.35).play();
    return () => {
      idle.fadeOut(0.25);
    };
  }, [actions, clips.idle]);

  return (
    <>
      {/*
        GLB forward is −Z; default camera sits at +Z toward origin — without this yaw the
        mesh presents its back to the lens (rim lit, face in shadow).
      */}
      <group position={[0, -1.05, 0]} scale={1.12} rotation={[0, Math.PI, 0]}>
        <primitive object={cloneRoot} dispose={null} />
      </group>
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={5.55}
        maxDistance={10.5}
        minPolarAngle={Math.PI * 0.26}
        maxPolarAngle={Math.PI * 0.5}
        target={PREVIEW_LIGHT_TARGET}
      />
    </>
  );
}

export function TraitHoodratPreview({
  attributes,
  /** Use inside a fixed-aspect parent (e.g. NFT page 9:16); omits default min-height. */
  compact,
}: {
  attributes?: TraitAttr[];
  compact?: boolean;
}) {
  const dpr = useMemo(() => [1, Math.min(2, window.devicePixelRatio || 1)] as const, []);

  const wrapClass = compact
    ? 'relative h-full w-full min-h-0 touch-none'
    : 'relative h-full min-h-[280px] w-full touch-none';

  return (
    <div className={wrapClass}>
      <AppErrorBoundary
        layout="inline"
        title="Trait 3D preview unavailable"
        hint={
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Set <code className="text-lime-200/80">PUBLIC_HOODRATS_MODEL_URL</code> or add{' '}
            <code className="text-zinc-300">hoodrats.glb</code> under <code className="text-zinc-300">public/models/</code>.
          </p>
        }
      >
        <Canvas
          className="!h-full !w-full"
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
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.86,
          }}
        >
          <Suspense
            fallback={
              <Html center>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/90 px-4 py-3 text-xs text-zinc-400">
                  Loading 3D…
                </div>
              </Html>
            }
          >
            <color attach="background" args={['#0c0c10']} />
            <hemisphereLight args={['#eceef5', '#383840', 0.3]} />
            <ambientLight intensity={0.36} color="#e2e4ea" />
            <PortraitSpotKey />
            <FrontDirectionalFill />
            {/* Shadow caster aligned with the keyed side so shadow shape matches the angle */}
            <directionalLight
              position={[1.15, 4.75, 6.05]}
              intensity={0.68}
              castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-bias={-0.0002}
            />
            {/* Weak opposite fill — opens shadow-side eye sockets without flattening */}
            <pointLight position={[-1.35, 2.05, 5.45]} intensity={0.75} distance={13} decay={2} color="#e8ecf4" />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]} receiveShadow>
              <planeGeometry args={[12, 12]} />
              <shadowMaterial opacity={0.28} />
            </mesh>
            <TraitHoodratScene attributes={attributes} />
          </Suspense>
        </Canvas>
      </AppErrorBoundary>
    </div>
  );
}

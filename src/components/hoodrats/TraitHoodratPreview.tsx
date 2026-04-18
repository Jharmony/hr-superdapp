import {
  Environment,
  Html,
  OrbitControls,
  useAnimations,
  useGLTF,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useMemo } from 'react';
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
      <group position={[0, -1.05, 0]} scale={1.12}>
        <primitive object={cloneRoot} dispose={null} />
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
          <TraitHoodratScene attributes={attributes} />
        </Suspense>
      </Canvas>
    </div>
  );
}

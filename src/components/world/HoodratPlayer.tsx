import { useAnimations, useGLTF, useKeyboardControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import {
  applyTraitAttributesToScene,
  disposeColoredHoodratScene,
} from '../../lib/hoodratTraitApplyThree';
import type { TraitAttr } from '../../lib/traitVisual';
import { resolvePlayerXZ, type XZRect } from './collision';
import { sampleWalkableTerrainY } from './urTerrainGround';
import {
  CAM_DIST,
  CAM_HEIGHT,
  CYBER_FEET_SINK,
  FP_EYE_Y,
  FP_FORWARD_OFFSET,
  FP_LOOK_PITCH_MAX,
  FP_LOOK_PITCH_MIN,
  GROUND_EPS,
  GROUND_Y,
  GRAVITY,
  JUMP_VELOCITY,
  PITCH_MAX,
  PITCH_MIN,
  PLAYER_RADIUS,
  RUN_SPEED,
  VISUAL_TURN_SPEED,
  WALK_SPEED,
} from './worldConstants';

const MODEL_URL =
  (import.meta.env.PUBLIC_HOODRATS_MODEL_URL as string | undefined)?.trim() ||
  '/models/hoodrats.glb';

type LocoMode = 'idle' | 'walk' | 'run' | 'jump';

type ResolvedClips = {
  idle: string | undefined;
  walk: string | undefined;
  run: string | undefined;
  jump: string | undefined;
};

function resolveClips(animations: THREE.AnimationClip[]): ResolvedClips {
  const match = (re: RegExp) => animations.find((c) => re.test(c.name))?.name;
  return {
    idle: match(/\b(idle|stand|breath|tpose)\b/i) ?? animations[0]?.name,
    walk: match(/\bwalk(ing)?\b/i),
    run: match(/\brun(ning)?\b/i),
    jump: match(/\bjump(ing)?\b/i),
  };
}

const tmpFwd = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpMove = new THREE.Vector3();
const tmpCamEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _footAlignBox = new THREE.Box3();

export type HoodratPortalConfig = {
  x: number;
  z: number;
  triggerRadius: number;
  href: string;
};

export function HoodratPlayer({
  onLockChange,
  onViewModeChange,
  obstacleRects,
  worldXZLim,
  initialXZ,
  initialCamYaw = Math.PI,
  groundY = GROUND_Y,
  feetSink = CYBER_FEET_SINK,
  modelScale = 1.12,
  /**
   * After the animation mixer has run a few frames, re-measure the mesh with a **precise**
   * skinned AABB (`Box3.setFromObject(..., true)`) and shift `worldScene.position.y` so soles
   * sit on `groundY`. Fixes cyber “floating rat” where layout-time bbox used bind-pose geometry.
   */
  snapFeetToGround = false,
  /** World Y for sole bottoms: `groundY` minus this (meters), so feet sit slightly in the floor. */
  footSkinEpsilon = 0.028,
  /**
   * Ur rift: raycast walkable mesh under the feet for steps / thresholds; cyber omits.
   * `soleBias` adds a small upward nudge to sampled Y so skinned soles stay on the paint.
   */
  terrainGround,
  portal,
  traitAttributes,
  /** First Hoodrat NFT in the active rat’s Tokenbound backpack — pet-scale companion in-world. */
  companionTraitAttributes,
}: {
  onLockChange: (locked: boolean) => void;
  onViewModeChange?: (mode: 'tp' | 'fp') => void;
  obstacleRects: XZRect[];
  worldXZLim: number;
  initialXZ?: { x: number; z: number };
  /** Third-person orbit starting yaw (rad). Cyber uses `0` so the camera sits behind the rat toward the portal (−Z). */
  initialCamYaw?: number;
  groundY?: number;
  feetSink?: number;
  modelScale?: number;
  snapFeetToGround?: boolean;
  footSkinEpsilon?: number;
  terrainGround?: { root: THREE.Object3D; minY: number; maxY: number; soleBias?: number };
  portal: HoodratPortalConfig | null;
  /**
   * When set (including `[]`), applies the same tribe / skin tint and clothing visibility as
   * `TraitHoodratPreview` / My Hoodrats GLB export. Omit for the default untinted rig.
   */
  traitAttributes?: TraitAttr[];
  companionTraitAttributes?: TraitAttr[];
}) {
  const gltf = useGLTF(MODEL_URL);
  const traitDecorKey =
    traitAttributes === undefined ? '__default__' : JSON.stringify(traitAttributes);
  const worldScene = useMemo(() => {
    const c = SkeletonUtils.clone(gltf.scene);
    if (traitAttributes !== undefined) {
      applyTraitAttributesToScene(c, traitAttributes);
    }
    return c;
  }, [gltf.scene, traitDecorKey]);

  const companionDecorKey =
    companionTraitAttributes === undefined
      ? '__no_companion__'
      : JSON.stringify(companionTraitAttributes);
  const companionScene = useMemo(() => {
    if (companionTraitAttributes === undefined) return null;
    const c = SkeletonUtils.clone(gltf.scene);
    applyTraitAttributesToScene(c, companionTraitAttributes);
    return c;
  }, [gltf.scene, companionDecorKey]);

  useEffect(() => {
    return () => {
      if (traitAttributes !== undefined) {
        disposeColoredHoodratScene(worldScene);
      }
    };
  }, [traitAttributes, worldScene]);

  useEffect(() => {
    return () => {
      if (companionTraitAttributes !== undefined && companionScene) {
        disposeColoredHoodratScene(companionScene);
      }
    };
  }, [companionTraitAttributes, companionScene]);

  const { actions, mixer } = useAnimations(gltf.animations, worldScene);
  const { camera, gl } = useThree();
  const [, get] = useKeyboardControls();

  const clips = useMemo(() => resolveClips(gltf.animations), [gltf.animations]);
  const companionGroupRef = useRef<THREE.Group>(null);
  const { actions: companionActions, mixer: companionMixer } = useAnimations(
    gltf.animations,
    companionGroupRef,
  );
  const groupRef = useRef<THREE.Group>(null);
  const visualRef = useRef<THREE.Group>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const spotTargetRef = useRef<THREE.Object3D>(null);
  const playerPos = useRef(
    new THREE.Vector3(initialXZ?.x ?? 0, groundY, initialXZ?.z ?? 0),
  );
  const camYaw = useRef(initialCamYaw);
  const orbitPitch = useRef(0.3);
  const lookPitch = useRef(0);
  const firstPersonRef = useRef(false);
  const prevActionRef = useRef<THREE.AnimationAction | null>(null);
  const locoRef = useRef<LocoMode>('idle');
  const pointerLockedRef = useRef(false);
  const velocityY = useRef(0);
  const jumpKeyPrevRef = useRef(false);
  const portalTriggeredRef = useRef(false);
  const obstaclesRef = useRef(obstacleRects);
  obstaclesRef.current = obstacleRects;
  const limRef = useRef(worldXZLim);
  limRef.current = worldXZLim;
  const footGroundSnapDoneRef = useRef(false);
  const footGroundSnapFrameRef = useRef(0);

  const fadeTo = useCallback((next: THREE.AnimationAction | null | undefined) => {
    if (!next) return;
    prevActionRef.current?.fadeOut(0.2);
    next.reset().fadeIn(0.2).play();
    prevActionRef.current = next;
  }, []);

  useLayoutEffect(() => {
    playerPos.current.x = initialXZ?.x ?? 0;
    playerPos.current.y = groundY;
    playerPos.current.z = initialXZ?.z ?? 0;
  }, [groundY, initialXZ?.x, initialXZ?.z]);

  useEffect(() => {
    worldScene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const raw of mats) {
          const m = raw as THREE.MeshStandardMaterial;
          if (!m) continue;
          if (m.transparent && typeof m.opacity === 'number') {
            if (m.opacity < 0.999) m.depthWrite = true;
            else {
              m.transparent = false;
              m.depthWrite = true;
            }
          }
          if (typeof m.alphaTest === 'number' && m.alphaTest > 0) m.depthWrite = true;
        }
      }
    });
  }, [worldScene]);

  useEffect(() => {
    const el = gl.domElement;
    const onClick = () => {
      if (document.pointerLockElement === el) return;
      void el.requestPointerLock();
    };
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      camYaw.current -= e.movementX * 0.0021;
      if (firstPersonRef.current) {
        lookPitch.current -= e.movementY * 0.0018;
        lookPitch.current = THREE.MathUtils.clamp(
          lookPitch.current,
          FP_LOOK_PITCH_MIN,
          FP_LOOK_PITCH_MAX,
        );
      } else {
        orbitPitch.current -= e.movementY * 0.0018;
        orbitPitch.current = THREE.MathUtils.clamp(orbitPitch.current, PITCH_MIN, PITCH_MAX);
      }
    };
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === el;
      pointerLockedRef.current = locked;
      onLockChange(locked);
    };
    el.addEventListener('click', onClick);
    el.addEventListener('mousemove', onMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.code !== 'KeyV') return;
      firstPersonRef.current = !firstPersonRef.current;
      onViewModeChange?.(firstPersonRef.current ? 'fp' : 'tp');
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('mousemove', onMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [gl, onLockChange, onViewModeChange]);

  useLayoutEffect(() => {
    const spot = spotRef.current;
    const tgt = spotTargetRef.current;
    if (spot && tgt) {
      spot.target = tgt;
    }
  }, []);

  useLayoutEffect(() => {
    const scene = worldScene;
    scene.scale.setScalar(modelScale);
    scene.position.set(0, 0, 0);
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    scene.position.y = -box.min.y - feetSink;
    if (snapFeetToGround) {
      footGroundSnapDoneRef.current = false;
      footGroundSnapFrameRef.current = 0;
    }
  }, [feetSink, modelScale, snapFeetToGround, worldScene]);

  useLayoutEffect(() => {
    const g = companionGroupRef.current;
    if (!g) return;
    for (let i = g.children.length - 1; i >= 0; i--) {
      g.remove(g.children[i]!);
    }
    if (companionScene) {
      const c = companionScene;
      c.scale.setScalar(1);
      c.position.set(0, 0, 0);
      c.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(c);
      c.position.y = -box.min.y - feetSink;
      g.add(c);
    }
  }, [companionScene, feetSink]);

  useEffect(() => {
    if (!companionScene || !companionActions || !clips.idle || !companionActions[clips.idle]) {
      return;
    }
    const idle = companionActions[clips.idle]!;
    idle.reset().fadeIn(0.18).play();
    return () => {
      idle.fadeOut(0.12);
    };
  }, [companionScene, companionActions, clips.idle]);

  useEffect(() => {
    if (!actions || !clips.idle || !actions[clips.idle]) return;
    fadeTo(actions[clips.idle]);
  }, [actions, clips.idle, fadeTo]);

  useFrame((_, dt) => {
    if (mixer) mixer.update(dt);
    if (companionMixer && companionScene) companionMixer.update(dt);

    const locked = pointerLockedRef.current;
    const { forward, back, left, right, run, jump } = get();
    const moving = forward || back || left || right;

    const px0 = playerPos.current.x;
    const pz0 = playerPos.current.z;
    const py0 = playerPos.current.y;

    const floorAt = (x: number, z: number, refY: number): number => {
      if (!terrainGround) return groundY;
      const s = sampleWalkableTerrainY(terrainGround.root, x, z, refY, {
        minY: terrainGround.minY,
        maxY: terrainGround.maxY,
        normalMinY: 0.44,
        originYOffset: 0.72,
        originMinPad: 0.36,
        farShort: 3.25,
        farLong: 22,
      });
      const bias = terrainGround.soleBias ?? 0;
      const raw = s !== null ? s + bias : groundY;
      /** Reject wild ray errors; still allow subway ~12 m below nominal street foot Y. */
      return THREE.MathUtils.clamp(raw, groundY - 12.5, groundY + 5.2);
    };

    const floor0 = floorAt(px0, pz0, py0);
    let onGround = py0 <= floor0 + GROUND_EPS && velocityY.current <= 0.001;

    if (locked && jump && !jumpKeyPrevRef.current && onGround) {
      velocityY.current = JUMP_VELOCITY;
    }
    jumpKeyPrevRef.current = !!jump;

    velocityY.current += GRAVITY * dt;
    playerPos.current.y += velocityY.current * dt;

    const floorMid = floorAt(px0, pz0, playerPos.current.y);
    if (velocityY.current < 0 && playerPos.current.y <= floorMid + GROUND_EPS) {
      playerPos.current.y = floorMid;
      velocityY.current = 0;
    } else if (!terrainGround && playerPos.current.y <= groundY) {
      playerPos.current.y = groundY;
      if (velocityY.current < 0) velocityY.current = 0;
    }

    if (locked && moving) {
      if (firstPersonRef.current) {
        camera.getWorldDirection(tmpFwd);
        tmpFwd.y = 0;
        if (tmpFwd.lengthSq() < 1e-6) tmpFwd.set(0, 0, -1);
        else tmpFwd.normalize();
      } else {
        const sinY = Math.sin(camYaw.current);
        const cosY = Math.cos(camYaw.current);
        tmpFwd.set(-sinY, 0, -cosY).normalize();
      }

      tmpRight.set(tmpFwd.z, 0, -tmpFwd.x).normalize();

      tmpMove.set(0, 0, 0);
      if (forward) tmpMove.add(tmpFwd);
      if (back) tmpMove.sub(tmpFwd);
      if (left) tmpMove.add(tmpRight);
      if (right) tmpMove.sub(tmpRight);

      if (tmpMove.lengthSq() > 1e-6) {
        tmpMove.normalize();
        const spd = run ? RUN_SPEED : WALK_SPEED;
        const dx = tmpMove.x * spd * dt;
        const dz = tmpMove.z * spd * dt;
        const resolved = resolvePlayerXZ(
          obstaclesRef.current,
          limRef.current,
          playerPos.current.x,
          playerPos.current.z,
          dx,
          dz,
          terrainGround
            ? { narrowDoorSlide: true, collisionRadius: PLAYER_RADIUS * 0.94 }
            : undefined,
        );
        playerPos.current.x = resolved.x;
        playerPos.current.z = resolved.z;

        const vis = visualRef.current;
        if (vis) {
          const targetYaw = Math.atan2(tmpMove.x, tmpMove.z) + Math.PI;
          const cur = vis.rotation.y;
          const delta = Math.atan2(Math.sin(targetYaw - cur), Math.cos(targetYaw - cur));
          vis.rotation.y = cur + delta * Math.min(1, VISUAL_TURN_SPEED * dt);
        }
      }
    }

    if (terrainGround) {
      const f1 = floorAt(playerPos.current.x, playerPos.current.z, playerPos.current.y);
      if (velocityY.current <= 0) {
        const dy = f1 - playerPos.current.y;
        /** Wider band so stair flights and subway ramps snap in one frame without snagging. */
        if (dy >= -GROUND_EPS && dy <= 2.45) {
          playerPos.current.y = f1;
          if (dy > -0.14) velocityY.current = 0;
        } else if (dy > 2.45) {
          playerPos.current.y += Math.min(dy * 0.28, 0.55);
          velocityY.current = 0;
        } else if (dy < -GROUND_EPS) {
          playerPos.current.y = f1;
          velocityY.current = 0;
        }
        onGround = playerPos.current.y <= f1 + GROUND_EPS;
      } else {
        onGround = false;
      }
    } else {
      onGround = playerPos.current.y <= groundY + GROUND_EPS;
    }

    const inAir = !onGround;
    let targetLoco: LocoMode = 'idle';
    if (inAir) {
      targetLoco =
        clips.jump && actions?.[clips.jump]
          ? 'jump'
          : locked && moving
            ? run
              ? 'run'
              : 'walk'
            : 'idle';
    } else if (locked && moving) targetLoco = run ? 'run' : 'walk';
    else targetLoco = 'idle';

    if (!locked) jumpKeyPrevRef.current = false;

    if (targetLoco !== locoRef.current) {
      locoRef.current = targetLoco;
      if (targetLoco === 'jump' && clips.jump && actions?.[clips.jump]) {
        const act = actions[clips.jump]!;
        act.reset();
        act.setLoop(THREE.LoopOnce, 1);
        act.clampWhenFinished = true;
        fadeTo(act);
      } else if (targetLoco === 'run' && clips.run && actions?.[clips.run]) {
        const a = actions[clips.run]!;
        a.setLoop(THREE.LoopRepeat, Infinity);
        fadeTo(a);
      } else if (targetLoco === 'walk' && clips.walk && actions?.[clips.walk]) {
        const a = actions[clips.walk]!;
        a.setLoop(THREE.LoopRepeat, Infinity);
        fadeTo(a);
      } else if (clips.idle && actions?.[clips.idle]) {
        fadeTo(actions[clips.idle]);
      }
    }

    const p = playerPos.current;
    if (groupRef.current) {
      groupRef.current.position.copy(p);
    }

    const cg = companionGroupRef.current;
    if (cg && companionScene) {
      cg.visible = !firstPersonRef.current;
      if (cg.visible) {
        const ry = visualRef.current?.rotation.y ?? 0;
        const sinY = Math.sin(ry);
        const cosY = Math.cos(ry);
        const fwdX = -sinY;
        const fwdZ = -cosY;
        const rightX = cosY;
        const rightZ = -sinY;
        cg.scale.setScalar(modelScale * 0.33);
        cg.position.set(
          p.x + rightX * 0.82 + fwdX * 0.26,
          p.y,
          p.z + rightZ * 0.82 + fwdZ * 0.26,
        );
        cg.rotation.y = ry;
      }
    }

    if (
      snapFeetToGround &&
      !footGroundSnapDoneRef.current &&
      mixer &&
      visualRef.current &&
      onGround
    ) {
      footGroundSnapFrameRef.current += 1;
      if (footGroundSnapFrameRef.current >= 10) {
        visualRef.current.updateMatrixWorld(true);
        _footAlignBox.makeEmpty();
        _footAlignBox.setFromObject(visualRef.current, true);
        if (!_footAlignBox.isEmpty()) {
          const targetSoleY = terrainGround
            ? floorAt(p.x, p.z, p.y) - footSkinEpsilon
            : groundY - footSkinEpsilon;
          const err = targetSoleY - _footAlignBox.min.y;
          if (Number.isFinite(err) && Math.abs(err) < 6) {
            worldScene.position.y += err;
          }
        }
        footGroundSnapDoneRef.current = true;
      }
    }

    if (portal) {
      const pdx = p.x - portal.x;
      const pdz = p.z - portal.z;
      const nearPortal = pdx * pdx + pdz * pdz < portal.triggerRadius * portal.triggerRadius;
      if (!nearPortal) portalTriggeredRef.current = false;
      else if (nearPortal && !portalTriggeredRef.current) {
        portalTriggeredRef.current = true;
        try {
          document.exitPointerLock();
        } catch {
          /* ignore */
        }
        window.location.href = portal.href;
      }
    }

    worldScene.visible = !firstPersonRef.current;

    if (firstPersonRef.current) {
      tmpCamEuler.set(lookPitch.current, camYaw.current, 0, 'YXZ');
      camera.quaternion.setFromEuler(tmpCamEuler);
      const sinY = Math.sin(camYaw.current);
      const cosY = Math.cos(camYaw.current);
      const hx = -sinY;
      const hz = -cosY;
      camera.position.set(
        p.x + hx * FP_FORWARD_OFFSET,
        p.y + FP_EYE_Y,
        p.z + hz * FP_FORWARD_OFFSET,
      );
    } else {
      const cosP = Math.cos(orbitPitch.current);
      const sinP = Math.sin(orbitPitch.current);
      const sinY = Math.sin(camYaw.current);
      const cosY = Math.cos(camYaw.current);
      const ox = sinY * cosP * CAM_DIST;
      const oz = cosY * cosP * CAM_DIST;
      const oy = sinP * CAM_DIST + CAM_HEIGHT;

      camera.position.set(p.x + ox, p.y + oy, p.z + oz);
      camera.lookAt(p.x, p.y + 1.05, p.z);
    }
  });

  return (
    <group ref={groupRef}>
      <object3D ref={spotTargetRef} position={[0, 0.72, 0.28]} />
      <spotLight
        ref={spotRef}
        position={[-3.6, 4.6, 3.4]}
        angle={1.05}
        penumbra={0.88}
        intensity={58}
        distance={52}
        decay={1.82}
        color="#e6d8c8"
        castShadow={false}
      />
      <pointLight
        position={[0.85, 1.55, 1.15]}
        intensity={4.2}
        distance={26}
        decay={1.9}
        color="#e8dfd4"
      />
      <pointLight
        position={[-1.35, 1.05, -0.55]}
        intensity={2.8}
        distance={24}
        decay={1.92}
        color="#c8d9a8"
      />
      <pointLight
        position={[0.15, 2.35, -1.1]}
        intensity={2.4}
        distance={22}
        decay={1.95}
        color="#a8c4d0"
      />
      <group ref={visualRef}>
        <primitive object={worldScene} />
      </group>
      <group ref={companionGroupRef} />
    </group>
  );
}


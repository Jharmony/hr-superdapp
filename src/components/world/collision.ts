import * as THREE from 'three';
import { PLAYER_RADIUS } from './worldConstants';

export type XZRect = { minx: number; maxx: number; minz: number; maxz: number };

export function circleIntersectsObstacle(
  px: number,
  pz: number,
  o: XZRect,
  radius: number,
): boolean {
  const cx = THREE.MathUtils.clamp(px, o.minx, o.maxx);
  const cz = THREE.MathUtils.clamp(pz, o.minz, o.maxz);
  const dx = px - cx;
  const dz = pz - cz;
  return dx * dx + dz * dz < radius * radius;
}

export function playerOverlapsAny(
  px: number,
  pz: number,
  obstacles: XZRect[],
  radius: number = PLAYER_RADIUS,
): boolean {
  for (let i = 0; i < obstacles.length; i++) {
    if (circleIntersectsObstacle(px, pz, obstacles[i]!, radius)) {
      return true;
    }
  }
  return false;
}

export type ResolvePlayerXZOptions = {
  /** Try partial diagonal moves to slip narrow door AABBs (Ur rift). */
  narrowDoorSlide?: boolean;
  /** Smaller than `PLAYER_RADIUS` helps pass tight door colliders (Ur rift only). */
  collisionRadius?: number;
};

export function resolvePlayerXZ(
  obstacles: XZRect[],
  worldXZLim: number,
  px: number,
  pz: number,
  dx: number,
  dz: number,
  opts?: ResolvePlayerXZOptions,
): { x: number; z: number } {
  const R = opts?.collisionRadius ?? PLAYER_RADIUS;

  let nx = THREE.MathUtils.clamp(px + dx, -worldXZLim, worldXZLim);
  let nz = THREE.MathUtils.clamp(pz + dz, -worldXZLim, worldXZLim);
  if (!playerOverlapsAny(nx, nz, obstacles, R)) return { x: nx, z: nz };
  nx = THREE.MathUtils.clamp(px + dx, -worldXZLim, worldXZLim);
  if (!playerOverlapsAny(nx, pz, obstacles, R)) return { x: nx, z: pz };
  nz = THREE.MathUtils.clamp(pz + dz, -worldXZLim, worldXZLim);
  if (!playerOverlapsAny(px, nz, obstacles, R)) return { x: px, z: nz };

  if (opts?.narrowDoorSlide) {
    const factors = [0.88, 0.76, 0.62, 0.48, 0.36, 0.26, 0.18];
    const nudge = R * 0.92;
    for (const f of factors) {
      nx = THREE.MathUtils.clamp(px + dx * f, -worldXZLim, worldXZLim);
      nz = THREE.MathUtils.clamp(pz + dz * f, -worldXZLim, worldXZLim);
      if (!playerOverlapsAny(nx, nz, obstacles, R)) return { x: nx, z: nz };
      nx = THREE.MathUtils.clamp(px + dx * f, -worldXZLim, worldXZLim);
      if (!playerOverlapsAny(nx, pz, obstacles, R)) return { x: nx, z: pz };
      nx = THREE.MathUtils.clamp(px + dx, -worldXZLim, worldXZLim);
      nz = THREE.MathUtils.clamp(pz + dz * f, -worldXZLim, worldXZLim);
      if (!playerOverlapsAny(nx, nz, obstacles, R)) return { x: nx, z: nz };
      nx = THREE.MathUtils.clamp(px + dx * f, -worldXZLim, worldXZLim);
      nz = THREE.MathUtils.clamp(pz + dz, -worldXZLim, worldXZLim);
      if (!playerOverlapsAny(nx, nz, obstacles, R)) return { x: nx, z: nz };
    }
    const sdx = dx === 0 ? 0 : Math.sign(dx);
    const sdz = dz === 0 ? 0 : Math.sign(dz);
    const ox = sdx * nudge;
    const oz = sdz * nudge;
    for (const f of [0.55, 0.38]) {
      nx = THREE.MathUtils.clamp(px + dx * f + ox, -worldXZLim, worldXZLim);
      nz = THREE.MathUtils.clamp(pz + dz * f + oz, -worldXZLim, worldXZLim);
      if (!playerOverlapsAny(nx, nz, obstacles, R)) return { x: nx, z: nz };
    }

    const h = Math.hypot(dx, dz);
    if (h > 1e-5) {
      const pxN = (-dz / h) * R * 0.68;
      const pzN = (dx / h) * R * 0.68;
      for (const sgn of [-1, 1]) {
        for (const f of [0.58, 0.42, 0.26]) {
          nx = THREE.MathUtils.clamp(px + dx * f + pxN * sgn, -worldXZLim, worldXZLim);
          nz = THREE.MathUtils.clamp(pz + dz * f + pzN * sgn, -worldXZLim, worldXZLim);
          if (!playerOverlapsAny(nx, nz, obstacles, R)) return { x: nx, z: nz };
        }
      }
    }
  }

  return { x: px, z: pz };
}

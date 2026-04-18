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

export function playerOverlapsAny(px: number, pz: number, obstacles: XZRect[]): boolean {
  for (let i = 0; i < obstacles.length; i++) {
    if (circleIntersectsObstacle(px, pz, obstacles[i]!, PLAYER_RADIUS)) {
      return true;
    }
  }
  return false;
}

export function resolvePlayerXZ(
  obstacles: XZRect[],
  worldXZLim: number,
  px: number,
  pz: number,
  dx: number,
  dz: number,
): { x: number; z: number } {
  let nx = THREE.MathUtils.clamp(px + dx, -worldXZLim, worldXZLim);
  let nz = THREE.MathUtils.clamp(pz + dz, -worldXZLim, worldXZLim);
  if (!playerOverlapsAny(nx, nz, obstacles)) return { x: nx, z: nz };
  nx = THREE.MathUtils.clamp(px + dx, -worldXZLim, worldXZLim);
  if (!playerOverlapsAny(nx, pz, obstacles)) return { x: nx, z: pz };
  nz = THREE.MathUtils.clamp(pz + dz, -worldXZLim, worldXZLim);
  if (!playerOverlapsAny(px, nz, obstacles)) return { x: px, z: nz };
  return { x: px, z: pz };
}

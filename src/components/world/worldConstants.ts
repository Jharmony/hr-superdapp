/** Shared Hoodrat world / locomotion tuning (cyber district + rift worlds). */

import type { KeyboardControlsEntry } from '@react-three/drei';

export const PLAYER_RADIUS = 0.42;

export const GROUND_Y = -1.05;
export const GROUND_EPS = 0.02;
export const GRAVITY = -32;
export const JUMP_VELOCITY = 9.2;
export const WALK_SPEED = 3.35;
export const RUN_SPEED = 6.1;
export const CAM_DIST = 5.35;
export const CAM_HEIGHT = 1.42;
export const PITCH_MIN = 0.1;
export const PITCH_MAX = 0.52;
export const FP_LOOK_PITCH_MIN = -1.15;
export const FP_LOOK_PITCH_MAX = 1.15;
export const FP_EYE_Y = 2.12;
export const FP_FORWARD_OFFSET = 0.32;
export const VISUAL_TURN_SPEED = 10;

/** Extra drop after bbox foot snap — tuned for Hoodrat skinned mesh. */
export const CYBER_FEET_SINK = 3.88;

export const keyMap: KeyboardControlsEntry[] = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'back', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'jump', keys: ['Space'] },
];

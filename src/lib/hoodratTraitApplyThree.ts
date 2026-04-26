import * as THREE from 'three';
import {
  TOP_CLOTHING_MESH_NAMES,
  deriveTraitVisuals,
  meshNameKey,
  shouldApplyTribeSkinTint,
  type TraitAttr,
} from './traitVisual';

/** Deep-clone materials on this subtree so trait edits never touch a cached glTF scene. */
export function cloneMeshMaterials(root: THREE.Object3D) {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.material) return;
    if (Array.isArray(o.material)) {
      o.material = o.material.map((m) => m.clone());
    } else {
      o.material = o.material.clone();
    }
  });
}

export function disposeColoredHoodratScene(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        m?.dispose?.();
      }
    }
  });
}

/**
 * Tribe tint on skin materials: `color` multiplies the baseColor map in the shader.
 *
 * We **do not** paint full emissive on top when a map exists — black regions (wristbands,
 * clothing trim on the limb atlas, dark fur) stay dark. Previously emissive matched the
 * tribe hex everywhere, which made black UVs glow the skin color and made faces look noisy.
 */
function applyTribeSkinTint(mat: THREE.Material, hex: string) {
  if (!(mat instanceof THREE.MeshStandardMaterial)) return;
  const tint = new THREE.Color(hex);
  mat.color.copy(tint);
  if (mat.map) {
    mat.emissive.set(0, 0, 0);
    mat.emissiveIntensity = 0;
    return;
  }
  mat.emissive.copy(tint);
  const lum = 0.2126 * tint.r + 0.7152 * tint.g + 0.0722 * tint.b;
  mat.emissiveIntensity = lum < 0.08 ? 0.5 : lum < 0.22 ? 0.38 : 0.26;
}

function prepMeshMaterials(root: THREE.Object3D) {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
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
  });
}

export function applyTraitVisualsToScene(
  root: THREE.Object3D,
  visual: ReturnType<typeof deriveTraitVisuals>,
) {
  cloneMeshMaterials(root);
  prepMeshMaterials(root);
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const n = o.name;
    if (visual.hideTopClothing && TOP_CLOTHING_MESH_NAMES.has(meshNameKey(n))) {
      o.visible = false;
    }
    if (visual.skinTintHex) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const raw of mats) {
        if (!raw || !shouldApplyTribeSkinTint(n, raw)) continue;
        applyTribeSkinTint(raw, visual.skinTintHex);
      }
    }
  });
}

export function applyTraitAttributesToScene(
  root: THREE.Object3D,
  attributes: TraitAttr[] | undefined,
) {
  applyTraitVisualsToScene(root, deriveTraitVisuals(attributes));
}

import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  applyTraitAttributesToScene,
  disposeColoredHoodratScene,
} from './hoodratTraitApplyThree';
import type { TraitAttr } from './traitVisual';
import { preferTurboGatewayUrl } from './arweaveGateways';

const MODEL_URL =
  preferTurboGatewayUrl((import.meta.env.PUBLIC_HOODRATS_MODEL_URL as string | undefined)?.trim() || '') ||
  '/models/hoodrats.glb';

let baseGltfPromise: Promise<GLTF> | null = null;

function loadBaseGltf(): Promise<GLTF> {
  baseGltfPromise ??= new GLTFLoader().loadAsync(MODEL_URL);
  return baseGltfPromise;
}

function triggerDownload(arrayBuffer: ArrayBuffer, filename: string) {
  const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.glb') ? filename : `${filename}.glb`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Builds a tinted clone of the Hoodrats rig (same rules as the in-app 3D preview)
 * and downloads it as a binary `.glb` for holders.
 */
export async function downloadHoodratTraitGlb(
  attributes: TraitAttr[] | undefined,
  filenameBase: string,
): Promise<void> {
  const gltf = await loadBaseGltf();
  const root = cloneSkinned(gltf.scene);
  try {
    applyTraitAttributesToScene(root, attributes);

    const exporter = new GLTFExporter();
    const data = await exporter.parseAsync(root, {
      binary: true,
      animations: gltf.animations,
      truncateDrawRange: true,
    });

    if (data instanceof ArrayBuffer) {
      triggerDownload(data, filenameBase);
      return;
    }
    if (typeof data === 'string') {
      const enc = new TextEncoder().encode(data);
      triggerDownload(enc.buffer, filenameBase);
      return;
    }
    throw new Error('Unexpected glTF export format');
  } finally {
    disposeColoredHoodratScene(root);
  }
}

import type { NftMetadata } from './metadata';

export type TraitAttr = NonNullable<NftMetadata['attributes']>[number];

/** Case-insensitive trait lookup by `trait_type` substring or regex. */
export function findTraitValue(
  attributes: TraitAttr[] | undefined,
  typeMatcher: RegExp,
): string | undefined {
  if (!attributes?.length) return undefined;
  const hit = attributes.find((a) => a.trait_type && typeMatcher.test(String(a.trait_type).trim()));
  if (!hit || hit.value == null) return undefined;
  return String(hit.value).trim();
}

/** Hoodrats metadata uses `Null` for empty clothing / ears / eyewear slots. */
const SHIRTLESS_VALUE =
  /^(none|null|n\/a|na|shirtless|no shirt|no\s*clothing|bare(chest)?|naked)$/i;

export function isShirtlessFromTraits(attributes: TraitAttr[] | undefined): boolean {
  if (!attributes?.length) return false;
  for (const key of [/cloth/i, /shirt/i, /top/i, /torso/i, /sleeve/i]) {
    const v = findTraitValue(attributes, key);
    if (v && SHIRTLESS_VALUE.test(v)) return true;
  }
  return false;
}

/**
 * Tribe → skin tint for body submeshes only (shared GLB has no separate hair meshes).
 * Keys use letters-only normalization (see `tribeKey`) so `Zenucats` / `Zenu cats` match.
 *
 * Colours aligned to your reference set (per tribe, image order you described):
 * 1 Guarijiorats · 2 Andeanmunks · 3 Jibarats · 4 Mayaquitos · 5 Anasaziats ·
 * 6 Tapirruts · 7 Carajacats · 8 Bororats · 9 Zenucats
 */
export const TRIBE_SKIN_HEX: Record<string, string> = {
  guarijiorats: '#E8E8E6',
  andeanmunks: '#7A26D9',
  jibarats: '#2DD4BF',
  mayaquitos: '#3D2B1F',
  anasaziats: '#2E1A47',
  tapirruts: '#DB2777',
  carajacats: '#54D036',
  bororats: '#C9A589',
  zenucats: '#D4A574',
};

/** Lowercase letters only — robust to spaces, hyphens, punctuation in metadata. */
export function tribeKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z]/g, '');
}

export function tribeSkinHex(attributes: TraitAttr[] | undefined): string | null {
  const raw = findTraitValue(attributes, /^tribe$/i);
  if (!raw) return null;
  const key = tribeKey(raw);
  return TRIBE_SKIN_HEX[key] ?? null;
}

/** Normalise glTF mesh names for comparisons (exporters vary in casing). */
export function meshNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Meshes to hide when `isShirtlessFromTraits` is true — edit after inspecting the GLB. */
export const TOP_CLOTHING_MESH_NAMES = new Set(['pm3d_cube3d1']);

/** Never tint — `Extract1` uses `Extract10` (shirt + shared UVs); clothing cubes. */
export const TRIBE_SKIN_NEVER_MESH_KEYS = new Set([
  'extract1',
  'pm3d_cube3d1',
  'pm3d_cube3d4_1',
  'pm3d_cube3d4_2',
]);

/**
 * Tribe tint by glTF **material.name** (lowercase). Do not add `extract10`: it is the
 * `Extract1` shirt/body atlas and will recolour the top.
 *
 * `polysphere10` is applied only on {@link TRIBE_POLYSPHERE10_HEAD_MESH_KEYS} so wrist
 * jewellery that reuses the same atlas does not pick up skin tint. Wristbands share the
 * limb atlas (Extract6) with skin; tint multiplies the map only (see hoodratTraitApplyThree).
 */
export const TRIBE_SKIN_MATERIAL_NAME_KEYS = new Set([
  'polysphere1_20', // PolySphere1_2_1 / 1_2_2 — inner body / fur
  'extract80', // Extract8 — head / face
  'extract60', // Extract6 — limbs
  'pm3d_sphere3d10', // PM3D_Sphere3D1 — tail
]);

/** Meshes allowed to use material `polysphere10` for tribe tint (outer head / ears only). */
export const TRIBE_POLYSPHERE10_HEAD_MESH_KEYS = new Set(['polysphere1_1', 'polysphere1_3']);

/**
 * Skin/fur meshes when material names match `hoodrat.gltf`. Still blocked by
 * {@link TRIBE_SKIN_NEVER_MESH_KEYS}.
 */
export const TRIBE_SKIN_MESH_FALLBACK_KEYS = new Set([
  'polysphere1_2_1',
  'polysphere1_2_2',
  'extract6',
  'extract8',
  'pm3d_sphere3d1',
]);

/** On fallback meshes, never tint these material atlases (cloth / props). */
export const TRIBE_SKIN_EXCLUDE_MATERIAL_KEYS = new Set([
  'extract10',
  'extract40',
  'pm3d_cube3d10',
  'pm3d_cube3d40',
]);

export function shouldApplyTribeSkinTint(
  meshName: string,
  material: { name?: string } | null | undefined,
): boolean {
  const mk = meshNameKey(meshName);
  if (TRIBE_SKIN_NEVER_MESH_KEYS.has(mk)) return false;

  const rawName = material?.name;
  const matKey = rawName != null && String(rawName).trim() !== '' ? meshNameKey(String(rawName)) : '';

  if (matKey === 'polysphere10') {
    return TRIBE_POLYSPHERE10_HEAD_MESH_KEYS.has(mk);
  }

  if (matKey && TRIBE_SKIN_MATERIAL_NAME_KEYS.has(matKey)) return true;

  // Renamed / anonymous materials on known skin-only meshes (still skip cloth atlases).
  if (TRIBE_SKIN_MESH_FALLBACK_KEYS.has(mk)) {
    if (matKey === '') return true;
    if (!TRIBE_SKIN_EXCLUDE_MATERIAL_KEYS.has(matKey)) return true;
  }

  return false;
}

export type TraitDerivedVisual = {
  hideTopClothing: boolean;
  skinTintHex: string | null;
};

export function deriveTraitVisuals(attributes: TraitAttr[] | undefined): TraitDerivedVisual {
  return {
    hideTopClothing: isShirtlessFromTraits(attributes),
    skinTintHex: tribeSkinHex(attributes),
  };
}

# Three Blocks

> GPU-accelerated simulation and rendering toolkit for Three.js WebGPU

Three Blocks provides high-performance GPU compute utilities, TSL (Three.js Shading Language) nodes, simulation systems (Boids, SPH, PBF), and rendering tools optimized for Three.js WebGPU.

- Package: `@three-blocks/core`
- Requires: Three.js r182+ with WebGPU

## Documentation
- [Full API Reference](https://threejs-blocks.com/llm/core/llms-full.txt): Complete API documentation for all classes, functions, and modules
- [LLM Guide](https://threejs-blocks.com/llm/core/LLM_GUIDE.md): Integration checklist for AI assistants
- [Interactive Examples](https://threejs-blocks.com/docs/demos): Live demos with source code
- [Getting Started](https://threejs-blocks.com/docs): Installation and usage guide

## Compute
GPU compute utilities for culling, sorting, sampling, and SDF generation.

- [ComputeBatchCulling](https://threejs-blocks.com/llm/core/docs/ComputeBatchCulling.md): GPU culling for IndirectBatchedMesh that compacts survivors and updates indirect draw args from ref positions or matrices.
- [ComputeBitonicSort](https://threejs-blocks.com/llm/core/docs/ComputeBitonicSort.md): Stable GPU bitonic sort for uvec2 key/id pairs with WebGPU and WebGL paths; used by culling and sims.
- [ComputeBVHSampler](https://threejs-blocks.com/llm/core/docs/ComputeBVHSampler.md): GPU sampler that rejects/accepts points inside an SDF volume and outputs instance matrices or positions.
- [ComputeInstanceCulling](https://threejs-blocks.com/llm/core/docs/ComputeInstanceCulling.md): GPU frustum/LOD culling for InstancedMesh that compacts visible IDs and writes indirect args (optional depth sort).
- [ComputeMeshSurfaceSampler](https://threejs-blocks.com/llm/core/docs/ComputeMeshSurfaceSampler.md): GPU mesh surface sampler using alias table + blue noise to output instance matrices/normals for instancing.
- [ComputeMipAwareBlueNoise](https://threejs-blocks.com/llm/core/docs/ComputeMipAwareBlueNoise.md): GPU generator for mip-aware Hilbert R1 blue-noise textures that stay blue across mips.
- [ComputePointsSDFGenerator](https://threejs-blocks.com/llm/core/docs/ComputePointsSDFGenerator.md): GPU SDF generator that builds a 3D distance texture from a point cloud using PointsBVH.
- [ComputePrefixSum](https://threejs-blocks.com/llm/core/docs/ComputePrefixSum.md): GPU parallel prefix sum using Blelloch scan algorithm
- [ComputeRadixSort](https://threejs-blocks.com/llm/core/docs/ComputeRadixSort.md): Stable GPU radix sort; O(n) complexity, eliminates flickering in Gaussian Splatting
- [ComputeSDFGenerator](https://threejs-blocks.com/llm/core/docs/ComputeSDFGenerator.md): GPU SDF generator that builds a 3D distance texture from a mesh using a BVH.
- [SDFVolumeHelpers](https://threejs-blocks.com/llm/core/docs/module-SDFVolumeHelpers.md): Debug helpers to visualize SDF bounds, sampled points, and grid probes.

## TSL
Three.js Shading Language nodes for custom shader effects.

- [animationTextureMatrix](https://threejs-blocks.com/llm/core/docs/animationTextureMatrix.md): TSL function that samples a 4x4 transform from a baked VAT/OAT texture with optional frame interpolation.
- [animationTextureNormal](https://threejs-blocks.com/llm/core/docs/animationTextureNormal.md): Sample transformed normal from a baked animation texture.
- [animationTexturePosition](https://threejs-blocks.com/llm/core/docs/animationTexturePosition.md): Sample transformed position from a baked animation texture.
- [biplanarTexture](https://threejs-blocks.com/llm/core/docs/biplanarTexture.md): Biplanar world-space mapping that blends the two dominant axes for triplanar-like results with fewer samples.
- [blueNoise](https://threejs-blocks.com/llm/core/docs/blueNoise.md): Hilbert R1 blue-noise scalar generator from integer coords for stable jitter/dither in TSL.
- [CurlNoise](https://threejs-blocks.com/llm/core/docs/module-CurlNoise.md): TSL curl-noise utilities for divergence-free flow fields, FBM variants, and advection helpers.
- [filmHD](https://threejs-blocks.com/llm/core/docs/filmHD.md): Cinematic film grain with blue noise, scanlines, and temporal stability.
- [fresnel](https://threejs-blocks.com/llm/core/docs/fresnel.md): TSL Fresnel falloff factor based on view angle, useful for rim lighting and edge highlights.
- [instanceCulling](https://threejs-blocks.com/llm/core/docs/instanceCulling.md): TSL node that applies ComputeInstanceCulling transforms to vertex positions and normals for culled instances.
- [instanceCullingIndex](https://threejs-blocks.com/llm/core/docs/instanceCullingIndex.md): TSL function that returns the culled instance ID for the current draw call.
- [instanceCullingMatrix](https://threejs-blocks.com/llm/core/docs/instanceCullingMatrix.md): Fetch the instance matrix for a culled instance.
- [kuwahara](https://threejs-blocks.com/llm/core/docs/kuwahara.md): Generalized anisotropic Kuwahara painterly filter with multi-sector sampling.
- [parallaxOcclusion](https://threejs-blocks.com/llm/core/docs/parallaxOcclusion.md): Parallax occlusion mapping node with adaptive raymarching and refinement; returns displaced UVs and depth offset.
- [shadowMapFastNoise](https://threejs-blocks.com/llm/core/docs/shadowMapFastNoise.md): Fast shadow map filtering using spatial noise and Poisson disk sampling.
- [smoke](https://threejs-blocks.com/llm/core/docs/smoke.md): Screen-space 2D fluid smoke sim node (advection, pressure solve, vorticity) that outputs a dye texture.
- [smokeRTT](https://threejs-blocks.com/llm/core/docs/smokeRTT.md): RTT-based 2D fluid smoke sim node (broader WebGPU compatibility than compute-based smoke).
- [structureTensor](https://threejs-blocks.com/llm/core/docs/structureTensor.md): Compute structure tensor for edge-aware image filtering.
- [traaHD](https://threejs-blocks.com/llm/core/docs/traaHD.md): Temporal reprojection AA node using velocity/depth reprojection and history clamping; supports super-res scale.

## Geometries
Custom geometry classes for specialized rendering.

- [BirdGeometry](https://threejs-blocks.com/llm/core/docs/BirdGeometry.md): Low-poly bird mesh (3 triangles) matching the Three.js boids example, ideal for instanced flocking.
- [BoxNoFaceGeometry](https://threejs-blocks.com/llm/core/docs/BoxNoFaceGeometry.md): Line-segment box geometry with 12 edges only (no faces), useful for bounds/wireframes.
- [TriangleGeometry](https://threejs-blocks.com/llm/core/docs/TriangleGeometry.md): Single full-screen triangle for postprocessing passes, avoiding the center seam of a quad.

## Materials
Node-based materials with advanced features.

- [GaussianSplatsMaterial](https://threejs-blocks.com/llm/core/docs/GaussianSplatsMaterial.md): Material for rendering Gaussian Splats with anisotropic ellipses and alpha blending.
- [MeshTransmissionNodeMaterial](https://threejs-blocks.com/llm/core/docs/MeshTransmissionNodeMaterial.md): MeshPhysicalNodeMaterial variant that samples the scene for transmission with chromatic aberration, distortion, and attenuation.

## Meshes
Specialized mesh classes with GPU optimizations.

- [GridPristine](https://threejs-blocks.com/llm/core/docs/GridPristine.md): Infinite anti-aliased grid mesh with two configurable layers rendered analytically in world space.

## Animation
GPU-accelerated animation systems using baked texture data.

- [AnimationBakeLoader](https://threejs-blocks.com/llm/core/docs/AnimationBakeLoader.md): Loader that fetches EXR + JSON baked animation data and returns an initialized AnimationBakeMixer.
- [AnimationBakeMixer](https://threejs-blocks.com/llm/core/docs/AnimationBakeMixer.md): Playback controller for VAT/OAT textures that manages frame uniforms, interpolation, and material binding.

## Text
High-performance text rendering with MSDF fonts.

- [batchedText](https://threejs-blocks.com/llm/core/docs/batchedText.md): TSL helper that builds vertex transforms for BatchedText glyphs (per-member matrices, billboarding, packing).
- [BatchedText](https://threejs-blocks.com/llm/core/docs/BatchedText.md): Batched renderer for many Text instances in one draw call with GPU culling, LOD, and sorting; shared SDF atlas.
- [batchedTextColor](https://threejs-blocks.com/llm/core/docs/batchedTextColor.md): TSL node that computes SDF fill/outline for BatchedText using per-member colors and visibility mask.
- [text](https://threejs-blocks.com/llm/core/docs/text.md): TSL helper that builds vertex transforms for a Text mesh using glyph bounds and atlas data.
- [Text](https://threejs-blocks.com/llm/core/docs/Text.md): SDF text mesh with async glyph atlas generation (troika) plus outline/fill controls and TSL hooks.
- [textColor](https://threejs-blocks.com/llm/core/docs/textColor.md): TSL node that computes SDF fill/outline color and alpha for Text rendering.
- [textDrawId](https://threejs-blocks.com/llm/core/docs/textDrawId.md): TSL accessor for batched member index (0 for single Text) usable in vertex or fragment stages.
- [textGlyphDimensions](https://threejs-blocks.com/llm/core/docs/textGlyphDimensions.md): TSL accessor for per-glyph size (width/height) in local units.
- [textGlyphUV](https://threejs-blocks.com/llm/core/docs/textGlyphUV.md): TSL accessor for per-glyph UVs inside the glyph box (0-1).
- [textLetterId](https://threejs-blocks.com/llm/core/docs/textLetterId.md): TSL accessor for normalized letter position within a text (0-1), per member for BatchedText.
- [textUV](https://threejs-blocks.com/llm/core/docs/textUV.md): TSL accessor for UVs across the entire text block (0-1).

## IndirectBatchedMesh
Indirect instanced rendering with GPU-driven culling.

- [indirectBatch](https://threejs-blocks.com/llm/core/docs/indirectBatch.md): TSL node that applies IndirectBatchedMesh transforms and geometry masking to vertex data.
- [indirectBatchColor](https://threejs-blocks.com/llm/core/docs/indirectBatchColor.md): Access the per-instance color written by {@link IndirectBatchNode}.
- [IndirectBatchedMesh](https://threejs-blocks.com/llm/core/docs/IndirectBatchedMesh.md): WebGPU-first batched mesh that packs multiple geometries and draws via multi-draw indirect, built for GPU culling.
- [indirectBatchGeometryId](https://threejs-blocks.com/llm/core/docs/indirectBatchGeometryId.md): Access the geometry ID for a given instance in an {@link IndirectBatchedMesh}.
- [indirectBatchId](https://threejs-blocks.com/llm/core/docs/indirectBatchId.md): Return the stable instance id for an {@link IndirectBatchedMesh}, honoring survivorIdSB when present.
- [indirectBatchMatrix](https://threejs-blocks.com/llm/core/docs/indirectBatchMatrix.md): Fetch the batch matrix for a given instance id in an {@link IndirectBatchedMesh}.

## Simulation
Particle and fluid simulation systems (Boids, SPH, PBF).

- [Boids](https://threejs-blocks.com/llm/core/docs/Boids.md): GPU boids flocking sim with optional spatial grid, 2D/3D modes, and instance-matrix output.
- [BVHVolumeConstraint](https://threejs-blocks.com/llm/core/docs/BVHVolumeConstraint.md): Direct BVH boundary constraint without SDF precomputation.
- [PBF](https://threejs-blocks.com/llm/core/docs/PBF.md): GPU position-based fluids solver with optional spatial grid acceleration and domain binding.
- [SPH](https://threejs-blocks.com/llm/core/docs/SPH.md): GPU SPH fluid solver with spatial grid acceleration, domain binding, and optional oriented particles.

## Helpers
- [GaussianSplatsHelper](https://threejs-blocks.com/llm/core/docs/GaussianSplatsHelper.md): Visualizes model bounding box and per-instance wireframe boxes.
- [GaussianSplatsPoints](https://threejs-blocks.com/llm/core/docs/GaussianSplatsPoints.md): Point cloud visualization of Gaussian Splat centers.

## Optional
- [GitHub Repository](https://github.com/renaudrohlinger/three-blocks): Source code and issues
- [NPM Package](https://www.npmjs.com/package/@three-blocks/core): Package details and versions

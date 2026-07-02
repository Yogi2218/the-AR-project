# Educational AR: GLB Model Validation Checklist

To maintain a high-quality, stable, and performant AR experience for schools and museums, every new 3D character model dropped into `/public/models/` must pass the following guidelines:

## 1. Required Files Structure
For each character ID (e.g., `einstein`), the engine automatically looks for these files:
- `[id].glb` — The main 3D model.
- `[id].meta.json` — Height normalizer, eye level, and rigorous bone mapping overrides.
- `[id].expressions.json` — Defines custom blendshape combinations for specific moods (calm, serious, etc).
- `[id].visemes.json` — Defines custom lip-sync mappings.

## 2. Validation Checklist
Before adding any new character, ensure the `.glb` passes this checklist in Blender/Maya:

- [ ] **Rigged**: Must have a functional skeleton.
- [ ] **Jaw Bone**: A bone or morph target for jaw movements is mandatory.
- [ ] **Eye Bones**: Required for look-at tracking.
- [ ] **Blendshapes**: Minimum required: `blinkLeft`/`blinkRight`, `mouthOpen`, `smileLeft`/`smileRight`.
- [ ] **Proper Scale**: Should be exported at roughly 1 unit = 1 meter (the engine will normalize it to 1.7m, but closer to scale is better).
- [ ] **Origin at Feet**: The mesh origin (0,0,0) MUST be located at the bottom center of the feet to ensure it stands flat on the AR ground.
- [ ] **PBR Textures**: Materials should use standard PBR (BaseColor, Normal, Roughness, Metallic) baked directly into the GLB.
- [ ] **Named Bones**: Ensure standard naming conventions (`Spine`, `Head`, `LeftShoulder`, etc.) or document overrides in `.meta.json`.
- [ ] **Optimized Triangles**: Keep triangle count below **80k** to ensure a steady 60fps on mobile and tablet devices.

## 3. Auto Compression
The Universal Pipeline supports:
- **Draco Compression** (`.draco`)
- **KTX2 Texture Compression**
If your GLB is larger than 10MB, it is highly recommended to compress it using glTF-Transform or Draco before deployment.

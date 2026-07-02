# EduAR 3D Model Assets

Place your 3D character `.glb` models in this folder.

## File Specifications
- **Format**: `.glb` (glTF 2.0 Binary)
- **File Name**: Matches the `modelFile` path in `characterData.ts` (e.g., `einstein.glb`)
- **Polygon Count**: 20,000 – 30,000 triangles max (optimized for real-time web engines)
- **Texture size**: 1024x1024 or 2048x2048 (maximum), compressed (e.g. using `KTX2` or standard JPG/PNG compression)
- **Material**: Standard PBR materials (`MeshStandardMaterial`)

## Coordinate Origin
- **Origin**: Pivot point should be at the character's feet `(0, 0, 0)`.
- **Facing**: The character must face forward (along the positive Z-axis).

## Animation Clips
The model's skeleton/rig should include standard animation clips with the following exact names (case-insensitive search is supported):
1. **`idle`** or **`breath`**: A looped breathing/standing animation.
2. **`talk`** or **`explain`**: Gestures for explaining or speaking, blended automatically when the character states become active.
3. **`blink`**: Eyeblink animation clip or handled via morph targets.

## Morph Targets / Blendshapes (Optional)
For real-time lip-sync, the face mesh should contain standard blendshapes:
- **`mouthOpen`** or **`jawOpen`** or **`viseme_aa`** / **`viseme_O`**: Mapped directly to real-time voice amplitudes.

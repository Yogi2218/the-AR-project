'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { useSessionStore } from '@/stores/sessionStore';
import type { Character } from '@/lib/characters/characterData';

// ─────────────────────────────────────────────────────────────
// ARScene — Three.js canvas with REAL camera background +
//           character-specific 3D avatar per selection
// ─────────────────────────────────────────────────────────────

// Visual config per character — distinct look for each
const CHAR_VISUALS: Record<string, {
  bodyColor: number; headColor: number; ringColor: number;
  bodyScale: [number, number]; headScale: number;
  eyeColor: number; extras?: string;
}> = {
  einstein:  { bodyColor: 0x8899cc, headColor: 0xaabbdd, ringColor: 0x4488ff, bodyScale: [0.30, 0.90], headScale: 0.26, eyeColor: 0x99ccff, extras: 'hair' },
  gandhi:    { bodyColor: 0xd4a96a, headColor: 0xe8c99a, ringColor: 0xff8800, bodyScale: [0.25, 0.95], headScale: 0.22, eyeColor: 0x553300 },
  trex:      { bodyColor: 0x8b4513, headColor: 0xa0522d, ringColor: 0xff4400, bodyScale: [0.55, 1.10], headScale: 0.45, eyeColor: 0xff6600, extras: 'trex' },
  lion:      { bodyColor: 0xd4a017, headColor: 0xe8c060, ringColor: 0xffaa00, bodyScale: [0.50, 0.85], headScale: 0.42, eyeColor: 0xff8800, extras: 'mane' },
  eagle:     { bodyColor: 0x4a5568, headColor: 0xf8f8f8, ringColor: 0x88aaff, bodyScale: [0.28, 0.80], headScale: 0.24, eyeColor: 0xffcc00, extras: 'wings' },
  curie:     { bodyColor: 0x7c4d99, headColor: 0x9b6bb5, ringColor: 0xaa44ff, bodyScale: [0.28, 0.88], headScale: 0.24, eyeColor: 0xddaaff },
  kalam:     { bodyColor: 0x2d6a4f, headColor: 0x52b788, ringColor: 0x00ff88, bodyScale: [0.30, 0.92], headScale: 0.25, eyeColor: 0x88ffcc },
  mammoth:   { bodyColor: 0x5c4033, headColor: 0x6b4c3b, ringColor: 0x8866aa, bodyScale: [0.60, 1.05], headScale: 0.48, eyeColor: 0xcc8844, extras: 'tusks' },
  davinci:   { bodyColor: 0x8b6914, headColor: 0xaa8833, ringColor: 0xddaa00, bodyScale: [0.30, 0.88], headScale: 0.26, eyeColor: 0x886622 },
  cleopatra: { bodyColor: 0x1a6b5e, headColor: 0x2d9e8a, ringColor: 0x00ddcc, bodyScale: [0.28, 0.86], headScale: 0.24, eyeColor: 0x00ffee, extras: 'crown' },
};

const DEFAULT_VISUAL: {
  bodyColor: number; headColor: number; ringColor: number;
  bodyScale: [number, number]; headScale: number;
  eyeColor: number; extras?: string;
} = {
  bodyColor: 0x6278f8, headColor: 0x8199fb, ringColor: 0x6278f8,
  bodyScale: [0.35, 1.0], headScale: 0.28, eyeColor: 0xffffff
};

interface ARSceneProps {
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.head.appendChild(script);
  });
}

export default function ARScene({ onCanvasReady }: ARSceneProps) {
  const mountRef     = useRef<HTMLDivElement>(null);
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef     = useRef<THREE.Scene | null>(null);
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const charGroupRef = useRef<THREE.Group | null>(null);
  const mixerRef     = useRef<THREE.AnimationMixer | null>(null);
  const clockRef     = useRef(new THREE.Clock());
  const frameRef     = useRef<number>(0);
  const prevCharId   = useRef<string>('');

  const [sceneReady, setSceneReady] = useState<THREE.Scene | null>(null);
  const [modelLoaded, setModelLoaded] = useState(0);
  const [webGLError, setWebGLError] = useState(false);
  const idleActionRef = useRef<THREE.AnimationAction | null>(null);
  const talkActionRef = useRef<THREE.AnimationAction | null>(null);

  // Background camera plane refs
  const bgPlaneRef = useRef<THREE.Mesh | null>(null);
  const bgMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  
  // Controls & Calibration helpers refs
  const transformControlsRef = useRef<any>(null);
  const isDraggingRef = useRef(false);
  const floorReticleRef = useRef<THREE.Mesh | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);

  // MediaPipe Selfie Segmentation states & refs
  const [selfieSegLoaded, setSelfieSegLoaded] = useState(false);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fgTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const fgPlaneRef = useRef<THREE.Mesh | null>(null);
  const selfieSegmentationRef = useRef<any>(null);

  // Custom backgrounds refs
  const bgImageTextureRef = useRef<THREE.Texture | null>(null);
  const bgVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const bgVideoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const fallbackTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Gaze Shifts & Expression Weights refs
  const gazeShiftOffsetRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const isGazeShiftedRef = useRef<boolean>(false);
  const nextGazeShiftTimeRef = useRef<number>(0);
  const gazeShiftEndTimeRef = useRef<number>(0);
  const lastProcessedTimeRef = useRef<number>(0);

  const currentExpressionWeightsRef = useRef({
    smileLeft: 0,
    smileRight: 0,
    browInnerUp: 0,
    browDown: 0,
    lipsPress: 0,
    headTilt: 0,
    gazeOffsetX: 0,
    gazeOffsetY: 0,
    disableBlink: false
  });

  const {
    character,
    characterPosition,
    characterScale,
    characterRotation,
    cameraEnabled,
    mouthOpenAmount,
    isSpeaking,
    faceMorphs,
    placementMode,
    isPlacementLocked,
    transformMode,
    cameraOpacity,
    cameraBlur,
    cameraOffset,
    cameraMirror,
    showGrid,
    backgroundMode,
    backgroundImageUrl,
    backgroundVideoUrl,
    activeExpression,
    showSelfieSegmentation,
  } = useSessionStore();

  // ── Cover aspect ratio calculator for three background plane ──────
  const updateBgPlaneScale = useCallback(() => {
    const container = mountRef.current;
    const video = videoElementRef.current;
    const cam = cameraRef.current;
    const bgPlane = bgPlaneRef.current;
    const fgPlane = fgPlaneRef.current;
    
    if (!container || !cam || !bgPlane) return;

    const canvasW = container.clientWidth || window.innerWidth;
    const canvasH = container.clientHeight || window.innerHeight;
    if (canvasW === 0 || canvasH === 0) return;

    // Try to get active dimensions based on background mode (video, image or webcam)
    let contentW = 1280;
    let contentH = 720;

    const mode = useSessionStore.getState().backgroundMode;
    if (mode === 'image' && bgImageTextureRef.current?.image) {
      contentW = bgImageTextureRef.current.image.width || 1280;
      contentH = bgImageTextureRef.current.image.height || 720;
    } else if (mode === 'video' && bgVideoElementRef.current) {
      contentW = bgVideoElementRef.current.videoWidth || 1280;
      contentH = bgVideoElementRef.current.videoHeight || 720;
    } else if (video) {
      contentW = video.videoWidth || 1280;
      contentH = video.videoHeight || 720;
    }

    const canvasAspect = canvasW / canvasH;
    const contentAspect = contentW / contentH;

    const bgDepth = 19;
    const bgFovRad = (cam.fov * Math.PI) / 360;
    const bgVisibleHeight = 2 * bgDepth * Math.tan(bgFovRad);
    const bgVisibleWidth = bgVisibleHeight * canvasAspect;

    let planeW = bgVisibleWidth;
    let planeH = bgVisibleHeight;

    if (canvasAspect > contentAspect) {
      planeH = bgVisibleWidth / contentAspect;
    } else {
      planeW = bgVisibleHeight * contentAspect;
    }

    bgPlane.scale.set(planeW, planeH, 1);

    if (fgPlane) {
      const fgDepth = 18.0;
      const factor = fgDepth / bgDepth;
      fgPlane.scale.set(planeW * factor, planeH * factor, 1);
    }
  }, []);

  // ── Camera helpers ──────────────────────────────────────────
  const createFallbackTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;
    
    const grad = ctx.createLinearGradient(0, 0, 640, 360);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 360);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷', 320, 150);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 18px sans-serif';
    ctx.fillText('Camera feed not available', 320, 210);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('Please check your webcam permissions or connection.', 320, 240);

    const texture = new THREE.CanvasTexture(canvas);
    fallbackTextureRef.current = texture;
    return texture;
  };

  const handleBackgroundModeUpdate = useCallback(() => {
    const mode = useSessionStore.getState().backgroundMode;
    const imgUrl = useSessionStore.getState().backgroundImageUrl;
    const videoUrl = useSessionStore.getState().backgroundVideoUrl;
    const bgMat = bgMaterialRef.current;

    if (!bgMat) return;

    if (bgVideoElementRef.current) {
      bgVideoElementRef.current.pause();
      bgVideoElementRef.current.src = '';
      bgVideoElementRef.current = null;
    }
    bgVideoTextureRef.current = null;

    if (mode === 'image' && imgUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(imgUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        bgImageTextureRef.current = texture;
        bgMat.uniforms.uTexture.value = texture;
        updateBgPlaneScale();
      }, undefined, (err) => {
        console.warn('Failed to load background image:', err);
      });
    } else if (mode === 'video' && videoUrl) {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      bgVideoElementRef.current = video;

      video.onloadedmetadata = () => {
        video.play().then(() => {
          const texture = new THREE.VideoTexture(video);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          bgVideoTextureRef.current = texture;
          bgMat.uniforms.uTexture.value = texture;
          updateBgPlaneScale();
        }).catch((err) => console.warn('Background video play failed:', err));
      };
    } else {
      if (videoElementRef.current && videoElementRef.current.srcObject) {
        const texture = new THREE.VideoTexture(videoElementRef.current);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        bgMat.uniforms.uTexture.value = texture;
        updateBgPlaneScale();
      } else {
        const fallback = fallbackTextureRef.current || createFallbackTexture();
        bgMat.uniforms.uTexture.value = fallback;
        updateBgPlaneScale();
      }
    }
  }, [updateBgPlaneScale]);

  // ── Camera helpers ──────────────────────────────────────────
  const startCameraFeed = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.onloadedmetadata = () => {
          videoElementRef.current?.play().then(() => {
            handleBackgroundModeUpdate();
          }).catch(err => console.warn('Video play deferred or blocked:', err));
        };
      }
    } catch (err) {
      console.warn('Camera not available (permission denied or no camera):', err);
      handleBackgroundModeUpdate();
    }
  }, [handleBackgroundModeUpdate]);

  const stopCameraFeed = useCallback(() => {
    if (videoElementRef.current) {
      const stream = videoElementRef.current.srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log(`Stopped camera track: ${track.label}`);
        });
      }
      videoElementRef.current.srcObject = null;
    }
  }, []);

  // ── Load GLB model or render procedural fallback ───────────
  const loadGLBModel = useCallback(async (char: Character, targetScene: THREE.Scene) => {
    if (!targetScene) return;

    // Remove old character group
    if (charGroupRef.current) {
      targetScene.remove(charGroupRef.current);
      charGroupRef.current = null;
    }

    // Clean up mixer and actions
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }
    idleActionRef.current = null;
    talkActionRef.current = null;

    const currentPos = useSessionStore.getState().characterPosition;
    const currentScale = useSessionStore.getState().characterScale;
    const currentRot = useSessionStore.getState().characterRotation;

    // 1. Setup Three.js Caching
    THREE.Cache.enabled = true;

    const baseModelPath = char.modelFile || `/models/${char.id}.glb`;
    const modelPath = `${baseModelPath}?t=${Date.now()}`;
    let gltfLoaded = false;

    try {
      console.log(`GLTFLoader: Attempting to load model from ${modelPath}...`);
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
      const { KTX2Loader } = await import('three/examples/jsm/loaders/KTX2Loader.js');

      const loader = new GLTFLoader();

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(dracoLoader);

      if (rendererRef.current) {
        const ktx2Loader = new KTX2Loader();
        ktx2Loader.setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/');
        ktx2Loader.detectSupport(rendererRef.current);
        loader.setKTX2Loader(ktx2Loader);
      }

      const gltf = await loader.loadAsync(modelPath);
      const model = gltf.scene;
      model.name = `char_glb_${char.id}`;

      // 2. Fetch Metadata Configs
      let meta: any = {};
      let expressions: any = {};
      let visemes: any = {};

      let metaPath = `/models/${char.id}.meta.json`;
      let exprPath = `/models/${char.id}.expressions.json`;
      let visPath = `/models/${char.id}.visemes.json`;

      if (char.modelFile && char.modelFile.includes('/models/ai-generated/')) {
        const lastSlash = char.modelFile.lastIndexOf('/');
        if (lastSlash !== -1) {
          const baseDir = char.modelFile.substring(0, lastSlash);
          metaPath = `${baseDir}/.meta.json`;
          exprPath = `${baseDir}/.expressions.json`;
          visPath = `${baseDir}/.visemes.json`;
        }
      }

      try { const res = await fetch(metaPath); if (res.ok) meta = await res.json(); } catch(e) {}
      try { const res = await fetch(exprPath); if (res.ok) expressions = await res.json(); } catch(e) {}
      try { const res = await fetch(visPath); if (res.ok) visemes = await res.json(); } catch(e) {}
      
      model.userData.meta = meta;
      model.userData.expressions = expressions;
      model.userData.visemes = visemes;

      // 3. Rig Health Checker & Configuration
      let hasJaw = false;
      let hasEyes = false;
      let morphCount = 0;
      let boneCount = 0;
      const meshes: THREE.Mesh[] = [];

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          meshes.push(child as THREE.Mesh);
          const mesh = child as THREE.Mesh;
          if (mesh.morphTargetDictionary) {
             morphCount += Object.keys(mesh.morphTargetDictionary).length;
             const dict = mesh.morphTargetDictionary;
             if (dict['jawOpen'] !== undefined || dict['viseme_aa'] !== undefined || dict['mouthOpen'] !== undefined) hasJaw = true;
             if (dict['blinkLeft'] !== undefined || dict['eyeBlinkLeft'] !== undefined) hasEyes = true;
          }
        }
        if ((child as THREE.Bone).isBone) {
           boneCount++;
           const n = child.name.toLowerCase();
           if (n.includes('jaw')) hasJaw = true;
           if (n.includes('eye')) hasEyes = true;
        }
      });

      model.userData.isStaticModel = (boneCount === 0);
      console.log(`GLTFLoader: Rig Health - Bone count = ${boneCount}, isStaticModel = ${model.userData.isStaticModel}`);

      if (!hasJaw && boneCount > 0) console.warn(`Rig Health: Missing jaw bone or morphs in ${modelPath}`);
      if (!hasEyes && boneCount > 0) console.warn(`Rig Health: Missing eye bones or blink morphs in ${modelPath}`);
      if (morphCount === 0 && boneCount > 0) console.warn(`Rig Health: Zero blendshapes found in ${modelPath}. Lip sync will fail.`);

      // Convert Specular-Glossiness materials to Standard if needed
      await Promise.all(meshes.map(async (mesh) => {
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        
        for (let i = 0; i < materials.length; i++) {
          const mat = materials[i];
          if (!mat) continue;

          // Find glTF material definition index
          const assoc = gltf.parser.associations.get(mat);
          if (assoc && assoc.materials !== undefined) {
            const matIdx = assoc.materials;
            const matDef = gltf.parser.json.materials[matIdx];
            
            if (matDef && matDef.extensions && matDef.extensions.KHR_materials_pbrSpecularGlossiness) {
              console.log(`GLTFLoader: Converting Specular-Glossiness material for mesh ${mesh.name}...`);
              const specGloss = matDef.extensions.KHR_materials_pbrSpecularGlossiness;
              
              // Create standard material
              const standardMat = new THREE.MeshStandardMaterial({
                roughness: 0.8,
                metalness: 0.1,
                transparent: mat.transparent,
                opacity: mat.opacity,
                side: mat.side,
                depthWrite: mat.depthWrite,
                depthTest: mat.depthTest,
              });

              // Diffuse texture
              if (specGloss.diffuseTexture !== undefined) {
                try {
                  const tex = await gltf.parser.getDependency('texture', specGloss.diffuseTexture.index);
                  if (tex) {
                    tex.colorSpace = THREE.SRGBColorSpace;
                    standardMat.map = tex;
                  }
                } catch (e) {
                  console.warn("Failed to load diffuse texture:", e);
                }
              }

              // Normal texture
              if (matDef.normalTexture !== undefined) {
                try {
                  const tex = await gltf.parser.getDependency('texture', matDef.normalTexture.index);
                  if (tex) {
                    standardMat.normalMap = tex;
                    if (matDef.normalTexture.scale !== undefined) {
                      standardMat.normalScale.setScalar(matDef.normalTexture.scale);
                    }
                  }
                } catch (e) {
                  console.warn("Failed to load normal texture:", e);
                }
              }

              // Occlusion texture
              if (matDef.occlusionTexture !== undefined) {
                try {
                  const tex = await gltf.parser.getDependency('texture', matDef.occlusionTexture.index);
                  if (tex) {
                    standardMat.aoMap = tex;
                    if (matDef.occlusionTexture.strength !== undefined) {
                      standardMat.aoMapIntensity = matDef.occlusionTexture.strength;
                    }
                  }
                } catch (e) {
                  console.warn("Failed to load occlusion texture:", e);
                }
              }

              // Roughness / Glossiness map fallback
              if (specGloss.specularGlossinessTexture !== undefined) {
                try {
                  const tex = await gltf.parser.getDependency('texture', specGloss.specularGlossinessTexture.index);
                  if (tex) {
                    standardMat.roughnessMap = tex;
                    standardMat.metalnessMap = tex;
                  }
                } catch (e) {
                  console.warn("Failed to load specular glossiness texture:", e);
                }
              }

              // Diffuse color factor
              if (specGloss.diffuseFactor !== undefined) {
                standardMat.color.fromArray(specGloss.diffuseFactor);
              }

              // Apply material
              if (Array.isArray(mesh.material)) {
                mesh.material[i] = standardMat;
              } else {
                mesh.material = standardMat;
              }
            } else {
              // Standard Metallic-Roughness: apply default roughness correction
              const stdMat = mat as THREE.MeshStandardMaterial;
              if (stdMat.roughness !== undefined) {
                stdMat.roughness = Math.max(0.2, stdMat.roughness);
              }
            }
          }
        }
      }));

      // 4. Transform & Scale Setup (Height Normalization via Meta)
      const targetHeight = meta.height || 1.7;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const rawHeight = size.y || 1;
      const scaleFactor = targetHeight / rawHeight;
      
      model.userData.scaleFactor = scaleFactor;
      
      model.position.set(currentPos.x, currentPos.y, currentPos.z);
      model.rotation.set(currentRot.x, currentRot.y, currentRot.z);
      model.scale.setScalar(currentScale * scaleFactor);
      
      targetScene.add(model);
      charGroupRef.current = model;
      gltfLoaded = true;

      // 5. Setup Animation Rig / External Animation Loader
      const mixer = new THREE.AnimationMixer(model);
      mixerRef.current = mixer;

      const animationClips = [...gltf.animations];
      
      try {
         const animLoader = new GLTFLoader();
         animLoader.setDRACOLoader(dracoLoader);
         const [idleAnim, talkAnim] = await Promise.allSettled([
            animLoader.loadAsync('/animations/idle.glb'),
            animLoader.loadAsync('/animations/talk.glb')
         ]);
         if (idleAnim.status === 'fulfilled' && idleAnim.value.animations.length) animationClips.push(...idleAnim.value.animations);
         if (talkAnim.status === 'fulfilled' && talkAnim.value.animations.length) animationClips.push(...talkAnim.value.animations);
      } catch (e) {
         console.warn("Could not load external animations:", e);
      }

      if (animationClips.length > 0) {
        console.log(`GLTFLoader: Found ${animationClips.length} animations combined.`);
        const idleClip = animationClips.find((c) => c.name.toLowerCase().includes('idle') || c.name.toLowerCase().includes('breath')) || animationClips[0];
        const talkClip = animationClips.find((c) => c.name.toLowerCase().includes('talk') || c.name.toLowerCase().includes('explain') || c.name.toLowerCase().includes('gesture'));

        if (idleClip) {
          const action = mixer.clipAction(idleClip);
          action.play();
          idleActionRef.current = action;
        }
        if (talkClip) {
          const action = mixer.clipAction(talkClip);
          talkActionRef.current = action;
        }
      }

      console.log(`GLTFLoader: Successfully loaded model & setup realism rig for ${char.name}`);
    } catch (err) {
      console.warn(`GLTFLoader: Failed to load ${modelPath}, triggering Recovery Layer. Error:`, err);
    }

    // 6. Recovery Layer (Procedural Fallback)
    if (!gltfLoaded) {
      console.log(`ARScene: Rendering procedural 3D model fallback for ${char.name}`);
      const group = buildCharacterMesh(char);
      group.position.set(currentPos.x, currentPos.y, currentPos.z);
      group.rotation.set(currentRot.x, currentRot.y, currentRot.z);
      targetScene.add(group);
      charGroupRef.current = group;
    }
    
    // Add shadow grounding (radial soft shadow)
    if (charGroupRef.current) {
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const ctx = shadowCanvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, 'rgba(0,0,0,0.5)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
      }
      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadowGeo = new THREE.PlaneGeometry(1.5, 1.5);
      const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.02;
      shadow.name = 'groundShadow';
      charGroupRef.current.add(shadow);
    }
    
    setModelLoaded((prev) => prev + 1);
  }, []);

  // ── Bootstrap Three.js ──────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const W = container.clientWidth  || window.innerWidth;
    const H = container.clientHeight || window.innerHeight;

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (err) {
      console.error('WebGLRenderer initialization failed:', err);
      setWebGLError(true);
      return;
    }
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.zIndex = '1';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    onCanvasReady?.(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;
    setSceneReady(scene);

    // Three.js camera
    const cam = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
    cam.position.set(0, 0, 0);
    cameraRef.current = cam;

    // ── GPU Shaded Background Plane ───────────────────────────
    const bgPlaneGeo = new THREE.PlaneGeometry(1, 1);
    const bgMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uOpacity: { value: 1.0 },
        uBlur: { value: 0.0 },
        uMirror: { value: 1.0 },
        uOffset: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uOpacity;
        uniform float uBlur;
        uniform float uMirror;
        uniform vec2 uOffset;
        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;
          if (uMirror > 0.5) {
            uv.x = 1.0 - uv.x;
          }
          uv += uOffset;

          if (uBlur < 0.05) {
            vec4 texColor = texture2D(uTexture, uv);
            gl_FragColor = vec4(texColor.rgb, texColor.a * uOpacity);
          } else {
            vec4 sum = vec4(0.0);
            float step = uBlur * 0.002;
            
            sum += texture2D(uTexture, uv + vec2(-step, -step)) * 0.094;
            sum += texture2D(uTexture, uv + vec2(0.0, -step)) * 0.118;
            sum += texture2D(uTexture, uv + vec2(step, -step)) * 0.094;
            
            sum += texture2D(uTexture, uv + vec2(-step, 0.0)) * 0.118;
            sum += texture2D(uTexture, uv + vec2(0.0, 0.0)) * 0.148;
            sum += texture2D(uTexture, uv + vec2(step, 0.0)) * 0.118;
            
            sum += texture2D(uTexture, uv + vec2(-step, step)) * 0.094;
            sum += texture2D(uTexture, uv + vec2(0.0, step)) * 0.118;
            sum += texture2D(uTexture, uv + vec2(step, step)) * 0.094;
            
            gl_FragColor = vec4(sum.rgb, sum.a * uOpacity);
          }
        }
      `,
      depthWrite: false,
      depthTest: false
    });
    const bgPlane = new THREE.Mesh(bgPlaneGeo, bgMaterial);
    bgPlane.position.set(0, 0, -19);
    bgPlane.renderOrder = -1; // Draw behind everything
    scene.add(bgPlane);
    bgMaterialRef.current = bgMaterial;
    bgPlaneRef.current = bgPlane;

    // ── GPU Shaded Foreground Plane ───────────────────────────
    const fgPlaneGeo = new THREE.PlaneGeometry(1, 1);
    const fgMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uOpacity: { value: 1.0 },
        uMirror: { value: 1.0 },
        uOffset: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uOpacity;
        uniform float uMirror;
        uniform vec2 uOffset;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv;
          if (uMirror > 0.5) {
            uv.x = 1.0 - uv.x;
          }
          uv += uOffset;
          vec4 texColor = texture2D(uTexture, uv);
          gl_FragColor = vec4(texColor.rgb, texColor.a * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true
    });
    const fgPlane = new THREE.Mesh(fgPlaneGeo, fgMaterial);
    fgPlane.position.set(0, 0, -18.0); // z = -18.0 behind character (z = -3) but in front of background (z = -19)
    fgPlane.renderOrder = 1; // Draw behind character
    scene.add(fgPlane);
    fgPlaneRef.current = fgPlane;

    // ── Lighting & LOD System ─────────────────────────────────
    const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xfff4e0, 1.4);
    key.position.set(2, 4, 3); 
    key.castShadow = true;
    
    // LOD: Adjust Shadow Map Resolution
    key.shadow.mapSize.width = isMobile ? 512 : 2048;
    key.shadow.mapSize.height = isMobile ? 512 : 2048;
    key.shadow.bias = -0.0001;

    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8199fb, 0.5);
    fill.position.set(-2, 2, -1); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    rim.position.set(0, 3, -4); scene.add(rim);

    // ── Grid floor ────────────────────────────────────────────
    const grid = new THREE.GridHelper(8, 16, 0x6278f8, 0x1e2340);
    grid.position.y = -1.9;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    scene.add(grid);
    gridRef.current = grid;

    // ── Floor Reticle (Edit mode centering helper) ────────────
    const reticleGeo = new THREE.RingGeometry(0.45, 0.5, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.rotation.x = Math.PI / 2;
    reticle.position.y = -1.89;
    scene.add(reticle);
    floorReticleRef.current = reticle;

    // ── TransformControls Setup ───────────────────────────────
    let tControls: any = null;
    let tcCleanup = () => {};
    import('three/examples/jsm/controls/TransformControls.js').then(({ TransformControls }) => {
      if (!rendererRef.current || !cameraRef.current) return;
      tControls = new TransformControls(cameraRef.current, rendererRef.current.domElement);
      tControls.size = 0.85;
      scene.add(tControls);
      transformControlsRef.current = tControls;

      tControls.addEventListener('dragging-changed', (event: any) => {
        isDraggingRef.current = event.value;
      });

      tControls.addEventListener('objectChange', () => {
        const target = tControls.object;
        if (target) {
          useSessionStore.getState().setCharacterPosition({
            x: target.position.x,
            y: target.position.y,
            z: target.position.z,
          });
          useSessionStore.getState().setCharacterRotation({
            x: target.rotation.x,
            y: target.rotation.y,
            z: target.rotation.z,
          });
          const factor = target.userData.scaleFactor || 1;
          useSessionStore.getState().setCharacterScale(target.scale.x / factor);
        }
      });

      // Handle lock/unlock in inner context
      const isL = useSessionStore.getState().isPlacementLocked;
      const mode = useSessionStore.getState().placementMode;
      const tMode = useSessionStore.getState().transformMode;
      if (mode === 'edit' && !isL && charGroupRef.current) {
        tControls.attach(charGroupRef.current);
        tControls.setMode(tMode);
        tControls.visible = true;
        tControls.enabled = true;
      } else {
        tControls.detach();
        tControls.visible = false;
        tControls.enabled = false;
      }

      tcCleanup = () => {
        if (tControls) {
          tControls.dispose();
          scene.remove(tControls);
        }
      };
    });

    // ── Resize Observer ──
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      const newAspect = w / h;
      cam.aspect = newAspect;
      cam.updateProjectionMatrix();
      renderer.setSize(w, h);
      updateBgPlaneScale();
    });
    resizeObserver.observe(container);

    // ── Render loop ───────────────────────────────────────────
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      const t = Date.now();

      mixerRef.current?.update(delta);

      const isEditMode = useSessionStore.getState().placementMode === 'edit';
      const currentPos = useSessionStore.getState().characterPosition;
      const currentScale = useSessionStore.getState().characterScale;
      const currentRot = useSessionStore.getState().characterRotation;

      // Update Floor Reticle position and visibility
      if (floorReticleRef.current) {
        floorReticleRef.current.position.set(currentPos.x, -1.89, currentPos.z);
        floorReticleRef.current.visible = isEditMode;
      }

      // process segmenter
      const isMPActive = useSessionStore.getState().cameraEnabled && 
                          useSessionStore.getState().showSelfieSegmentation && 
                          selfieSegLoaded;
      if (isMPActive && selfieSegmentationRef.current && videoElementRef.current && !videoElementRef.current.paused) {
        const nowMs = Date.now();
        if (nowMs - lastProcessedTimeRef.current > 40) {
          lastProcessedTimeRef.current = nowMs;
          selfieSegmentationRef.current.send({ image: videoElementRef.current }).catch(() => {});
        }
      }

      // ── Visually Realistic Idle & Speaking Animation System ──
      if (charGroupRef.current) {
        const storeState = useSessionStore.getState();
        const mood = storeState.mood || 'calm';
        const isSpeakingNow = storeState.isSpeaking;
        
        // Hide feet ring in presentation mode
        charGroupRef.current.traverse((child) => {
          if (child.name === 'feetRing') {
            child.visible = isEditMode;
          }
        });
        
        const nowMs = Date.now();
        const tSec = t * 0.001;
        const cur = currentExpressionWeightsRef.current;
        const charData = charGroupRef.current.userData;

        // --- Frame Update: State Read & Animation State Setup ---
        // Animation States: 'idle', 'listening', 'thinking', 'speaking', 'reacting'
        let animState = 'idle';
        if (isSpeakingNow) animState = 'speaking';
        else if (storeState.activeExpression === 'thinking') animState = 'thinking';
        else if (storeState.activeExpression === 'confused' || storeState.activeExpression === 'excited') animState = 'reacting';
        
        // Interrupt Reset (User asked a new question -> rapid transition)
        if (animState === 'thinking' && charData.lastState !== 'thinking') {
           // Reset micro reactions
           charData.nextTwitchTime = nowMs + 1000;
           // Gaze force reset
           isGazeShiftedRef.current = false;
           nextGazeShiftTimeRef.current = nowMs + 500;
        }
        charData.lastState = animState;

        // Audio Energy & Speech Pause Simulation
        const mouthOpenAmt = storeState.faceMorphs.mouthOpen || storeState.mouthOpenAmount || 0;
        let speechEnergy = 0;
        let isPaused = false;

        if (animState === 'speaking') {
           speechEnergy = mouthOpenAmt * 2.0; // Simulated RMS
           if (speechEnergy < 0.05) {
             // Heuristic for punctuation/pause: low mouth open while speaking
             if (!charData.pauseStart) charData.pauseStart = nowMs;
             if (nowMs - charData.pauseStart > 300) isPaused = true;
           } else {
             charData.pauseStart = 0;
           }
        }
        
        // --- 1. Separate Morph Layers ---
        const baseMorphs = { smileLeft: 0, smileRight: 0, browInnerUp: 0, browDown: 0, lipsPress: 0, headTilt: 0 };
        
        if (mood === 'calm') {
          baseMorphs.smileLeft = 0.15; baseMorphs.smileRight = 0.15;
        } else if (mood === 'energetic') {
          baseMorphs.smileLeft = 0.45; baseMorphs.smileRight = 0.45; baseMorphs.browInnerUp = 0.2;
        } else if (mood === 'funny') {
          baseMorphs.smileLeft = 0.5; baseMorphs.smileRight = 0.2; baseMorphs.browInnerUp = 0.4; baseMorphs.headTilt = 0.1;
        } else if (mood === 'serious') {
          baseMorphs.lipsPress = 0.5; baseMorphs.browDown = 0.6;
        } else if (mood === 'inspiring') {
          baseMorphs.smileLeft = 0.3; baseMorphs.smileRight = 0.3; baseMorphs.browInnerUp = 0.2;
        }

        const speechMorphs = { smileLeft: 0, smileRight: 0, browInnerUp: 0 };
        if (animState === 'speaking') {
           speechMorphs.smileLeft = speechEnergy * 0.5;
           speechMorphs.smileRight = speechEnergy * 0.5;
           speechMorphs.browInnerUp = speechEnergy * 0.3;
        }

        const microMorphs = { browInnerUp: 0, headTilt: 0 };
        if (!charData.nextTwitchTime) charData.nextTwitchTime = nowMs + 4000;
        if (nowMs > charData.nextTwitchTime) {
           charData.nextTwitchTime = nowMs + 4000 + Math.random() * 5000;
           if (Math.random() > 0.6) charData.twitchBrow = 0.4;
           if (Math.random() > 0.5) charData.twitchTilt = (Math.random() - 0.5) * 0.15;
        }
        if (charData.twitchBrow) {
           charData.twitchBrow *= 0.9; // decay
           microMorphs.browInnerUp = charData.twitchBrow;
        }
        if (charData.twitchTilt) {
           charData.twitchTilt *= 0.95;
           microMorphs.headTilt = charData.twitchTilt;
        }

        // Advanced Blink Engine
        let blinkVal = 0;
        if (!charData.nextBlinkTime) charData.nextBlinkTime = nowMs + 3000;
        
        // Trigger blink on pause
        if (isPaused && !charData.blinkedDuringPause) {
           charData.isBlinking = true;
           charData.blinkStartTime = nowMs;
           charData.blinkedDuringPause = true;
        } else if (!isPaused) {
           charData.blinkedDuringPause = false;
        }

        if (nowMs > charData.nextBlinkTime) {
           charData.isBlinking = true;
           charData.blinkStartTime = nowMs;
           let interval = 2800 + Math.random() * 3700;
           if (animState === 'thinking') interval -= 1000;
           if (mood === 'energetic') interval += 1500;
           charData.nextBlinkTime = nowMs + interval;
        }

        if (charData.isBlinking) {
           const blinkElapsed = nowMs - charData.blinkStartTime;
           const blinkDur = 160;
           if (blinkElapsed < blinkDur) {
              blinkVal = Math.sin((blinkElapsed / blinkDur) * Math.PI);
           } else {
              charData.isBlinking = false;
           }
        }

        // Blend Morph Layers
        const finalMorphs = {
           smileLeft: Math.min(1, baseMorphs.smileLeft + speechMorphs.smileLeft),
           smileRight: Math.min(1, baseMorphs.smileRight + speechMorphs.smileRight),
           browInnerUp: Math.min(1, baseMorphs.browInnerUp + speechMorphs.browInnerUp + microMorphs.browInnerUp),
           browDown: Math.min(1, baseMorphs.browDown),
           lipsPress: Math.min(1, baseMorphs.lipsPress),
           headTilt: baseMorphs.headTilt + microMorphs.headTilt,
           blink: blinkVal
        };

        const lerpSpeed = 5.0;
        cur.smileLeft += (finalMorphs.smileLeft - cur.smileLeft) * delta * lerpSpeed;
        cur.smileRight += (finalMorphs.smileRight - cur.smileRight) * delta * lerpSpeed;
        cur.browInnerUp += (finalMorphs.browInnerUp - cur.browInnerUp) * delta * lerpSpeed;
        cur.browDown += (finalMorphs.browDown - cur.browDown) * delta * lerpSpeed;
        cur.lipsPress += (finalMorphs.lipsPress - cur.lipsPress) * delta * lerpSpeed;
        cur.headTilt += (finalMorphs.headTilt - cur.headTilt) * delta * lerpSpeed;

        const scaleFactor = charGroupRef.current.userData.scaleFactor || 1;

        // Position Lock in Edit Mode vs Root Sway in Presentation Mode
        if (isEditMode) {
          charGroupRef.current.position.set(currentPos.x, currentPos.y, currentPos.z);
          charGroupRef.current.scale.setScalar(currentScale * scaleFactor);
          charGroupRef.current.rotation.set(currentRot.x, currentRot.y, currentRot.z);
        } else if (!isDraggingRef.current) {
          charGroupRef.current.position.set(currentPos.x, currentPos.y, currentPos.z);
          charGroupRef.current.scale.setScalar(currentScale * scaleFactor);
          charGroupRef.current.rotation.set(currentRot.x, currentRot.y, currentRot.z);
        }

        // --- 2. Breathing & Body Motion (Floor Lock) ---
        // Root stays static, spine rotates
        const breatheSpeed = animState === 'speaking' ? (isPaused ? 1.5 : 2.5) : (mood === 'energetic' ? 1.8 : 1.2);
        const breatheIntensity = animState === 'speaking' ? (isPaused ? 0.015 : 0.008) : (mood === 'energetic' ? 0.012 : 0.008);
        const breathY = Math.sin(tSec * breatheSpeed) * breatheIntensity;

        const swaySpeedX = mood === 'energetic' ? 0.8 : mood === 'serious' ? 0.3 : 0.5;
        const swayAmtX = mood === 'energetic' ? 0.03 : mood === 'serious' ? 0.008 : 0.015;
        const swayAngleZ = Math.sin(tSec * swaySpeedX) * swayAmtX * (1 + speechEnergy * 0.5);

        // --- Procedural Animation for Static / Unrigged Models ---
        if (charGroupRef.current.userData.isStaticModel) {
          // 1. Gentle breathing bob (vertical position)
          charGroupRef.current.position.y += breathY * 1.5;
          
          // 2. Gentle breathing chest/body scale expansion
          const breatheScale = 1 + breathY * 0.4;
          charGroupRef.current.scale.setScalar(currentScale * scaleFactor * breatheScale);
          
          // 3. Speaking bob & rumble (forward pitch + side vibration + down-bob + forward thrust)
          if (animState === 'speaking') {
            // Forward tilt proportional to mouth amplitude
            charGroupRef.current.rotation.x += mouthOpenAmt * 0.12;
            // Vocal shake/growl rumble (side-to-side rotation)
            charGroupRef.current.rotation.y += Math.sin(tSec * 35) * 0.02 * mouthOpenAmt;
            // Down-bob and forward thrust
            charGroupRef.current.position.y -= mouthOpenAmt * 0.03;
            charGroupRef.current.position.z += mouthOpenAmt * 0.05;
          }
          
          // 4. Idle body sway
          charGroupRef.current.rotation.z += swayAngleZ * 0.7;
          charGroupRef.current.rotation.y += Math.sin(tSec * swaySpeedX * 0.5) * swayAmtX * 0.5;
        }

        const spineBone = charGroupRef.current.getObjectByName('Spine') || charGroupRef.current.getObjectByName('spine') || charGroupRef.current.getObjectByName('spine_01') || charGroupRef.current.getObjectByName('torsoMesh');
        if (spineBone) {
           spineBone.rotation.z = swayAngleZ;
           // If procedural mesh:
           if (spineBone.name === 'torsoMesh') {
              const scaleVal = 1 + breathY * 2;
              spineBone.scale.set(scaleVal, 1, scaleVal);
              spineBone.position.y = spineBone.userData.baseY !== undefined ? spineBone.userData.baseY + breathY : breathY;
           } else {
              // It's a bone, rotate it
              spineBone.rotation.x = Math.sin(tSec * breatheSpeed * 0.5) * 0.02;
           }
        }
        
        // --- 3. Look-at Smoothing ---
        const leftEye = charGroupRef.current.getObjectByName('leftEyeGroup') || charGroupRef.current.getObjectByName('LeftEye') || charGroupRef.current.getObjectByName('leftEye') || charGroupRef.current.getObjectByName('EyeLeft');
        const rightEye = charGroupRef.current.getObjectByName('rightEyeGroup') || charGroupRef.current.getObjectByName('RightEye') || charGroupRef.current.getObjectByName('rightEye') || charGroupRef.current.getObjectByName('EyeRight');
        
        if (!isGazeShiftedRef.current && nowMs > nextGazeShiftTimeRef.current) {
          isGazeShiftedRef.current = true;
          gazeShiftEndTimeRef.current = nowMs + 1000 + Math.random() * 1000;
          if (animState === 'speaking' && Math.random() > 0.2) {
            gazeShiftOffsetRef.current = { x: 0, y: 0 };
          } else {
            const rx = (Math.random() - 0.5) * 0.3;
            const ry = (Math.random() - 0.5) * 0.2;
            gazeShiftOffsetRef.current = { x: rx, y: ry };
          }
        } else if (isGazeShiftedRef.current && nowMs > gazeShiftEndTimeRef.current) {
          isGazeShiftedRef.current = false;
          nextGazeShiftTimeRef.current = nowMs + 3000 + Math.random() * 3000;
          if (animState === 'thinking') {
             gazeShiftOffsetRef.current = { x: 0.15, y: 0.2 };
          } else {
             gazeShiftOffsetRef.current = { x: 0, y: 0 };
          }
        }

        if (leftEye && rightEye) {
          [leftEye, rightEye].forEach(eye => {
             const activeYaw = gazeShiftOffsetRef.current.x;
             const activePitch = gazeShiftOffsetRef.current.y;
             eye.rotation.y = THREE.MathUtils.lerp(eye.rotation.y, activeYaw, delta * 2);
             eye.rotation.x = THREE.MathUtils.lerp(eye.rotation.x, activePitch, delta * 2);
          });
        }

        // --- 4. Head Motion System (Audio Energy Mapped) ---
        const headBoneName = charData.meta?.headBone;
        const headBone = (headBoneName ? charGroupRef.current.getObjectByName(headBoneName) : null) || charGroupRef.current.getObjectByName('headGroup') || charGroupRef.current.getObjectByName('Head') || charGroupRef.current.getObjectByName('head') || charGroupRef.current.getObjectByName('HeadTop_End');
        if (headBone) {
          // Tiny nod reset on pause
          if (isPaused) {
             if (!charData.noddedDuringPause) {
                charData.targetNod = 0.08;
                charData.noddedDuringPause = true;
             }
          } else {
             charData.noddedDuringPause = false;
             charData.targetNod = Math.sin(tSec * (animState === 'speaking' ? 3.0 : 1.0)) * (animState === 'speaking' ? 0.02 * (1 + speechEnergy*3) : 0.01);
          }
          if (charData.targetNod) {
             headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, charData.targetNod, delta * 5);
          }
          
          const tiltSpeed = animState === 'speaking' ? 2.0 : 0.8;
          const tiltAmp = animState === 'speaking' ? 0.03 * (1 + speechEnergy) : 0.01;
          const targetRotY = Math.sin(tSec * tiltSpeed) * tiltAmp;
          const targetRotZ = cur.headTilt + Math.sin(tSec * 1.5) * 0.02;

          headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, targetRotY, delta * 4);
          headBone.rotation.z = THREE.MathUtils.lerp(headBone.rotation.z, targetRotZ, delta * 4);
        }

        // --- 5. Shoulder Motion (Lower on Pause) ---
        const leftShoulder = charGroupRef.current.getObjectByName('LeftShoulder') || charGroupRef.current.getObjectByName('leftShoulder') || charGroupRef.current.getObjectByName('leftUpperArm');
        const rightShoulder = charGroupRef.current.getObjectByName('RightShoulder') || charGroupRef.current.getObjectByName('rightShoulder') || charGroupRef.current.getObjectByName('rightUpperArm');
        if (leftShoulder && rightShoulder) {
          const pauseDrop = isPaused ? -0.02 : 0;
          const shoulderRise = breathY + pauseDrop;
          if (leftShoulder.userData.baseY === undefined) leftShoulder.userData.baseY = leftShoulder.position.y;
          if (rightShoulder.userData.baseY === undefined) rightShoulder.userData.baseY = rightShoulder.position.y;
          leftShoulder.position.y = THREE.MathUtils.lerp(leftShoulder.position.y, leftShoulder.userData.baseY + shoulderRise, delta * 4);
          rightShoulder.position.y = THREE.MathUtils.lerp(rightShoulder.position.y, rightShoulder.userData.baseY + shoulderRise, delta * 4);
        }

        // --- 6. Fallback mesh sync & Morph Target Apply ---
        const leftEyelid = charGroupRef.current.getObjectByName('leftEyelid');
        const rightEyelid = charGroupRef.current.getObjectByName('rightEyelid');
        if (leftEyelid && rightEyelid) {
           leftEyelid.position.y = 0.038 - finalMorphs.blink * 0.028;
           rightEyelid.position.y = 0.038 - finalMorphs.blink * 0.028;
        }
        
        const jawBoneName = charData.meta?.jawBone;
        const jawMesh = (jawBoneName ? charGroupRef.current.getObjectByName(jawBoneName) : null) || charGroupRef.current.getObjectByName('jawMesh') || charGroupRef.current.getObjectByName('Jaw') || charGroupRef.current.getObjectByName('jaw');
        if (jawMesh && jawMesh.name === 'jawMesh') {
           jawMesh.position.y = -0.16 - mouthOpenAmt * 0.045;
        } else if (jawMesh) {
           // If it's a real bone, rotate it
           jawMesh.rotation.x = mouthOpenAmt * 0.3;
        }

        charGroupRef.current.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh && mesh.morphTargetInfluences && mesh.morphTargetDictionary) {
            const aliasMap: Record<string, string[]> = {
              mouthOpen: ['mouthOpen', 'jawOpen', 'mouth_open', 'MouthOpen', 'JawOpen', 'viseme_aa', 'jaw_drop', ...(charData.visemes?.A ? [charData.visemes.A] : [])],
              jawOpen: ['jawOpen', 'jawDrop', 'jaw_open', 'jaw_drop', 'JawOpen', 'JawDrop'],
              lipsPucker: ['mouthPucker', 'lipsPucker', 'mouthRollLower', 'mouthRollUpper', 'lips_pucker', 'LipsPucker', 'MouthPucker', 'lipsRound'],
              lipsWide: ['mouthSmileLeft', 'mouthSmileRight', 'lipsWide', 'lips_wide', 'LipsWide'],
              lipsPress: ['mouthPressLeft', 'mouthPressRight', 'lipsPress', 'lips_press', 'LipsPress'],
              smileLeft: ['mouthSmileLeft', 'smileLeft', 'smile_left', 'SmileLeft', 'Smile_L'],
              smileRight: ['mouthSmileRight', 'smileRight', 'smile_right', 'SmileRight', 'Smile_R'],
              blinkLeft: ['eyeBlinkLeft', 'blinkLeft', 'blink_left', 'BlinkLeft', 'EyeBlinkLeft', 'Blink_L'],
              blinkRight: ['eyeBlinkRight', 'blinkRight', 'blink_right', 'BlinkRight', 'EyeBlinkRight', 'Blink_R'],
              browInnerUp: ['browInnerUp', 'brow_inner_up', 'BrowInnerUp', 'browUp'],
              browDown: ['browDownLeft', 'browDownRight', 'browDown', 'brow_down', 'BrowDown'],
            };

            // Process dynamic expressions override based on mood
            if (charData.expressions && charData.expressions[mood]) {
               const exprOverrides = charData.expressions[mood];
               for (const key in exprOverrides) {
                 if (key in cur) {
                    (cur as any)[key] = exprOverrides[key];
                 }
               }
            }

            Object.keys(aliasMap).forEach((storeKey) => {
              const aliases = aliasMap[storeKey];
              let val = storeState.faceMorphs[storeKey as keyof typeof storeState.faceMorphs] || 0;
              
              if (storeKey === 'smileLeft') val = Math.max(val, cur.smileLeft);
              if (storeKey === 'smileRight') val = Math.max(val, cur.smileRight);
              if (storeKey === 'browInnerUp') val = Math.max(val, cur.browInnerUp);
              if (storeKey === 'browDown') val = Math.max(val, cur.browDown);
              if (storeKey === 'lipsPress') val = Math.max(val, cur.lipsPress);
              if (storeKey === 'blinkLeft') val = Math.max(val, finalMorphs.blink);
              if (storeKey === 'blinkRight') val = Math.max(val, finalMorphs.blink);
              if (storeKey === 'mouthOpen') val = Math.max(val, mouthOpenAmt);

              aliases.forEach((aliasName) => {
                const idx = mesh.morphTargetDictionary![aliasName];
                if (idx !== undefined) {
                  mesh.morphTargetInfluences![idx] = val;
                }
              });
            });
          }
        });
        
        // 8. Idle Micro-reactions (Random small twitches)
        if (!charGroupRef.current.userData.nextTwitchTime) charGroupRef.current.userData.nextTwitchTime = nowMs + 5000;
        if (nowMs > charGroupRef.current.userData.nextTwitchTime) {
           charGroupRef.current.userData.nextTwitchTime = nowMs + 5000 + Math.random() * 7000;
           // 30% chance for a quick brow raise or head tilt
           if (Math.random() > 0.7) {
             cur.browInnerUp = 0.5;
           } else if (Math.random() > 0.5) {
             cur.headTilt = (Math.random() - 0.5) * 0.1;
           }
        }
      }

      renderer.render(scene, cam);
    };
    animate();

    // ── Auto-start camera ─────────────────────────────────────
    startCameraFeed();

    return () => {
      cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      tcCleanup();
      stopCameraFeed();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-build character mesh when character changes or scene becomes ready ──
  useEffect(() => {
    if (!sceneReady || !character) return;
    if (character.id === prevCharId.current) return;
    prevCharId.current = character.id;

    loadGLBModel(character, sceneReady);
  }, [sceneReady, character?.id, loadGLBModel]);

  // ── Blending idle / talk animations based on speaking state ────
  useEffect(() => {
    if (!mixerRef.current) return;
    const idleAction = idleActionRef.current;
    const talkAction = talkActionRef.current;

    if (isSpeaking) {
      if (talkAction) {
        talkAction.reset();
        talkAction.setEffectiveWeight(1.0);
        talkAction.play();
        if (idleAction) talkAction.crossFadeFrom(idleAction, 0.4, true);
      }
    } else {
      if (talkAction && idleAction) {
        idleAction.reset();
        idleAction.setEffectiveWeight(1.0);
        idleAction.play();
        idleAction.crossFadeFrom(talkAction, 0.4, true);
      }
    }
  }, [isSpeaking]);

  // ── Camera enable/disable toggle ────────────────────────────
  useEffect(() => {
    if (cameraEnabled) startCameraFeed();
    else stopCameraFeed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraEnabled]);

  // ── TransformControls state synchronization ───────────────
  useEffect(() => {
    const tControls = transformControlsRef.current;
    if (!tControls) return;

    if (placementMode === 'edit' && !isPlacementLocked && charGroupRef.current) {
      tControls.attach(charGroupRef.current);
      tControls.setMode(transformMode);
      tControls.visible = true;
      tControls.enabled = true;
    } else {
      tControls.detach();
      tControls.visible = false;
      tControls.enabled = false;
    }
  }, [placementMode, isPlacementLocked, transformMode, modelLoaded, sceneReady]);

  // ── Update Shader Uniforms ────────────────────────────────
  useEffect(() => {
    if (bgMaterialRef.current) {
      bgMaterialRef.current.uniforms.uOpacity.value = cameraOpacity;
      bgMaterialRef.current.uniforms.uBlur.value = cameraBlur;
      bgMaterialRef.current.uniforms.uMirror.value = cameraMirror ? 1.0 : 0.0;
      bgMaterialRef.current.uniforms.uOffset.value.set(cameraOffset.x, cameraOffset.y);
    }
  }, [cameraOpacity, cameraBlur, cameraMirror, cameraOffset]);

  // ── Toggle camera background visibility ───────────────────
  useEffect(() => {
    if (bgPlaneRef.current) {
      bgPlaneRef.current.visible = cameraEnabled;
    }
  }, [cameraEnabled]);

  // ── Toggle grid helper visibility ─────────────────────────
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = showGrid && placementMode === 'edit';
    }
  }, [showGrid, placementMode]);

  // ── Camera Health Check and Auto-Recovery ─────────────────
  useEffect(() => {
    let lastTime = 0;
    let checkInterval: NodeJS.Timeout;

    if (cameraEnabled) {
      checkInterval = setInterval(() => {
        const video = videoElementRef.current;
        if (video && !video.paused) {
          const currTime = video.currentTime;
          if (currTime > 0 && currTime === lastTime) {
            console.warn("Camera health check: Video feed frozen! Attempting recovery...");
            stopCameraFeed();
            startCameraFeed();
          } else {
            lastTime = currTime;
          }
        }
      }, 2000);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [cameraEnabled, startCameraFeed, stopCameraFeed]);

  const onResults = useCallback((results: any) => {
    const canvas = offscreenCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (results.image && (canvas.width !== results.image.width || canvas.height !== results.image.height)) {
      canvas.width = results.image.width;
      canvas.height = results.image.height;
    }

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw mask
    ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
    
    // Overlay original image using source-in
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    
    ctx.restore();

    if (fgTextureRef.current) {
      fgTextureRef.current.needsUpdate = true;
    }
  }, []);

  // Load MediaPipe Selfie Segmentation scripts dynamically
  useEffect(() => {
    let active = true;

    const initMediaPipe = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js');
        if (!active) return;
        if ((window as any).SelfieSegmentation) {
          // Create offscreen canvas for processing
          const offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = 640;
          offscreenCanvas.height = 480;
          offscreenCanvasRef.current = offscreenCanvas;

          const fgTexture = new THREE.CanvasTexture(offscreenCanvas);
          fgTexture.colorSpace = THREE.SRGBColorSpace;
          fgTexture.minFilter = THREE.LinearFilter;
          fgTexture.magFilter = THREE.LinearFilter;
          fgTextureRef.current = fgTexture;

          const segmenter = new (window as any).SelfieSegmentation({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
          });
          segmenter.setOptions({
            modelSelection: 1,
          });
          segmenter.onResults(onResults);
          selfieSegmentationRef.current = segmenter;
          setSelfieSegLoaded(true);
          console.log('MediaPipe Selfie Segmentation loaded successfully');
        }
      } catch (err) {
        console.warn('Failed to load MediaPipe Selfie Segmentation:', err);
      }
    };

    initMediaPipe();

    return () => {
      active = false;
      if (selfieSegmentationRef.current) {
        selfieSegmentationRef.current.close();
        selfieSegmentationRef.current = null;
      }
    };
  }, [onResults]);

  // Toggle foreground plane visibility based on states
  useEffect(() => {
    if (fgPlaneRef.current) {
      fgPlaneRef.current.visible = cameraEnabled && showSelfieSegmentation && selfieSegLoaded;
    }
  }, [cameraEnabled, showSelfieSegmentation, selfieSegLoaded]);

  // Bind fgTexture to fgPlane
  useEffect(() => {
    if (fgPlaneRef.current && fgTextureRef.current) {
      const fgMat = fgPlaneRef.current.material as THREE.ShaderMaterial;
      fgMat.uniforms.uTexture.value = fgTextureRef.current;
    }
  }, [selfieSegLoaded]);

  // Sync camera options to fgPlane material
  useEffect(() => {
    if (fgPlaneRef.current) {
      const fgMat = fgPlaneRef.current.material as THREE.ShaderMaterial;
      fgMat.uniforms.uOpacity.value = cameraOpacity;
      fgMat.uniforms.uMirror.value = cameraMirror ? 1.0 : 0.0;
      fgMat.uniforms.uOffset.value.set(cameraOffset.x, cameraOffset.y);
    }
  }, [cameraOpacity, cameraMirror, cameraOffset]);

  // Listen to background mode / url changes
  useEffect(() => {
    handleBackgroundModeUpdate();
  }, [backgroundMode, backgroundImageUrl, backgroundVideoUrl, handleBackgroundModeUpdate]);

  if (webGLError) {
    return (
      <div
        className="flex items-center justify-center p-6 text-center"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          background: 'radial-gradient(circle at center, #111428, #0a0c1a)',
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          zIndex: 99,
        }}
      >
        <div
          className="glass-card max-w-md p-8 rounded-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div
            className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            <span style={{ fontSize: '28px' }}>⚠️</span>
          </div>

          <h2 className="text-xl font-bold mb-3 text-white">3D Canvas Blocked</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            EduAR requires WebGL (Hardware Acceleration) to render the 3D avatars.
          </p>

          <div
            className="text-left p-4 rounded-xl mb-6 space-y-3"
            style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
          >
            <p className="text-xs font-semibold text-indigo-300">How to fix in Chrome / Edge:</p>
            <ol className="text-xs list-decimal pl-4 space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <li>Open browser settings and search for <b>"Hardware Acceleration"</b>.</li>
              <li>Toggle <b>"Use graphics acceleration when available"</b> to <b>ON</b>.</li>
              <li>Relaunch your browser and refresh this page.</li>
            </ol>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 text-white"
            style={{
              background: 'linear-gradient(135deg, #6278f8, #4a57ed)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="ar-canvas"
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
        backgroundColor: '#0a0c1a'
      }}
    >
      <video
        ref={videoElementRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1px',
          height: '1px',
          opacity: 0.001,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// buildEinsteinMesh — creates a HIGHLY DETAILED stylized 3D avatar for Einstein
// ─────────────────────────────────────────────────────────────
function buildEinsteinMesh(character: Character): THREE.Group {
  const group = new THREE.Group();
  group.name = `char_einstein`;

  const headScale = 0.28;
  const headY = 0.65; // head center height

  // ── Materials ──────────────────────────────────────────────
  const coatColor = 0x4e3629;      // Vintage brown coat
  const trouserColor = 0x4a4a4a;   // Grey trousers
  const shirtColor = 0xf5f6f8;     // White shirt
  const skinColor = 0xe5c298;      // Natural warm skin tone
  const hairColor = 0xf5f5f5;      // Soft white/grey hair
  const tieColor = 0x8b1e1e;       // Deep red bowtie
  const shoeColor = 0x111111;      // Black shoes
  const glassesColor = 0xd4af37;   // Shiny gold spectacles frame
  const eyeScleraColor = 0xffffff; // White eyes
  const eyeIrisColor = 0x5c4033;   // Hazel/brown iris
  const eyePupilColor = 0x000000;  // Black pupil
  const buttonColor = 0xcca43b;    // Gold/bronze buttons
  const wrinkleColor = 0xd5b085;   // Slightly darker skin color for wrinkles

  const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.85, metalness: 0.05 });
  const trouserMat = new THREE.MeshStandardMaterial({ color: trouserColor, roughness: 0.75 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.5 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.95, metalness: 0.05, emissive: 0x181818 });
  const tieMat = new THREE.MeshStandardMaterial({ color: tieColor, roughness: 0.7 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.5 });
  const glassesMat = new THREE.MeshStandardMaterial({ color: glassesColor, roughness: 0.1, metalness: 1.0 });
  const scleraMat = new THREE.MeshBasicMaterial({ color: eyeScleraColor });
  const irisMat = new THREE.MeshBasicMaterial({ color: eyeIrisColor });
  const pupilMat = new THREE.MeshBasicMaterial({ color: eyePupilColor });
  const buttonMat = new THREE.MeshStandardMaterial({ color: buttonColor, roughness: 0.2, metalness: 0.95 });
  const wrinkleMat = new THREE.MeshStandardMaterial({ color: wrinkleColor, roughness: 0.6 });

  // ── Spine Rotation (Elderly Bent Posture) ──────────────────
  const spineGroup = new THREE.Group();
  spineGroup.position.set(0, -0.2, 0);
  spineGroup.rotation.x = 0.12; // lean forward slightly
  group.add(spineGroup);

  // ── Torso (Vintage Coat) ───────────────────────────────────
  const torsoGeo = new THREE.CylinderGeometry(0.22, 0.29, 0.72, 16);
  const torso = new THREE.Mesh(torsoGeo, coatMat);
  torso.name = 'torsoMesh'; // Named for breathing animation
  torso.position.y = 0.36;
  torso.castShadow = true;
  torso.receiveShadow = true;
  spineGroup.add(torso);

  // Lapels
  const lapelLGeo = new THREE.BoxGeometry(0.05, 0.32, 0.03);
  const lapelL = new THREE.Mesh(lapelLGeo, coatMat);
  lapelL.position.set(-0.1, 0.44, 0.2);
  lapelL.rotation.set(0.15, 0.15, -0.22);
  spineGroup.add(lapelL);

  const lapelR = lapelL.clone();
  lapelR.position.x = 0.1;
  lapelR.rotation.y = -0.15;
  lapelR.rotation.z = 0.22;
  spineGroup.add(lapelR);

  // Buttons
  const buttonGeo = new THREE.SphereGeometry(0.018, 8, 8);
  const buttonL1 = new THREE.Mesh(buttonGeo, buttonMat);
  buttonL1.position.set(-0.06, 0.38, 0.23);
  spineGroup.add(buttonL1);

  const buttonR1 = buttonL1.clone();
  buttonR1.position.x = 0.06;
  spineGroup.add(buttonR1);

  const buttonL2 = buttonL1.clone();
  buttonL2.position.y = 0.26;
  spineGroup.add(buttonL2);

  const buttonR2 = buttonR1.clone();
  buttonR2.position.y = 0.26;
  spineGroup.add(buttonR2);

  // ── Shirt & Collar ─────────────────────────────────────────
  const shirtGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.14, 8);
  const shirt = new THREE.Mesh(shirtGeo, shirtMat);
  shirt.position.set(0, 0.64, 0.05);
  spineGroup.add(shirt);

  // Collar left panel
  const collarLGeo = new THREE.BoxGeometry(0.06, 0.1, 0.02);
  const collarL = new THREE.Mesh(collarLGeo, shirtMat);
  collarL.position.set(-0.06, 0.65, 0.16);
  collarL.rotation.set(0.2, 0.1, -0.3);
  spineGroup.add(collarL);

  // Collar right panel
  const collarR = collarL.clone();
  collarR.position.x = 0.06;
  collarR.rotation.z = 0.3;
  spineGroup.add(collarR);

  // ── Red Bowtie ─────────────────────────────────────────────
  const bow1Geo = new THREE.ConeGeometry(0.045, 0.09, 4);
  const bow1 = new THREE.Mesh(bow1Geo, tieMat);
  bow1.rotation.z = Math.PI / 2;
  bow1.position.set(-0.035, 0.62, 0.17);
  spineGroup.add(bow1);

  const bow2 = bow1.clone();
  bow2.rotation.z = -Math.PI / 2;
  bow2.position.x = 0.035;
  spineGroup.add(bow2);

  const knotGeo = new THREE.SphereGeometry(0.018, 8, 8);
  const knot = new THREE.Mesh(knotGeo, tieMat);
  knot.position.set(0, 0.62, 0.18);
  spineGroup.add(knot);

  // ── Neck ───────────────────────────────────────────────────
  const neckGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.12, 16);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.set(0, 0.72, 0.02);
  spineGroup.add(neck);

  // ── Legs & Shoes ───────────────────────────────────────────
  const legW = 0.08;
  const legH = 0.5;
  const legGeo = new THREE.CylinderGeometry(legW, legW, legH, 8);
  
  const leftLeg = new THREE.Mesh(legGeo, trouserMat);
  leftLeg.position.set(-0.11, -0.38, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.11;
  group.add(rightLeg);

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.11, 0.08, 0.19);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(-0.11, -0.62, 0.04);
  leftShoe.castShadow = true;
  group.add(leftShoe);

  const rightShoe = leftShoe.clone();
  rightShoe.position.x = 0.11;
  group.add(rightShoe);

  // ── Coat Shoulder Yoke (Creates natural shoulder structure) ──
  const shoulderGeo = new THREE.BoxGeometry(0.48, 0.09, 0.2);
  const shoulders = new THREE.Mesh(shoulderGeo, coatMat);
  shoulders.name = 'shouldersMesh';
  shoulders.position.set(0, 0.58, 0.02);
  shoulders.castShadow = true;
  shoulders.receiveShadow = true;
  spineGroup.add(shoulders);

  // Helper geometries for hand/fingers
  const palmGeo = new THREE.SphereGeometry(0.045, 12, 12);
  const fingerGeo = new THREE.CylinderGeometry(0.008, 0.006, 0.04, 4);
  const thumbGeo = new THREE.CylinderGeometry(0.009, 0.007, 0.03, 4);

  // Helper function to build detailed, organic hand
  function createHandMesh(isLeft: boolean): THREE.Group {
    const handGroup = new THREE.Group();
    
    // Palm
    const palm = new THREE.Mesh(palmGeo, skinMat);
    palm.scale.set(1.0, 0.8, 1.2);
    palm.castShadow = true;
    handGroup.add(palm);

    // 4 fingers
    const sideSign = isLeft ? 1 : -1;
    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(fingerGeo, skinMat);
      finger.position.set(sideSign * (-0.024 + i * 0.016), -0.04, 0.02);
      finger.rotation.z = sideSign * (-0.12 + i * 0.08);
      finger.rotation.x = 0.15;
      finger.castShadow = true;
      handGroup.add(finger);
    }

    // Thumb
    const thumb = new THREE.Mesh(thumbGeo, skinMat);
    thumb.position.set(sideSign * 0.025, -0.01, 0.03);
    thumb.rotation.set(0.35, sideSign * -0.5, sideSign * -0.3);
    thumb.castShadow = true;
    handGroup.add(thumb);

    return handGroup;
  }

  // ── Left Arm Hierarchy ─────────────────────────────────────
  const leftUpperArm = new THREE.Group();
  leftUpperArm.name = 'leftUpperArm';
  leftUpperArm.position.set(-0.26, 0.54, 0.02);
  leftUpperArm.rotation.set(0.25, 0.0, -0.25); // outward & forward posture
  spineGroup.add(leftUpperArm);

  const leftUpperArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.22, 8), coatMat);
  leftUpperArmMesh.position.y = -0.11;
  leftUpperArmMesh.castShadow = true;
  leftUpperArm.add(leftUpperArmMesh);

  const leftForearm = new THREE.Group();
  leftForearm.name = 'leftForearm';
  leftForearm.position.set(0, -0.22, 0); // elbow joint
  leftForearm.rotation.set(-0.4, 0.0, 0.0); // bend forward at elbow
  leftUpperArm.add(leftForearm);

  const leftForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.18, 8), coatMat);
  leftForearmMesh.position.y = -0.09;
  leftForearmMesh.castShadow = true;
  leftForearm.add(leftForearmMesh);

  const leftHandGroup = createHandMesh(true);
  leftHandGroup.name = 'leftHand';
  leftHandGroup.position.set(0, -0.19, 0); // wrist joint
  leftHandGroup.rotation.set(0.15, 0, 0);
  leftForearm.add(leftHandGroup);

  // ── Right Arm Hierarchy ────────────────────────────────────
  const rightUpperArm = new THREE.Group();
  rightUpperArm.name = 'rightUpperArm';
  rightUpperArm.position.set(0.26, 0.54, 0.02);
  rightUpperArm.rotation.set(0.25, 0.0, 0.25); // mirrored outward/forward posture
  spineGroup.add(rightUpperArm);

  const rightUpperArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.22, 8), coatMat);
  rightUpperArmMesh.position.y = -0.11;
  rightUpperArmMesh.castShadow = true;
  rightUpperArm.add(rightUpperArmMesh);

  const rightForearm = new THREE.Group();
  rightForearm.name = 'rightForearm';
  rightForearm.position.set(0, -0.22, 0); // elbow joint
  rightForearm.rotation.set(-0.4, 0.0, 0.0); // bend forward at elbow
  rightUpperArm.add(rightForearm);

  const rightForearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.18, 8), coatMat);
  rightForearmMesh.position.y = -0.09;
  rightForearmMesh.castShadow = true;
  rightForearm.add(rightForearmMesh);

  const rightHandGroup = createHandMesh(false);
  rightHandGroup.name = 'rightHand';
  rightHandGroup.position.set(0, -0.19, 0); // wrist joint
  rightHandGroup.rotation.set(0.15, 0, 0);
  rightForearm.add(rightHandGroup);

  // ── Head (Contoured, human-like) ──────────────────────────
  const headGroup = new THREE.Group();
  headGroup.name = 'headGroup';
  headGroup.position.set(0, 0.82, 0.03);
  spineGroup.add(headGroup);

  const headGeo = new THREE.SphereGeometry(headScale, 32, 32);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.name = 'head'; // Named for lip-sync scaling
  head.scale.set(0.95, 1.15, 1.0); // Human head profile
  head.castShadow = true;
  headGroup.add(head);

  // Jaw structure (gives an organic jawline instead of a round sphere)
  const jawGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const jaw = new THREE.Mesh(jawGeo, skinMat);
  jaw.name = 'jawMesh';
  jaw.position.set(0, -0.16, 0.05);
  jaw.scale.set(0.85, 1.0, 1.15);
  jaw.castShadow = true;
  headGroup.add(jaw);

  // Cheeks contour
  const cheekGeo = new THREE.SphereGeometry(0.075, 16, 16);
  const leftCheek = new THREE.Mesh(cheekGeo, skinMat);
  leftCheek.name = 'leftCheek';
  leftCheek.position.set(-0.11, -0.05, 0.16);
  leftCheek.castShadow = true;
  headGroup.add(leftCheek);

  const rightCheek = leftCheek.clone();
  rightCheek.name = 'rightCheek';
  rightCheek.position.x = 0.11;
  headGroup.add(rightCheek);

  // ── Forehead Wrinkles ──────────────────────────────────────
  const wrinkleGeo = new THREE.TorusGeometry(headScale * 0.72, 0.007, 4, 16, Math.PI * 0.38);
  for (let i = 0; i < 3; i++) {
    const line = new THREE.Mesh(wrinkleGeo, wrinkleMat);
    line.rotation.x = -Math.PI / 4 + i * 0.14;
    line.rotation.y = Math.PI / 2;
    line.position.set(0, headScale * 0.36 + i * 0.05, headScale * 0.58);
    headGroup.add(line);
  }

  // ── Ears ───────────────────────────────────────────────────
  const earGeo = new THREE.SphereGeometry(0.06, 8, 8);
  
  const leftEar = new THREE.Mesh(earGeo, skinMat);
  leftEar.scale.set(0.5, 1.2, 0.8);
  leftEar.position.set(-headScale * 0.96, 0, -0.02);
  leftEar.rotation.y = 0.2;
  headGroup.add(leftEar);

  const rightEar = leftEar.clone();
  rightEar.position.x = headScale * 0.96;
  rightEar.rotation.y = -0.2;
  headGroup.add(rightEar);

  // ── Nose (Semi-Realistic) ──────────────────────────────────
  const noseGeo = new THREE.SphereGeometry(0.045, 8, 8);
  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.scale.set(0.8, 1.4, 1.5);
  nose.position.set(0, -0.02, headScale * 0.94);
  headGroup.add(nose);

  // ── Smile / Mouth Line ─────────────────────────────────────
  const mouthLineGeo = new THREE.TorusGeometry(0.08, 0.007, 4, 12, Math.PI * 0.45);
  const mouthLine = new THREE.Mesh(mouthLineGeo, wrinkleMat);
  mouthLine.rotation.set(Math.PI / 2, Math.PI / 2, 0);
  mouthLine.position.set(0, -0.16, headScale * 0.88);
  headGroup.add(mouthLine);

  // ── Mustache (Realistic, fluffy white) ────────────────────
  const mustGroup = new THREE.Group();
  mustGroup.position.set(0, -0.09, headScale * 0.94);
  headGroup.add(mustGroup);

  const mustPuffGeo = new THREE.SphereGeometry(0.028, 8, 8);
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const x = -0.08 + t * 0.16;
    const y = -Math.sin(t * Math.PI) * 0.03 - (t < 0.5 ? -x * 0.35 : x * 0.35);
    const z = 0.01 + Math.sin(t * Math.PI) * 0.02;

    const puff = new THREE.Mesh(mustPuffGeo, hairMat);
    puff.position.set(x, y - 0.02, z);
    puff.scale.set(1.2, 0.8, 1.0);
    puff.castShadow = true;
    mustGroup.add(puff);

    const mustStrand = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.002, 0.045 + Math.random() * 0.03, 4), hairMat);
    mustStrand.position.set(x, y - 0.04, z + 0.01);
    mustStrand.rotation.z = x * 3.2;
    mustStrand.rotation.x = 0.35;
    mustGroup.add(mustStrand);
  }

  // ── Eyes (Detailed & Organic) ──────────────────────────────
  const eyeSpread = headScale * 0.35;
  const eyeZ = headScale * 0.92;
  const eyeY = 0.05;

  const scleraGeo = new THREE.SphereGeometry(0.042, 12, 12);
  const irisGeo = new THREE.SphereGeometry(0.028, 8, 8);
  const pupilGeo = new THREE.SphereGeometry(0.016, 8, 8);
  // Box is taller (0.028) so it covers the top of the eye slightly at rest
  const eyelidGeo = new THREE.BoxGeometry(0.095, 0.028, 0.015);

  [-eyeSpread, eyeSpread].forEach((x) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.name = x < 0 ? 'leftEyeGroup' : 'rightEyeGroup';
    eyeGroup.position.set(x, eyeY, eyeZ);
    headGroup.add(eyeGroup);

    // Sclera (eyeball white)
    const sclera = new THREE.Mesh(scleraGeo, scleraMat);
    sclera.scale.set(1.1, 1.0, 1.0);
    eyeGroup.add(sclera);

    // Iris
    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.set(0, 0, 0.022);
    eyeGroup.add(iris);

    // Pupil
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(0, 0, 0.028);
    eyeGroup.add(pupil);

    // Eyelid
    const eyelid = new THREE.Mesh(eyelidGeo, skinMat);
    eyelid.name = x < 0 ? 'leftEyelid' : 'rightEyelid';
    eyelid.position.set(0, 0.038, 0.025);
    eyeGroup.add(eyelid);
  });

  // ── Round Glasses ──────────────────────────────────────────
  const frameGeo = new THREE.TorusGeometry(0.076, 0.007, 8, 24);
  
  const leftFrame = new THREE.Mesh(frameGeo, glassesMat);
  leftFrame.position.set(-eyeSpread, eyeY, eyeZ + 0.02);
  headGroup.add(leftFrame);

  const rightFrame = leftFrame.clone();
  rightFrame.position.x = eyeSpread;
  headGroup.add(rightFrame);

  // Bridge
  const bridgeGeo = new THREE.CylinderGeometry(0.006, 0.006, eyeSpread * 0.72, 8);
  const bridge = new THREE.Mesh(bridgeGeo, glassesMat);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, eyeY, eyeZ + 0.02);
  headGroup.add(bridge);

  // Temples
  const templeGeo = new THREE.CylinderGeometry(0.005, 0.005, headScale * 1.0, 8);
  const templeL = new THREE.Mesh(templeGeo, glassesMat);
  templeL.rotation.x = Math.PI / 2;
  templeL.position.set(-eyeSpread * 1.6, eyeY, headScale * 0.4);
  headGroup.add(templeL);

  const templeR = templeL.clone();
  templeR.position.x = eyeSpread * 1.6;
  headGroup.add(templeR);

  // ── Bushy Eyebrows (Realistic, fluffy white) ────────────────
  const eyebrowGroup = new THREE.Group();
  eyebrowGroup.name = 'eyebrowGroup';
  headGroup.add(eyebrowGroup);

  const ebPuffGeo = new THREE.SphereGeometry(0.016, 8, 8);
  [-1, 1].forEach((side) => {
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const x = side * (eyeSpread * 0.65 + t * eyeSpread * 0.65);
      const y = eyeY + 0.07 + Math.sin(t * Math.PI) * 0.025;
      const z = eyeZ + 0.01;

      const puff = new THREE.Mesh(ebPuffGeo, hairMat);
      puff.position.set(x, y, z);
      puff.scale.set(1.3, 1.0, 1.0);
      puff.castShadow = true;
      eyebrowGroup.add(puff);

      const ebStrand = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.001, 0.02 + Math.random() * 0.02, 4), hairMat);
      ebStrand.position.set(x, y + 0.01, z + 0.005);
      ebStrand.rotation.z = side * (Math.PI / 2 - 0.3 + Math.random() * 0.3);
      ebStrand.castShadow = true;
      eyebrowGroup.add(ebStrand);
    }
  });

  // ── Realistic Wild Messy Hair ──────────────────────────────
  const hairPuffGeo = new THREE.SphereGeometry(0.08, 10, 10);
  const hairLocations: [number, number, number][] = [
    [-0.24, 0.16, -0.1], [-0.26, 0.08, -0.06], [-0.28, -0.02, -0.05],
    [-0.27, -0.1, -0.08], [-0.25, -0.18, -0.12], [-0.22, 0.22, -0.12],
    [0.24, 0.16, -0.1], [0.26, 0.08, -0.06], [0.28, -0.02, -0.05],
    [0.27, -0.1, -0.08], [0.25, -0.18, -0.12], [0.22, 0.22, -0.12],
    [-0.14, -0.2, -0.22], [0.14, -0.2, -0.22], [0, -0.2, -0.25],
    [-0.2, -0.1, -0.22], [0.2, -0.1, -0.22], [0, -0.1, -0.26],
    [-0.22, 0.05, -0.18], [0.22, 0.05, -0.18], [0, 0.05, -0.25],
    [-0.15, 0.12, -0.22], [0.15, 0.12, -0.22],
    [-0.11, 0.2, -0.2], [0.11, 0.2, -0.2], [0, 0.2, -0.24],
    [-0.16, 0.24, -0.16], [0.16, 0.24, -0.16],
  ];

  hairLocations.forEach(([x, y, z], i) => {
    // Hair puff
    const puff = new THREE.Mesh(hairPuffGeo, hairMat);
    puff.position.set(x, y, z);
    const rScale = 0.85 + Math.random() * 0.45;
    puff.scale.set(rScale, rScale, rScale);
    puff.castShadow = true;
    headGroup.add(puff);

    // Messy strand sticking out from puff
    const strandGeo = new THREE.CylinderGeometry(0.008, 0.004, 0.11 + Math.random() * 0.07, 4);
    const strand = new THREE.Mesh(strandGeo, hairMat);
    
    // Normalize position relative to head center for outward direction vector
    const dir = new THREE.Vector3(x, y, z).normalize();
    strand.position.set(
      x + dir.x * 0.04,
      y + dir.y * 0.04,
      z + dir.z * 0.04
    );
    
    // Align strand along the outward direction vector
    strand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    // Add small random variations for organic, messy look
    strand.rotateX(Math.random() * 0.4 - 0.2);
    strand.rotateZ(Math.random() * 0.4 - 0.2);
    strand.castShadow = true;
    headGroup.add(strand);
  });

  // ── Glow ring at feet ──────────────────────────────────────
  const ringGeo = new THREE.TorusGeometry(0.35, 0.025, 8, 64);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x4488ff,
    emissive: 0x4488ff,
    emissiveIntensity: 1.8,
    transparent: true,
    opacity: 0.75,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.name = 'feetRing';
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.55;
  group.add(ring);

  // ── Name label plane ───────────────────────────────────────
  const labelGeo = new THREE.PlaneGeometry(1.2, 0.28);
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512; labelCanvas.height = 128;
  const ctx = labelCanvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(10,12,26,0.85)';
  ctx.roundRect(0, 0, 512, 128, 20);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(character.name, 256, 64);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.position.y = headY + headScale + 0.32;
  label.name = 'nameLabel';
  group.add(label);

  return group;
}

// ─────────────────────────────────────────────────────────────
// buildCharacterMesh — creates a DISTINCT 3D avatar per character
// ─────────────────────────────────────────────────────────────
function buildCharacterMesh(character: Character): THREE.Group {
  if (character.id === 'einstein') {
    return buildEinsteinMesh(character);
  }

  const vis = CHAR_VISUALS[character.id] ?? DEFAULT_VISUAL;
  const group = new THREE.Group();
  group.name = `char_${character.id}`;

  const [bodyR, bodyH] = vis.bodyScale;

  // ── Body ──────────────────────────────────────────────────
  const bodyGeo = character.category === 'extinct' || character.category === 'animal'
    ? new THREE.BoxGeometry(bodyR * 2.2, bodyH, bodyR * 1.8)   // stocky box for animals
    : new THREE.CapsuleGeometry(bodyR, bodyH, 8, 16);           // capsule for humanoids

  const bodyMat = new THREE.MeshStandardMaterial({
    color: vis.bodyColor,
    roughness: 0.45,
    metalness: 0.15,
    emissive: vis.bodyColor,
    emissiveIntensity: 0.08,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.name = 'body';
  body.position.y = 0;
  body.castShadow = true;
  group.add(body);

  // ── Head ──────────────────────────────────────────────────
  const headGeo = new THREE.SphereGeometry(vis.headScale, 32, 32);
  const headMat = new THREE.MeshStandardMaterial({
    color: vis.headColor,
    roughness: 0.35,
    metalness: 0.1,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.name = 'head';
  head.position.y = bodyH * 0.6 + vis.headScale + 0.05;
  head.castShadow = true;
  group.add(head);

  // ── Eyes ──────────────────────────────────────────────────
  const eyeGeo = new THREE.SphereGeometry(vis.headScale * 0.16, 12, 12);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: vis.eyeColor,
    emissive: vis.eyeColor,
    emissiveIntensity: 0.6,
  });
  const eyeSpread = vis.headScale * 0.38;
  const eyeZ      = vis.headScale * 0.88;
  const eyeY      = head.position.y + vis.headScale * 0.1;
  [-eyeSpread, eyeSpread].forEach((x) => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.name = x < 0 ? 'leftEyeGroup' : 'rightEyeGroup';
    eye.position.set(x, eyeY, eyeZ);
    group.add(eye);
  });

  // ── Character-specific extras ──────────────────────────────
  if (vis.extras === 'mane') {
    // Lion: golden mane ring around head
    const maneGeo = new THREE.TorusGeometry(vis.headScale * 1.35, vis.headScale * 0.3, 8, 24);
    const maneMat = new THREE.MeshStandardMaterial({
      color: 0xb8860b, roughness: 0.6,
      emissive: 0x996600, emissiveIntensity: 0.3,
    });
    const mane = new THREE.Mesh(maneGeo, maneMat);
    mane.position.y = head.position.y;
    mane.rotation.x = Math.PI / 2;
    group.add(mane);

    // Nose
    const noseGeo = new THREE.SphereGeometry(vis.headScale * 0.15, 8, 8);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x3d2200, roughness: 0.8 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, eyeY - vis.headScale * 0.22, eyeZ * 1.05);
    group.add(nose);

    // Ears
    const earGeo = new THREE.ConeGeometry(vis.headScale * 0.18, vis.headScale * 0.28, 8);
    const earMat = new THREE.MeshStandardMaterial({ color: vis.headColor, roughness: 0.7 });
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.position.set(side * vis.headScale * 0.72, head.position.y + vis.headScale * 0.85, 0);
      ear.rotation.z = side * 0.3;
      group.add(ear);
    });
  }

  if (vis.extras === 'wings') {
    // Eagle: wing planes on each side
    const wingGeo = new THREE.BoxGeometry(0.9, 0.08, 0.35);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x2c3e50, roughness: 0.7,
      emissive: 0x1a2530, emissiveIntensity: 0.1,
    });
    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(side * (bodyR + 0.45), bodyH * 0.1, 0);
      wing.rotation.z = side * 0.25;
      group.add(wing);
    });
    // White head (bald eagle white head)
    headMat.color.set(0xf8f8f8);

    // Beak
    const beakGeo = new THREE.ConeGeometry(vis.headScale * 0.1, vis.headScale * 0.3, 6);
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.4 });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, eyeY - vis.headScale * 0.2, eyeZ * 1.02);
    beak.rotation.x = Math.PI / 2;
    group.add(beak);
  }

  if (vis.extras === 'trex') {
    // T-Rex: tiny arms + large head ridge
    const armGeo = new THREE.CapsuleGeometry(0.07, 0.25, 4, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: vis.bodyColor, roughness: 0.6 });
    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(side * (bodyR * 1.1), bodyH * 0.25, bodyR * 0.6);
      arm.rotation.z = side * 1.2;
      arm.rotation.x = 0.6;
      group.add(arm);
    });
    // Teeth row
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xfffff0, roughness: 0.3 });
    for (let i = -2; i <= 2; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), toothMat);
      tooth.position.set(i * 0.1, head.position.y - vis.headScale * 0.75, eyeZ * 0.85);
      tooth.rotation.x = Math.PI;
      group.add(tooth);
    }
  }

  if (vis.extras === 'tusks') {
    // Mammoth: curved tusks
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xfff8dc, roughness: 0.5 });
    [-1, 1].forEach((side) => {
      const tusk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.8, 8), tuskMat);
      tusk.position.set(side * vis.headScale * 0.65, head.position.y - vis.headScale * 0.5, eyeZ * 0.5);
      tusk.rotation.z = side * 0.4;
      tusk.rotation.x = 0.5;
      group.add(tusk);
    });
  }

  if (vis.extras === 'crown') {
    // Cleopatra: golden crown
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xffd700, roughness: 0.2, metalness: 0.9,
      emissive: 0x996600, emissiveIntensity: 0.4,
    });
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(vis.headScale * 1.1, vis.headScale * 0.95, 0.2, 16), crownMat);
    crown.position.y = head.position.y + vis.headScale * 0.9;
    group.add(crown);
    // Crown spikes
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 6), crownMat);
      spike.position.set(
        Math.cos(angle) * vis.headScale * 1.0,
        head.position.y + vis.headScale * 1.05,
        Math.sin(angle) * vis.headScale * 1.0,
      );
      group.add(spike);
    }
  }

  if (vis.extras === 'hair') {
    // Einstein: wild white hair puffs
    const hairMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.07 + Math.random() * 0.04, 8, 8), hairMat);
      puff.position.set(
        Math.cos(angle) * vis.headScale * 0.9,
        head.position.y + vis.headScale * 0.6 + Math.random() * 0.1,
        Math.sin(angle) * vis.headScale * 0.9,
      );
      group.add(puff);
    }
    // Mustache
    const mustacheMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 });
    [-1, 1].forEach((side) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), mustacheMat);
      m.scale.set(1.8, 0.6, 1.0);
      m.position.set(side * 0.07, eyeY - vis.headScale * 0.28, eyeZ * 0.98);
      group.add(m);
    });
  }

  // ── Glow ring at feet (character-colour tinted) ────────────
  const ringGeo = new THREE.TorusGeometry(bodyR * 1.5, 0.025, 8, 64);
  const ringMat = new THREE.MeshStandardMaterial({
    color: vis.ringColor,
    emissive: vis.ringColor,
    emissiveIntensity: 1.8,
    transparent: true,
    opacity: 0.75,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.name = 'feetRing';
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -(bodyH * 0.5 + 0.1);
  group.add(ring);

  // ── Name label plane (coloured rectangle) ─────────────────
  const labelGeo = new THREE.PlaneGeometry(1.2, 0.28);
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512; labelCanvas.height = 128;
  const ctx = labelCanvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(10,12,26,0.85)';
  ctx.roundRect(0, 0, 512, 128, 20);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(character.name, 256, 64);
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.position.y = head.position.y + vis.headScale + 0.32;
  label.name = 'nameLabel';
  group.add(label);

  return group;
}

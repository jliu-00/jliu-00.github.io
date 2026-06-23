import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { MotionValue } from 'framer-motion';

const vertexShader = `
precision highp float;

uniform float uTime;
uniform float uConverge;
uniform float uScrollProgress;
uniform vec2 uPushDir;
uniform vec2 uMouse;
uniform vec2 uUvScale;
uniform float uDensity;
uniform float uPointBaseSize;
uniform sampler2D uTexture;

varying vec2 vUv;
varying vec2 vOriginalUv;
varying float vConvergeFactor;
varying float vStarBrightness;
varying float vAlphaDecay;
varying float vArriveT;

float hash(vec2 p) {
  p = p * vec2(1234.56, 789.12);
  vec3 p3  = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vUv = (uv - 0.5) * uUvScale + 0.5;
  vOriginalUv = uv;
  
  vec3 pos = position;
  
  // Per-particle staggered convergence (Ink-like effect based on luminance)
  vec4 texColorVert = texture2D(uTexture, vUv);
  float vertLuminance = dot(texColorVert.rgb, vec3(0.299, 0.587, 0.114));
  
  // Push the contrast so the bridge becomes strictly 0.0 and the sky becomes 1.0
  // This ensures they are pushed to the absolute extremes of the timeline
  float contrastLuminance = smoothstep(0.1, 0.6, vertLuminance);
  
  // Dark areas assemble first, bright areas assemble later.
  // Reduce random noise to 10% so the structural shape (bridge) is almost perfectly sharp
  float arriveT = mix(contrastLuminance, hash(uv + 0.3), 0.1);
  
  // ALL particles start moving back IMMEDIATELY when the animation begins.
  float pStart = 0.0;
  
  // But they finish at different times (different speeds).
  // arriveT=0.0 (bridge): finishes at 0.6 (gives it more than half the timeline, much smoother).
  // arriveT=1.0 (sky): finishes late at 1.0 (moves very slowly).
  float pEnd = mix(0.6, 1.0, arriveT);
  
  float particleProgress = smoothstep(pStart, pEnd, uConverge);
  
  vArriveT = arriveT;
  
  // convergeFactor is 1.0 when scattered, 0.0 when converged
  float convergeFactor = 1.0 - particleProgress;
  
  vConvergeFactor = convergeFactor;
  
  vec2 mouseOffset = uv - 0.5;
  float dist = distance(mouseOffset, uMouse);
  float force = smoothstep(0.2, 0.0, dist);
  float repelStrength = smoothstep(0.0, 0.2, convergeFactor);
  pos.z += force * 2.0 * repelStrength;
  pos.x += force * normalize(mouseOffset).x * 2.0 * repelStrength;
  pos.y += force * normalize(mouseOffset).y * 2.0 * repelStrength;

  // Use LOCAL shatter progress so bright particles stay far away until their turn
  float localShatter = convergeFactor; // 1.0 = scattered, 0.0 = converged
  float shatterAmount = localShatter * 10.0; // Restored normal scatter distance
  
  float randomAngle = hash(uv) * 6.28318;
  float radius = hash(uv + 0.1);
  
  // Star brightness: power-law for rare bright embers
  float starRand = hash(uv + 0.5);
  float starBrightness = pow(starRand, 3.5);
  vStarBrightness = starBrightness;
  
  // Galaxy band: concentrate scatter along a diagonal (~30 deg)
  float bandAngle = 0.55;
  float angleFromBand = sin(randomAngle - bandAngle);
  float bandFocus = exp(-angleFromBand * angleFromBand * 3.0);
  
  // Dense core: center particles scatter less
  float distFromCenter = length(uv - 0.5);
  float coreFactor = smoothstep(0.0, 0.45, distFromCenter) * 0.7 + 0.3;
  
  // Original Galaxy Speed
  float speed = (radius * 2.2 + 0.3) * coreFactor * (bandFocus * 0.7 + 0.3);
  
  // scrollForce uses global shatterProgress so scrolling pushes everything, 
  // but initial entrance only pulls local particles
  float globalShatter = 1.0 - uConverge;
  float scrollForceX = globalShatter * 0.6;
  float scrollForceY = uScrollProgress * 0.5;
  
  float emberDriftY = (hash(uv + 0.8) - 0.3) * uTime * 0.15 * localShatter;
  
  float lateralConstraint = mix(1.0, 0.6, smoothstep(0.0, 0.2, uScrollProgress));
  float localWindX = (cos(randomAngle) * speed - radius * 1.0) * lateralConstraint;
  float windY = sin(randomAngle) * speed + emberDriftY + uPushDir.y * scrollForceY;
  float windZ = (hash(uv + 0.2) - 0.5) * 0.6;
  
  // Non-linear compression: keeps the -4.0 speed at the start of scroll, but prevents the particles from exceeding max distance and disappearing
  float rawPushDispX = uPushDir.x * scrollForceX * shatterAmount;
  float maxPushDispX = 18.0;
  float compressedPushDispX = sign(rawPushDispX) * maxPushDispX * (1.0 - exp(-abs(rawPushDispX) / maxPushDispX));
  
  pos.x += localWindX * shatterAmount + compressedPushDispX;
  pos.y += windY * shatterAmount;
  pos.z += windZ * shatterAmount;
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  // Converged size must perfectly fill the grid on screen (exact physical pixels).
  // Scattered size has perspective applied so distant embers look smaller.
  float scatteredScreenSize = mix(40.0, 120.0, starBrightness) * (1.0 / -mvPosition.z);
  
  gl_PointSize = mix(uPointBaseSize, scatteredScreenSize, smoothstep(0.0, 0.1, localShatter));
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform sampler2D uTexture;
uniform vec2 uPlaneRatio;
uniform float uTime;
uniform float uScrollProgress;
uniform float uConverge;
varying vec2 vUv;
varying vec2 vOriginalUv;
varying float vConvergeFactor;
varying float vStarBrightness;
varying float vArriveT;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);
  
  // Calculate alpha threshold for darkness
  // We reduce the fade threshold so dark particles (like the bridge) are more opaque and visible
  float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
  float isDark = 1.0 - luminance;
  float alphaThreshold = smoothstep(0.0, 0.3, isDark) * 0.2; // Only fade up to 20% max
  float fadeAlpha = 1.0 - alphaThreshold;
  
  if (texColor.a * fadeAlpha < 0.01) discard;
  
  vec2 circCoord = 2.0 * gl_PointCoord - 1.0;
  float r2 = dot(circCoord, circCoord);
  
  // Shape logic: draw a circle when scattered, but a full square when completely converged.
  // This ensures there are no gaps between particles when they form the final image.
  float isScattered = smoothstep(0.99, 1.0, 1.0 - uConverge); // 1.0 if not perfectly converged
  
  vec2 planeDist = abs(vOriginalUv - 0.5) * 2.0; 
  vec2 sizeRadius = vec2(1.0) - vec2(0.15) * vec2(1.0, uPlaneRatio.y/uPlaneRatio.x); 
  if (isScattered < 0.1 && planeDist.x > sizeRadius.x && planeDist.y > sizeRadius.y) {
    vec2 cornerDist = (planeDist - sizeRadius) / (vec2(1.0) - sizeRadius);
    if (length(cornerDist) > 1.0) discard;
  }
  
  // If scattered, discard outside circle (r2 > 1.0).
  // If perfectly converged, keep the whole square (r2 > 4.0 is impossible, so keeps all).
  if (r2 > mix(4.0, 1.0, isScattered)) discard;
  
  // Slow ember flicker effect using uTime
  float flicker = 1.0;
  if (vStarBrightness > 0.5) {
      flicker = 0.7 + 0.3 * sin(uTime * 2.0 + vOriginalUv.x * 100.0);
  }
  
  float glowStrength = isScattered * vStarBrightness;
  float glow = 1.0 - smoothstep(0.1, 1.0, r2) * glowStrength * 0.6;
  
  // For scroll fading: ensure the floor is high enough (0.15) 
  float alphaDecay = smoothstep(0.0, 0.4, uScrollProgress);
  float minAlphaFloor = mix(0.15, 0.8, vStarBrightness);
  float scrollAlpha = mix(1.0, minAlphaFloor, alphaDecay);
  
  // Constellation Glow: Dark structure particles (vArriveT < 0.5) glow brightly when they assemble early!
  // The glow is strongest when they first assemble, and fades out as the rest of the image (uConverge -> 1.0) fills in.
  float isAssembled = 1.0 - isScattered;
  float structureGlow = smoothstep(0.5, 0.0, vArriveT) * isAssembled * (1.0 - uConverge) * 1.5;
  
  vec3 finalColor = mix(texColor.rgb, vec3(1.0, 1.0, 1.0), min(structureGlow, 1.0));
  
  float finalAlpha = texColor.a * fadeAlpha * glow * scrollAlpha * flicker;
  // Boost alpha for the glowing structure so it ignores the darkness fade and pops out clearly
  finalAlpha = max(finalAlpha, min(structureGlow, 1.0));
  
  if (finalAlpha < 0.01) discard;
  
  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

interface ParticleImageProps {
  src: string;
  width?: number;
  height?: number;
  density?: number;
  scale?: number;
  enableHover?: boolean;
  onSettled?: () => void;
  containerRef?: React.RefObject<HTMLElement | null>;
  scrollYProgress?: MotionValue<number>;
  pushVector?: [number, number];
}

export function ParticleImage({ src, width = 4, height = 5, density = 500, scale = 1, enableHover = true, onSettled, containerRef, scrollYProgress, pushVector = [0, 0] }: ParticleImageProps) {
  useTexture.preload(src);
  const texture = useTexture(src);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  // Store uniforms in a ref so they are NEVER recreated on re-renders (like dark mode toggles)
  // which would reset uConverge back to 0 and cause teleports.
  const uniformsRef = useRef<any>(null);
  if (!uniformsRef.current) {
    let uvScaleX = 1;
    let uvScaleY = 1;
    if (texture.image) {
      const texAspect = texture.image.width / texture.image.height;
      const planeAspect = width / height;
      if (texAspect > planeAspect) {
        uvScaleX = planeAspect / texAspect;
      } else {
        uvScaleY = texAspect / planeAspect;
      }
    }
    
    let pushVec = new THREE.Vector2(pushVector[0], pushVector[1]);
    
    uniformsRef.current = {
      uTime: { value: 0 },
      uConverge: { value: 0 }, // 0 = scattered, 1 = converged
      uScrollProgress: { value: 0 },
      uPushDir: { value: pushVec },
      uMouse: { value: new THREE.Vector2(999.0, 999.0) },
      uTexture: { value: texture },
      uUvScale: { value: new THREE.Vector2(uvScaleX, uvScaleY) },
      uPlaneRatio: { value: new THREE.Vector2(width, height) },
      uDensity: { value: density },
      uPointBaseSize: { value: 1.0 }
    };
  }
  const uniforms = uniformsRef.current;
  
  // Keep uDensity in sync if prop changes
  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.uDensity.value = density;
    }
  }, [density]);
  
  // Keep pushVector in sync
  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.uPushDir.value.set(pushVector[0], pushVector[1]);
    }
  }, [pushVector[0], pushVector[1]]);

  const entranceTimer = useRef(0);
  const isEntrance = useRef(true); // Start with entrance animation
  const bounceProgress = useRef(-1); // -1 means not bouncing
  const CONVERGE_DURATION = 2.5;
  
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  useFrame((state, delta) => {
    if (!shaderRef.current) return;
    
    shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    
    // Pass global scroll progress for alpha decay
    if (scrollYProgress) {
      shaderRef.current.uniforms.uScrollProgress.value = scrollYProgress.get();
    }
    
    // Calculate exact physical pixel size needed to tile perfectly
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const gridSpacingWorld = width / density;
    const gridSpacingCSS = gridSpacingWorld * (state.size.width / state.viewport.width);
    const gridSpacingPhysical = gridSpacingCSS * dpr;
    // Add a tiny 10% overlap to prevent rounding gaps, but small enough to avoid bleed
    shaderRef.current.uniforms.uPointBaseSize.value = gridSpacingPhysical * 1.1;
    
    let targetConverge = 1.0;
    
    // Entrance effect overrides everything until complete,
    // UNLESS the user starts scrolling, in which case we immediately switch to scroll-driven logic.
    if (isEntrance.current && window.scrollY < 10) {
      entranceTimer.current += delta;
      targetConverge = Math.min(entranceTimer.current / CONVERGE_DURATION, 1.0);
      
      // Trigger the bounce slightly early to prevent any perceived delay
      if (targetConverge >= 0.95) {
        isEntrance.current = false;
        shaderRef.current.uniforms.uConverge.value = 1.0; // Snap the rest of the way to start bounce cleanly
        if (bounceProgress.current === -1) {
           bounceProgress.current = 0.0;
        }
      } else {
        shaderRef.current.uniforms.uConverge.value = targetConverge;
      }
    } else {
      isEntrance.current = false; // Ensure it's off if we broke out due to scrolling
      
      // Post-entrance: Converge state is strictly mapped to scroll position
      // Shatter completes within the first 600px of scrolling (before timeline)
      const shatterScrollRange = 600.0;
      const linearProgress = 1.0 - Math.min(window.scrollY / shatterScrollRange, 1.0);
      
      // Apply a gentler non-linear curve (power of 1.5 instead of 3.0).
      // This maintains the resistance to reassembly, but reduces the steepness at the end
      // so the particles don't snap back too abruptly when reaching the top.
      targetConverge = Math.pow(linearProgress, 1.5);
      
      const currentConverge = shaderRef.current.uniforms.uConverge.value;
      
      if (targetConverge < currentConverge) {
        // Scrolling DOWN (target is lower than current)
        // Images shatter quickly and responsively
        shaderRef.current.uniforms.uConverge.value = THREE.MathUtils.lerp(currentConverge, targetConverge, Math.min(delta * 12.0, 1.0));
      } else if (targetConverge > currentConverge) {
        // Scrolling UP (target is higher than current)
        // Particles reassemble with strong inertia to simulate "resistance" against going back
        shaderRef.current.uniforms.uConverge.value = THREE.MathUtils.lerp(currentConverge, targetConverge, Math.min(delta * 1.2, 1.0));
        
        // If we reached the top, start the bounce animation before settling
        // Trigger at 0.95 to skip the infinitely long exponential lerp decay tail!
        if (targetConverge === 1.0 && shaderRef.current.uniforms.uConverge.value > 0.95 && bounceProgress.current === -1) {
           shaderRef.current.uniforms.uConverge.value = 1.0;
           bounceProgress.current = 0.0;
        }
      }
    }
    
    // Handle Bounce Animation
    let bounceScale = 1.0;
    if (bounceProgress.current >= 0.0) {
      bounceProgress.current += delta / 0.4; // 0.4s bounce duration (slightly snappier)
      if (bounceProgress.current >= 1.0) {
        bounceScale = 1.0;
        bounceProgress.current = -1;
        onSettledRef.current?.(); // Trigger DOM fade-in ONLY after bounce finishes
      } else {
        // Smooth sine curve: 0 -> 1 -> 0
        // We shrink by 4% to create a "getting denser" feeling, then spring back
        const bounceAmount = Math.sin(bounceProgress.current * Math.PI);
        bounceScale = 1.0 - 0.04 * bounceAmount;
      }
    } else if (targetConverge < 1.0 && !isEntrance.current) {
      // Reset if user scrolls down during or after bounce
      bounceProgress.current = -1;
    }
    
    if (hovered) {
      shaderRef.current.uniforms.uMouse.value.set(state.pointer.x / 2, state.pointer.y / 2);
    } else {
      shaderRef.current.uniforms.uMouse.value.set(999.0, 999.0);
    }

    // Dynamic positioning: compute world-space position/scale from DOM rects
    if (containerRef?.current && groupRef.current) {
      const tr = containerRef.current.getBoundingClientRect();
      const canvasEl = state.gl.domElement;
      const cr = canvasEl.getBoundingClientRect();

      const cam = state.camera as THREE.PerspectiveCamera;
      const vFov = cam.fov * Math.PI / 180;
      const dist = cam.position.z;
      const vH = 2 * Math.tan(vFov / 2) * dist;
      const vW = vH * cam.aspect;

      // Container center in normalized canvas coords (0 = left/top, 1 = right/bottom)
      const nx = (tr.left + tr.width / 2) / cr.width;
      
      // When the image shatters, we want to detach the particles from the DOM's upward scroll
      // so they don't get dragged thousands of pixels above the screen.
      const shatterRatio = 1.0 - (shaderRef.current.uniforms.uConverge.value || 0);
      const scrollCompensationPixels = window.scrollY * shatterRatio;
      const compensatedNy = (tr.top + scrollCompensationPixels + tr.height / 2) / cr.height;

      // Convert to world space (Y flipped)
      groupRef.current.position.x = (nx - 0.5) * vW;
      groupRef.current.position.y = -(compensatedNy - 0.5) * vH;

      // Scale so the plane matches the container's visual size, multiplied by bounce animation
      const containerWorldH = (tr.height / cr.height) * vH;
      groupRef.current.scale.setScalar((containerWorldH / height) * bounceScale);
    }
  });

  const pointerProps = enableHover ? {
    onPointerOver: () => setHovered(true),
    onPointerOut: () => setHovered(false)
  } : {};

  return (
    <group ref={groupRef} scale={containerRef ? undefined : scale}>
      <points {...pointerProps}>
        <planeGeometry args={[width, height, density, Math.floor(density * (height / width))]} />
        <shaderMaterial
          ref={shaderRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent={true}
        />
      </points>
    </group>
  );
}

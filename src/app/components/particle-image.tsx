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
uniform sampler2D uTexture;

varying vec2 vUv;
varying vec2 vOriginalUv;
varying float vConvergeFactor;
varying float vStarBrightness;
varying float vAlphaDecay;

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
  
  // Dark areas assemble first, bright areas assemble later.
  // Add 30% random noise so it doesn't look like a perfectly flat gradient.
  float arriveT = mix(vertLuminance, hash(uv + 0.3), 0.3);
  
  float pStart = arriveT * 0.4;
  float pEnd = pStart + 0.6;
  float particleProgress = smoothstep(pStart, pEnd, uConverge);
  float pp = 1.0 - particleProgress;
  float eased = 1.0 - pp * pp * pp;
  float convergeFactor = 1.0 - eased;
  
  if (uConverge >= 0.999) {
    convergeFactor = 0.0;
  }
  
  vConvergeFactor = convergeFactor;
  
  vec2 mouseOffset = uv - 0.5;
  float dist = distance(mouseOffset, uMouse);
  float force = smoothstep(0.2, 0.0, dist);
  float repelStrength = smoothstep(0.0, 0.2, convergeFactor);
  pos.z += force * 2.0 * repelStrength;
  pos.x += force * normalize(mouseOffset).x * 2.0 * repelStrength;
  pos.y += force * normalize(mouseOffset).y * 2.0 * repelStrength;

  float shatterProgress = 1.0 - uConverge;
  float shatterAmount = shatterProgress * 10.0;
  
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
  
  // Use shatterProgress for X force so they clear the center IMMEDIATELY when scattered.
  // Use uScrollProgress for Y force so they gently drift down the entire length of the page.
  float scrollForceX = shatterProgress * 0.6;
  float scrollForceY = uScrollProgress * 0.5;
  
  float emberDriftY = (hash(uv + 0.8) - 0.3) * uTime * 0.5 * shatterProgress;
  
  // Constrain random lateral spread when scrolling.
  // 1.0 = wide explosion (used during initial entrance animation).
  // 0.6 = moderate stream (used during downward scroll to naturally fill the 15-30% edge margins).
  float lateralConstraint = mix(1.0, 0.6, smoothstep(0.0, 0.2, uScrollProgress));
  
  float windX = (cos(randomAngle) * speed - radius * 1.0) * lateralConstraint + uPushDir.x * scrollForceX;
  float windY = sin(randomAngle) * speed + emberDriftY + uPushDir.y * scrollForceY;
  float windZ = (hash(uv + 0.2) - 0.5) * 0.6;
  
  pos.x += windX * shatterAmount * convergeFactor;
  pos.y += windY * shatterAmount * convergeFactor;
  pos.z += windZ * shatterAmount * convergeFactor;
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  float convergedSize = 75.0 * (500.0 / uDensity);
  float scatteredSize = mix(40.0, 120.0, starBrightness);
  
  // Make particles shrink as they begin to scatter
  float sizeBlend = smoothstep(0.0, 0.05, convergeFactor);
  float finalSize = mix(convergedSize, scatteredSize, sizeBlend);
  
  gl_PointSize = finalSize * (1.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform sampler2D uTexture;
uniform vec2 uPlaneRatio;
uniform float uTime;
uniform float uScrollProgress;
varying vec2 vUv;
varying vec2 vOriginalUv;
varying float vConvergeFactor;
varying float vStarBrightness;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);
  
  // Calculate alpha threshold for darkness
  float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
  float isDark = 1.0 - luminance;
  float alphaThreshold = smoothstep(0.0, 0.3, isDark) * 0.7;
  float fadeAlpha = 1.0 - alphaThreshold;
  
  if (texColor.a * fadeAlpha < 0.01) discard;
  
  vec2 circCoord = 2.0 * gl_PointCoord - 1.0;
  float r2 = dot(circCoord, circCoord);
  
  float scattered = smoothstep(0.0, 0.2, vConvergeFactor);
  
  vec2 planeDist = abs(vOriginalUv - 0.5) * 2.0; 
  vec2 sizeRadius = vec2(1.0) - vec2(0.15) * vec2(1.0, uPlaneRatio.y/uPlaneRatio.x); 
  if (scattered < 0.1 && planeDist.x > sizeRadius.x && planeDist.y > sizeRadius.y) {
    vec2 cornerDist = (planeDist - sizeRadius) / (vec2(1.0) - sizeRadius);
    if (length(cornerDist) > 1.0) discard;
  }
  
  if (r2 > mix(4.0, 1.0, scattered)) discard;
  
  // Slow ember flicker effect using uTime
  float flicker = 1.0;
  if (vStarBrightness > 0.5) {
      flicker = 0.7 + 0.3 * sin(uTime * 2.0 + vOriginalUv.x * 100.0);
  }
  
  float glowStrength = scattered * vStarBrightness;
  float glow = 1.0 - smoothstep(0.1, 1.0, r2) * glowStrength * 0.6;
  
  // For scroll fading: ensure the floor is high enough (0.15) 
  float alphaDecay = smoothstep(0.0, 0.4, uScrollProgress);
  float minAlphaFloor = mix(0.15, 0.8, vStarBrightness);
  float scrollAlpha = mix(1.0, minAlphaFloor, alphaDecay);
  
  float finalAlpha = texColor.a * fadeAlpha * glow * scrollAlpha * flicker;
  if (finalAlpha < 0.01) discard;
  
  gl_FragColor = vec4(texColor.rgb, finalAlpha);
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
      uDensity: { value: density }
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
    
    let targetConverge = 1.0;
    
    // Entrance effect overrides everything until complete,
    // UNLESS the user starts scrolling, in which case we immediately switch to scroll-driven logic.
    if (isEntrance.current && window.scrollY < 10) {
      entranceTimer.current += delta;
      targetConverge = Math.min(entranceTimer.current / CONVERGE_DURATION, 1.0);
      shaderRef.current.uniforms.uConverge.value = targetConverge;
      
      if (targetConverge >= 1.0) {
        isEntrance.current = false;
        onSettledRef.current?.();
      }
    } else {
      isEntrance.current = false; // Ensure it's off if we broke out due to scrolling
      
      // Post-entrance: Converge state is strictly mapped to scroll position
      // Shatter completes within the first 600px of scrolling (before timeline)
      const shatterScrollRange = 600.0;
      targetConverge = 1.0 - Math.min(window.scrollY / shatterScrollRange, 1.0);
      
      const currentConverge = shaderRef.current.uniforms.uConverge.value;
      
      if (targetConverge < currentConverge) {
        // Scrolling DOWN (target is lower than current)
        // Images shatter quickly and responsively
        shaderRef.current.uniforms.uConverge.value = THREE.MathUtils.lerp(currentConverge, targetConverge, Math.min(delta * 12.0, 1.0));
      } else if (targetConverge > currentConverge) {
        // Scrolling UP (target is higher than current)
        // Particles reassemble with moderate inertia (faster than before)
        shaderRef.current.uniforms.uConverge.value = THREE.MathUtils.lerp(currentConverge, targetConverge, Math.min(delta * 3.0, 1.0));
        
        // If we reached the top, trigger onSettled to crossfade back to static <img>
        if (targetConverge === 1.0 && shaderRef.current.uniforms.uConverge.value > 0.99) {
           shaderRef.current.uniforms.uConverge.value = 1.0;
           onSettledRef.current?.();
        }
      }
    }
    
    if (hovered) {
      shaderRef.current.uniforms.uMouse.value.set(state.pointer.x / 2, state.pointer.y / 2);
    } else {
      shaderRef.current.uniforms.uMouse.value.set(999.0, 999.0);
    }

    // Dynamic positioning: compute world-space position/scale from DOM rects
    if (containerRef?.current && groupRef.current) {
      const tr = containerRef.current.getBoundingClientRect();

      const cam = state.camera as THREE.PerspectiveCamera;
      const vFov = cam.fov * Math.PI / 180;
      const dist = cam.position.z;
      const vH = 2 * Math.tan(vFov / 2) * dist;
      const vW = vH * cam.aspect;

      // Container center in normalized canvas coords (0 = left/top, 1 = right/bottom)
      const nx = (tr.left + tr.width / 2) / state.size.width;
      
      // When the image shatters, we want to detach the particles from the DOM's upward scroll
      // so they don't get dragged thousands of pixels above the screen.
      const shatterRatio = 1.0 - (shaderRef.current.uniforms.uConverge.value || 0);
      const scrollCompensationPixels = window.scrollY * shatterRatio;
      const compensatedNy = (tr.top + scrollCompensationPixels + tr.height / 2) / state.size.height;

      // Convert to world space (Y flipped)
      groupRef.current.position.x = (nx - 0.5) * vW;
      groupRef.current.position.y = -(compensatedNy - 0.5) * vH;

      // Scale so the plane matches the container's visual size
      const containerWorldH = (tr.height / state.size.height) * vH;
      groupRef.current.scale.setScalar(containerWorldH / height);
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

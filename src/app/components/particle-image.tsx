import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
precision highp float;

uniform float uTime;
uniform float uScrollVelocity;
uniform float uConverge;
uniform vec2 uMouse;
uniform vec2 uUvScale;

varying vec2 vUv;
varying vec2 vOriginalUv;
varying float vConvergeFactor;
varying float vStarBrightness;

float hash(vec2 p) {
  p = p * vec2(1234.56, 789.12);
  vec3 p3  = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  // Apply object-cover scaling so particles sample the correct image regions
  vUv = (uv - 0.5) * uUvScale + 0.5;
  vOriginalUv = uv; // keep 0-1 for plane coordinates
  
  vec3 pos = position;
  
  // Per-particle staggered convergence
  float arriveT = hash(uv + 0.3);
  float pStart = arriveT * 0.3;
  float pEnd = pStart + 0.7;
  float particleProgress = smoothstep(pStart, pEnd, uConverge);
  float pp = 1.0 - particleProgress;
  float eased = 1.0 - pp * pp * pp;
  float convergeFactor = 1.0 - eased;
  
  vConvergeFactor = convergeFactor;
  
  // Mouse repel - fade out as we converge so they lock into place perfectly
  vec2 mouseOffset = uv - 0.5;
  float dist = distance(mouseOffset, uMouse);
  float force = smoothstep(0.2, 0.0, dist);
  float repelStrength = smoothstep(0.0, 0.2, convergeFactor);
  pos.z += force * 2.0 * repelStrength;
  pos.x += force * normalize(mouseOffset).x * 2.0 * repelStrength;
  pos.y += force * normalize(mouseOffset).y * 2.0 * repelStrength;

  float shatterAmount = clamp(uScrollVelocity, 0.0, 10.0);
  
  // --- Galaxy scatter distribution ---
  float randomAngle = hash(uv) * 6.28318;
  float radius = hash(uv + 0.1);
  
  // Star brightness: power-law (most are tiny pinpoints, rare bright stars)
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
  
  // Speed with galaxy band concentration
  float speed = (radius * 2.2 + 0.3) * coreFactor * (bandFocus * 0.7 + 0.3);
  
  float windX = cos(randomAngle) * speed - radius * 1.0;
  float windY = sin(randomAngle) * speed;
  float windZ = (hash(uv + 0.2) - 0.5) * 0.6;
  
  pos.x += windX * shatterAmount * convergeFactor;
  pos.y += windY * shatterAmount * convergeFactor;
  pos.z += windZ * shatterAmount * convergeFactor;
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  // --- Point size ---
  // Converged: uniform size for seamless image reconstruction
  float convergedSize = 75.0;
  // Scattered: pinpoint stars (mostly tiny, rare bright)
  float scatteredSize = mix(5.0, 80.0, starBrightness);
  
  // Size transitions to uniform BEFORE position finishes converging
  // This eliminates blobs from large particles still in transit
  float sizeBlend = smoothstep(0.0, 0.2, convergeFactor);
  float finalSize = mix(convergedSize, scatteredSize, sizeBlend);
  
  gl_PointSize = finalSize * (1.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform sampler2D uTexture;
uniform vec2 uPlaneRatio;
varying vec2 vUv;
varying vec2 vOriginalUv;
varying float vConvergeFactor;
varying float vStarBrightness;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);
  if (texColor.a < 0.1) discard;
  
  vec2 circCoord = 2.0 * gl_PointCoord - 1.0;
  float r2 = dot(circCoord, circCoord);
  
  // Transition from square (converged) to circle (scattered)
  float scattered = smoothstep(0.0, 0.2, vConvergeFactor);
  
  // Simulate CSS rounded-[2rem] when converged (clip corners)
  // vOriginalUv is 0-1 across the plane. 
  vec2 planeDist = abs(vOriginalUv - 0.5) * 2.0; // 0 to 1
  vec2 sizeRadius = vec2(1.0) - vec2(0.15) * vec2(1.0, uPlaneRatio.y/uPlaneRatio.x); 
  if (scattered < 0.1 && planeDist.x > sizeRadius.x && planeDist.y > sizeRadius.y) {
    vec2 cornerDist = (planeDist - sizeRadius) / (vec2(1.0) - sizeRadius);
    if (length(cornerDist) > 1.0) discard;
  }
  
  // Square when converged (no clipping), circle when scattered
  if (r2 > mix(4.0, 1.0, scattered)) discard;
  
  // Star glow: brighter stars get softer edges, dim stars are hard points
  float glowStrength = scattered * vStarBrightness;
  float glow = 1.0 - smoothstep(0.1, 1.0, r2) * glowStrength * 0.6;
  
  gl_FragColor = vec4(texColor.rgb, texColor.a * glow);
}
`;

interface ParticleImageProps {
  src: string;
  width?: number;
  height?: number;
  density?: number;
  scale?: number;
  onSettled?: () => void;
}

export function ParticleImage({ src, width = 4, height = 5, density = 500, scale = 1, onSettled }: ParticleImageProps) {
  useTexture.preload(src);
  const texture = useTexture(src);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const [hovered, setHovered] = useState(false);
  
  const uniforms = useMemo(() => {
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
    
    return {
      uTime: { value: 0 },
      uScrollVelocity: { value: 0 },
      uConverge: { value: 0 },
      uMouse: { value: new THREE.Vector2(999.0, 999.0) },
      uTexture: { value: texture },
      uUvScale: { value: new THREE.Vector2(uvScaleX, uvScaleY) },
      uPlaneRatio: { value: new THREE.Vector2(width, height) }
    };
  }, [texture, width, height]);

  const currentShatter = useRef(0);
  const lastScrollY = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const wasShattered = useRef(false);
  const stoppedFrames = useRef(0);
  const convergeTimer = useRef(0);
  const isConverging = useRef(false);
  const CONVERGE_DURATION = 2.5;
  
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  useFrame((state, delta) => {
    if (!shaderRef.current) return;
    
    shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    
    const currentScrollY = window.scrollY;
    const dy = currentScrollY - lastScrollY.current;
    lastScrollY.current = currentScrollY;
    
    const isStrongScroll = Math.abs(dy) > 1.5;
    const isAnyScroll = Math.abs(dy) > 0.1;
    
    if (isAnyScroll && !isConverging.current) {
      stoppedFrames.current = 0;
      const desiredVelocity = 4.0 + Math.min(Math.abs(dy) * 0.5, 6.0);
      currentShatter.current = THREE.MathUtils.lerp(currentShatter.current, desiredVelocity, delta * 15.0);
      if (currentShatter.current > 0.1) wasShattered.current = true;
      shaderRef.current.uniforms.uConverge.value = 0;
    } else if (isStrongScroll && isConverging.current) {
      isConverging.current = false;
      convergeTimer.current = 0;
      shaderRef.current.uniforms.uConverge.value = 0;
      stoppedFrames.current = 0;
      const desiredVelocity = 4.0 + Math.min(Math.abs(dy) * 0.5, 6.0);
      currentShatter.current = THREE.MathUtils.lerp(currentShatter.current, desiredVelocity, delta * 15.0);
    } else if (!isAnyScroll && !isConverging.current && currentShatter.current > 0) {
      stoppedFrames.current++;
      if (stoppedFrames.current >= 10) {
        isConverging.current = true;
        convergeTimer.current = 0;
      }
    }
    
    if (isConverging.current) {
      convergeTimer.current += delta;
      const rawT = Math.min(convergeTimer.current / CONVERGE_DURATION, 1.0);
      shaderRef.current.uniforms.uConverge.value = rawT;
      
      if (rawT >= 1.0) {
        currentShatter.current = 0;
        isConverging.current = false;
        shaderRef.current.uniforms.uConverge.value = 0;
        if (wasShattered.current) {
          wasShattered.current = false;
          onSettledRef.current?.();
        }
      }
    }
    
    shaderRef.current.uniforms.uScrollVelocity.value = currentShatter.current;
    
    if (hovered) {
      shaderRef.current.uniforms.uMouse.value.set(state.pointer.x / 2, state.pointer.y / 2);
    } else {
      shaderRef.current.uniforms.uMouse.value.set(999.0, 999.0);
    }
  });

  return (
    <points scale={scale} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <planeGeometry args={[width, height, density, Math.floor(density * (height / width))]} />
      <shaderMaterial
        ref={shaderRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
      />
    </points>
  );
}

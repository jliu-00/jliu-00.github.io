import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
precision highp float;

uniform float uTime;
uniform float uScrollVelocity;
uniform vec2 uMouse;

varying vec2 vUv;

// Bulletproof Apple Silicon Hash
// 1. Avoids sin() which causes massive precision loss on M1/M2/M3
// 2. Scales uv by safe numbers (<2048) to avoid 16-bit float truncation
// 3. Decorrelates adjacent vertices completely to prevent chunky blocks
float hash(vec2 p) {
  p = p * vec2(1234.56, 789.12);
  vec3 p3  = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vUv = uv;
  
  // Base position
  vec3 pos = position;
  
  // Calculate distance from mouse
  vec2 mouseOffset = uv - 0.5;
  float dist = distance(mouseOffset, uMouse);
  float force = smoothstep(0.2, 0.0, dist);
  
  // Mouse repel
  pos.z += force * 2.0;
  pos.x += force * normalize(mouseOffset).x * 2.0;
  pos.y += force * normalize(mouseOffset).y * 2.0;

  // Scroll dispersion based on velocity
  float shatterAmount = clamp(uScrollVelocity, 0.0, 10.0);
  
  // Beautiful Starry Sky Physics
  float randomAngle = hash(uv) * 6.28318;
  float radius = hash(uv + 0.1); 
  
  // Create natural "clusters" or "galaxies" of stars
  float n1 = sin(uv.x * 20.0 + uv.y * 5.0) * cos(uv.y * 15.0 - uv.x * 10.0);
  float n2 = sin(uv.x * 40.0) * cos(uv.y * 40.0);
  float cluster = smoothstep(0.2, 0.8, abs(n1 * n2)); 
  
  // Larger speed for wider scatter coverage
  float speed = (radius * 5.0 + 2.0) * (cluster + 0.6); 
  
  // Strong left bias (-5.0) to reach Jiahong Liu text area
  // Most particles still cluster near the image (cos distribution + cluster weighting)
  float windX = cos(randomAngle) * speed - radius * 5.0; 
  float windY = sin(randomAngle) * speed; 
  float windZ = (hash(uv + 0.2) - 0.5) * 5.0;
  
  pos.x += windX * shatterAmount;
  pos.y += windY * shatterAmount;
  pos.z += windZ * shatterAmount;
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  float baseSize = 100.0;
  gl_PointSize = baseSize * (1.0 / -mvPosition.z) * (cluster * 0.5 + 0.5);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform sampler2D uTexture;
varying vec2 vUv;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);
  if (texColor.a < 0.1) discard; // Don't render invisible pixels
  
  // Make particles slightly circular for a softer star look
  vec2 circCoord = 2.0 * gl_PointCoord - 1.0;
  if (dot(circCoord, circCoord) > 1.0) {
    discard;
  }
  
  gl_FragColor = texColor;
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

export function ParticleImage({ src, width = 4, height = 5, density = 200, scale = 1, onSettled }: ParticleImageProps) {
  useTexture.preload(src);
  const texture = useTexture(src);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const currentShatter = useRef(0);
  const lastScrollY = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const wasShattered = useRef(false);
  const stoppedFrames = useRef(0);
  
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  useFrame((state, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      
      const currentScrollY = window.scrollY;
      const dy = currentScrollY - lastScrollY.current;
      lastScrollY.current = currentScrollY;
      
      const isMoving = Math.abs(dy) > 0.1;
      
      if (isMoving) {
        stoppedFrames.current = 0;
        const desiredVelocity = 4.0 + Math.min(Math.abs(dy) * 0.5, 6.0);
        currentShatter.current = THREE.MathUtils.lerp(currentShatter.current, desiredVelocity, delta * 15.0);
        if (currentShatter.current > 0.1) wasShattered.current = true;
      } else if (currentShatter.current > 0) {
        stoppedFrames.current++;
        // Wait 6 frames (~50ms at 120Hz) to avoid inertia jitter restarting convergence
        if (stoppedFrames.current >= 6) {
          // Slow, dramatic convergence: ~800ms from full scatter to settled
          currentShatter.current = THREE.MathUtils.lerp(currentShatter.current, 0, delta * 4.0);
          if (currentShatter.current < 0.05) {
            currentShatter.current = 0;
            if (wasShattered.current) {
              wasShattered.current = false;
              onSettledRef.current?.();
            }
          }
        }
      }
      
      shaderRef.current.uniforms.uScrollVelocity.value = currentShatter.current;
      
      if (hovered) {
        shaderRef.current.uniforms.uMouse.value.set(state.pointer.x / 2, state.pointer.y / 2);
      } else {
        shaderRef.current.uniforms.uMouse.value.set(999.0, 999.0);
      }
    }
  });

  return (
    <points scale={scale} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <planeGeometry args={[width, height, density, Math.floor(density * (height / width))]} />
      <shaderMaterial
        ref={shaderRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uScrollVelocity: { value: 0 },
          uMouse: { value: new THREE.Vector2(999.0, 999.0) },
          uTexture: { value: texture },
        }}
        transparent={true}
      />
    </points>
  );
}

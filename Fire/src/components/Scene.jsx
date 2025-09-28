import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// RocketExhaust.jsx
// Directional rocket-engine-like exhaust built on top of the original FireParticles.
// - Two layered particle systems: Bright fast core + larger smoky plume
// - Emission in a tight cone aligned with the -Z axis by default (pointing out of a nozzle)
// - Tunable props: countCore, countPlume, spreadAngle, velocity, length, colors, etc.

export default function FireParticles({
  // core (bright, fast, small)
  countCore = 600,
  coreSize = 60.0,
  coreSpeed = 12.0,

  // plume (thicker, slower, smoky)
  countPlume = 900,
  plumeSize = 120.0,
  plumeSpeed = 6.0,

  // geometry
  nozzleRadius = 0.12, // radius of nozzle opening
  length = 6.0, // how far the exhaust travels
  spreadAngle = 12.0 * (Math.PI / 180.0), // degrees -> radians

  // colors
  coreColor = new THREE.Color(0xffd88a), // very hot core
  outerColor = new THREE.Color(0x2a1e1a), // smoky outer plume

  position = [0, 0, 0],
  direction = new THREE.Vector3(0, 0, -1), // exhaust points along -Z by default
}) {
  // Shared helper to create cone-distributed particle attributes
  const makeCone = (count, radius, len) => {
    const positions = new Float32Array(count * 3);
    const aRandom = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // sample a position inside a cone: choose a distance along axis and a radius scaled by that distance
      const t = Math.random(); // 0..1 -> along cone
      const dist = t * len;
      // radius at that distance (linear taper from nozzleRadius -> spread)
      const maxR = nozzleRadius + Math.tan(spreadAngle) * dist;
      const r = Math.random() ** 0.7 * maxR; // bias toward center
      const angle = Math.random() * Math.PI * 2;

      positions[i * 3 + 0] = Math.cos(angle) * r; // x
      positions[i * 3 + 1] = Math.random() * 0.1 - 0.05; // small jitter on y
      positions[i * 3 + 2] = -dist; // along -Z (exiting nozzle)

      aRandom[i] = Math.random();
    }

    return { positions, aRandom };
  };

  const core = useMemo(
    () => makeCone(countCore, nozzleRadius, length),
    [countCore, nozzleRadius, length, spreadAngle]
  );
  const plume = useMemo(
    () => makeCone(countPlume, nozzleRadius * 1.6, length * 1.4),
    [countPlume, nozzleRadius, length, spreadAngle]
  );

  const coreRef = useRef();
  const plumeRef = useRef();
  const coreMat = useRef();
  const plumeMat = useRef();

  useFrame((state, delta) => {
    if (coreMat.current)
      coreMat.current.uniforms.uTime.value += delta * coreSpeed;
    if (plumeMat.current)
      plumeMat.current.uniforms.uTime.value += delta * plumeSpeed;
  });

  // Vertex + fragment shader for directional exhaust particles
  const vertexBase = `
    precision mediump float;
    attribute float aRandom;
    uniform float uTime;
    uniform float uSize;
    uniform float uLength;

    varying float vLife;
    varying float vRand;

    void main() {
      vRand = aRandom;

      // life = how far along the particle was initially (0..1)
      float life = clamp(-position.z / uLength, 0.0, 1.0);
      vLife = life;

      // forward velocity scaled by (1 - life) so particles near nozzle accelerate more
      float forwardSpeed = 1.0 + (1.0 - life) * 2.5;
      float zOffset = mod(uTime * forwardSpeed * (0.8 + aRandom * 0.8), uLength) - (life * uLength);

      // radial expansion + swirl
      float swirl = sin(uTime * (0.5 + aRandom * 3.0) + aRandom * 31.4) * (0.02 + (1.0 - life) * 0.08);
      vec3 pos = position;
      pos.x += swirl + (1.0 - life) * aRandom * 0.08; // push outward near base
      pos.z += zOffset;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // size attenuates with life and distance
      float sizeAtten = (1.0 + (1.0 - life) * 1.2);
      gl_PointSize = uSize * sizeAtten * (300.0 / -mvPosition.z);
    }
  `;

  const fragmentCore = `
    precision mediump float;
    uniform vec3 uColor;
    uniform float uTime;

    varying float vLife;
    varying float vRand;

    void main() {
      vec2 coord = gl_PointCoord - 0.5;
      float dist = length(coord);
      float alpha = smoothstep(0.55, 0.0, dist);

      // core gets a bright, hot falloff.
      float t = pow(1.0 - vLife, 2.2);
      float flick = 0.25 * sin(uTime * (3.0 + vRand * 10.0) + vRand * 12.0);
      t = clamp(t + flick * 0.2, 0.0, 1.0);

      vec3 color = uColor * (0.6 + t * 0.8);
      float coreBoost = smoothstep(0.0, 0.25, 1.0 - dist);
      color += coreBoost * 0.6;

      gl_FragColor = vec4(color, alpha * (0.9 - vLife * 0.9));

      if (gl_FragColor.a < 0.001) discard;
    }
  `;

  const fragmentPlume = `
    precision mediump float;
    uniform vec3 uColorStart;
    uniform vec3 uColorEnd;
    uniform float uTime;

    varying float vLife;
    varying float vRand;

    void main() {
      vec2 coord = gl_PointCoord - 0.5;
      float dist = length(coord);
      float alpha = smoothstep(0.8, 0.0, dist);

      float t = pow(1.0 - vLife, 1.3);
      float flick = 0.1 * sin(uTime * (1.0 + vRand * 4.0) + vRand * 9.0);
      t = clamp(t + flick * 0.15, 0.0, 1.0);

      vec3 color = mix(uColorEnd, uColorStart, t);
      // darken and desaturate further from center
      color *= (0.6 + (1.0 - dist) * 0.5);

      gl_FragColor = vec4(color, alpha * (0.7 - vLife * 0.7));
      if (gl_FragColor.a < 0.001) discard;
    }
  `;

  return (
    <group position={position}>
      {/* CORE: bright, additive */}
      <points ref={coreRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={core.positions.length / 3}
            array={core.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aRandom"
            count={core.aRandom.length}
            array={core.aRandom}
            itemSize={1}
          />
        </bufferGeometry>

        <shaderMaterial
          ref={coreMat}
          vertexShader={vertexBase}
          fragmentShader={fragmentCore}
          uniforms={{
            uTime: { value: 0 },
            uSize: { value: coreSize },
            uLength: { value: length },
            uColor: { value: coreColor },
          }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* PLUME: smoky, larger */}
      <points ref={plumeRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={plume.positions.length / 3}
            array={plume.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aRandom"
            count={plume.aRandom.length}
            array={plume.aRandom}
            itemSize={1}
          />
        </bufferGeometry>

        <shaderMaterial
          ref={plumeMat}
          vertexShader={vertexBase}
          fragmentShader={fragmentPlume}
          uniforms={{
            uTime: { value: 0 },
            uSize: { value: plumeSize },
            uLength: { value: length },
            uColorStart: { value: coreColor },
            uColorEnd: { value: outerColor },
          }}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>

      {/* Optional: ring glow at nozzle exit to sell brightness */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]}>
        <ringGeometry args={[nozzleRadius * 0.5, nozzleRadius * 1.2, 32]} />
        <meshBasicMaterial
          color={coreColor}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

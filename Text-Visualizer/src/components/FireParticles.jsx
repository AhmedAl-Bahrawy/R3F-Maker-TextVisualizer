import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// Realistic Fire Particle System
// 3D volumetric fire that doesn't look at camera and works with small scales

export default function FireParticles({
  // scaling factor for entire fire system
  scale = 1.0,

  // fire core (hot, bright, fast)
  countCore = 400,
  coreSize = 0.15,
  coreSpeed = 8.0,

  // fire plume (cooler, smoky, slower)
  countPlume = 600,
  plumeSize = 0.25,
  plumeSpeed = 4.0,

  // smoke (cool, large, very slow)
  countSmoke = 300,
  smokeSize = 0.4,
  smokeSpeed = 2.0,

  // geometry
  nozzleRadius = 0.12,
  length = 4.0,
  spreadAngle = 25.0 * (Math.PI / 180.0),

  // realistic fire colors
  coreColor = new THREE.Color(0xffff88), // Hot yellow-white
  midColor = new THREE.Color(0xff4400), // Orange-red
  outerColor = new THREE.Color(0x330000), // Dark red-brown
  smokeColor = new THREE.Color(0x111111), // Dark smoke

  position = [0, 0, 0],
  direction = new THREE.Vector3(0, 0, -1),

  // Additional fire parameters
  turbulence = 1.5,
  buoyancy = 0.8,
}) {
  // Create 3D volumetric particle distribution (not billboard sprites)
  const makeVolumetricFire = (count, baseRadius, len, sizeVariation = 1.0) => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);
    const sizes = new Float32Array(count);
    const randoms = new Float32Array(count * 4); // Multiple random values per particle

    for (let i = 0; i < count; i++) {
      // Start particles at nozzle with some initial spread
      const startRadius = Math.random() * baseRadius;
      const startAngle = Math.random() * Math.PI * 2;

      positions[i * 3 + 0] = Math.cos(startAngle) * startRadius;
      positions[i * 3 + 1] = Math.sin(startAngle) * startRadius;
      positions[i * 3 + 2] = Math.random() * 0.1; // Small initial Z spread

      // Initial velocities with turbulence
      const speed = 0.5 + Math.random() * 1.5;
      velocities[i * 3 + 0] = (Math.random() - 0.5) * turbulence * 0.3;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * turbulence * 0.3;
      velocities[i * 3 + 2] = -speed; // Main direction

      lifetimes[i] = Math.random();
      sizes[i] = (0.5 + Math.random() * 0.5) * sizeVariation;

      // Store multiple random values for various effects
      randoms[i * 4 + 0] = Math.random();
      randoms[i * 4 + 1] = Math.random();
      randoms[i * 4 + 2] = Math.random();
      randoms[i * 4 + 3] = Math.random();
    }

    return { positions, velocities, lifetimes, sizes, randoms };
  };

  const fireCore = useMemo(
    () => makeVolumetricFire(countCore, nozzleRadius, length, 1.0),
    [countCore, nozzleRadius, length]
  );

  const firePlume = useMemo(
    () => makeVolumetricFire(countPlume, nozzleRadius * 1.5, length * 1.3, 1.5),
    [countPlume, nozzleRadius, length]
  );

  const fireSmoke = useMemo(
    () => makeVolumetricFire(countSmoke, nozzleRadius * 2.0, length * 2.0, 2.0),
    [countSmoke, nozzleRadius, length]
  );

  const coreRef = useRef();
  const plumeRef = useRef();
  const smokeRef = useRef();
  const coreMat = useRef();
  const plumeMat = useRef();
  const smokeMat = useRef();

  useFrame((state, delta) => {
    if (coreMat.current)
      coreMat.current.uniforms.uTime.value += delta * coreSpeed;
    if (plumeMat.current)
      plumeMat.current.uniforms.uTime.value += delta * plumeSpeed;
    if (smokeMat.current)
      smokeMat.current.uniforms.uTime.value += delta * smokeSpeed;
  });

  // Volumetric vertex shader - particles move in 3D space
  const volumetricVertex = `
    precision highp float;
    
    attribute vec3 velocity;
    attribute float lifetime;
    attribute float size;
    attribute vec4 randoms;
    
    uniform float uTime;
    uniform float uLength;
    uniform float uTurbulence;
    uniform float uBuoyancy;
    uniform float uSpreadAngle;
    
    varying float vLife;
    varying float vIntensity;
    varying vec4 vRandom;
    varying vec3 vWorldPos;
    
    // 3D noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      
      i = mod289(i);
      vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
                                    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                                    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    
    void main() {
      vRandom = randoms;
      
      // Calculate particle age and lifecycle
      float age = mod(uTime + lifetime * 10.0, 4.0);
      float normalizedAge = age / 4.0;
      vLife = normalizedAge;
      
      // Start position with velocity integration
      vec3 pos = position;
      vec3 vel = velocity;
      
      // Add noise-based turbulence over time
      float noiseScale = 0.8;
      float noiseTime = uTime * 0.5 + randoms.x * 10.0;
      
      vec3 turbulentForce = vec3(
        snoise(vec3(pos.xy * noiseScale, noiseTime)),
        snoise(vec3(pos.yx * noiseScale, noiseTime + 5.0)),
        snoise(vec3(pos.zy * noiseScale, noiseTime + 10.0))
      ) * uTurbulence * normalizedAge;
      
      // Apply buoyancy (upward drift as particles cool)
      turbulentForce.y += uBuoyancy * normalizedAge;
      
      // Integrate position over time
      vel += turbulentForce * age * 0.1;
      pos += vel * age;
      
      // Expanding cone shape
      float spreadFactor = 1.0 + normalizedAge * tan(uSpreadAngle) * 2.0;
      pos.xy *= spreadFactor;
      
      // Calculate world position for fragment shader
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPos = worldPos.xyz;
      
      // Calculate intensity based on age and position
      vIntensity = 1.0 - smoothstep(0.0, 1.0, normalizedAge);
      vIntensity *= 1.0 - smoothstep(0.0, uLength, length(pos));
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size based on distance and age
      float finalSize = size * (1.0 + normalizedAge * 2.0);
      gl_PointSize = finalSize * 100.0 / length(mvPosition.xyz);
    }
  `;

  // Realistic fire fragment shader with proper opacity and color mixing
  const fireFragment = `
    precision highp float;
    
    uniform vec3 uCoreColor;
    uniform vec3 uMidColor;
    uniform vec3 uOuterColor;
    uniform float uTime;
    
    varying float vLife;
    varying float vIntensity;
    varying vec4 vRandom;
    varying vec3 vWorldPos;
    
    void main() {
      // Create realistic fire particle shape (not perfect circles)
      vec2 coord = gl_PointCoord - 0.5;
      
      // Distort the shape for more organic look
      float angle = atan(coord.y, coord.x);
      float radius = length(coord);
      
      // Add some noise to the shape
      float shapeNoise = sin(angle * 8.0 + vRandom.x * 20.0 + uTime * 3.0) * 0.1;
      float distortedRadius = radius + shapeNoise * (1.0 - radius);
      
      // Soft falloff
      float alpha = 1.0 - smoothstep(0.0, 0.5, distortedRadius);
      alpha = pow(alpha, 2.0);
      
      // Temperature-based color mixing
      float temp = vIntensity * (1.0 - vLife);
      vec3 color;
      
      if (temp > 0.7) {
        // Hot core - white/yellow
        color = mix(uMidColor, uCoreColor, (temp - 0.7) / 0.3);
      } else if (temp > 0.3) {
        // Mid temperature - orange/red
        color = mix(uOuterColor, uMidColor, (temp - 0.3) / 0.4);
      } else {
        // Cool edges - red/dark
        color = mix(vec3(0.0), uOuterColor, temp / 0.3);
      }
      
      // Add some flickering
      float flicker = 1.0 + sin(uTime * 8.0 + vRandom.y * 10.0) * 0.3 * vIntensity;
      color *= flicker;
      
      // Final alpha based on intensity and age
      float finalAlpha = alpha * vIntensity * (1.0 - vLife * 0.8);
      
      gl_FragColor = vec4(color, finalAlpha);
      
      if (gl_FragColor.a < 0.01) discard;
    }
  `;

  // Smoke fragment shader
  const smokeFragment = `
    precision highp float;
    
    uniform vec3 uSmokeColor;
    uniform float uTime;
    
    varying float vLife;
    varying float vIntensity;
    varying vec4 vRandom;
    
    void main() {
      vec2 coord = gl_PointCoord - 0.5;
      float radius = length(coord);
      
      // Soft smoke particles
      float alpha = 1.0 - smoothstep(0.0, 0.5, radius);
      alpha = pow(alpha, 1.5);
      
      // Smoke gets more transparent as it rises
      float smokeAlpha = vIntensity * (1.0 - vLife) * 0.4;
      
      // Darker smoke color with slight variation
      vec3 color = uSmokeColor * (0.8 + vRandom.z * 0.4);
      
      gl_FragColor = vec4(color, alpha * smokeAlpha);
      
      if (gl_FragColor.a < 0.01) discard;
    }
  `;

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Fire Core - hottest part */}
      <points ref={coreRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={fireCore.positions.length / 3}
            array={fireCore.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-velocity"
            count={fireCore.velocities.length / 3}
            array={fireCore.velocities}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-lifetime"
            count={fireCore.lifetimes.length}
            array={fireCore.lifetimes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-size"
            count={fireCore.sizes.length}
            array={fireCore.sizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-randoms"
            count={fireCore.randoms.length / 4}
            array={fireCore.randoms}
            itemSize={4}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={coreMat}
          vertexShader={volumetricVertex}
          fragmentShader={fireFragment}
          uniforms={{
            uTime: { value: 0 },
            uLength: { value: length },
            uTurbulence: { value: turbulence },
            uBuoyancy: { value: buoyancy * 0.5 },
            uSpreadAngle: { value: spreadAngle },
            uCoreColor: { value: coreColor },
            uMidColor: { value: midColor },
            uOuterColor: { value: outerColor },
          }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Fire Plume - main flame body */}
      <points ref={plumeRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={firePlume.positions.length / 3}
            array={firePlume.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-velocity"
            count={firePlume.velocities.length / 3}
            array={firePlume.velocities}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-lifetime"
            count={firePlume.lifetimes.length}
            array={firePlume.lifetimes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-size"
            count={firePlume.sizes.length}
            array={firePlume.sizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-randoms"
            count={firePlume.randoms.length / 4}
            array={firePlume.randoms}
            itemSize={4}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={plumeMat}
          vertexShader={volumetricVertex}
          fragmentShader={fireFragment}
          uniforms={{
            uTime: { value: 0 },
            uLength: { value: length * 1.3 },
            uTurbulence: { value: turbulence },
            uBuoyancy: { value: buoyancy },
            uSpreadAngle: { value: spreadAngle },
            uCoreColor: { value: midColor },
            uMidColor: { value: outerColor },
            uOuterColor: { value: smokeColor },
          }}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>

      {/* Smoke - cooler outer particles */}
      <points ref={smokeRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={fireSmoke.positions.length / 3}
            array={fireSmoke.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-velocity"
            count={fireSmoke.velocities.length / 3}
            array={fireSmoke.velocities}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-lifetime"
            count={fireSmoke.lifetimes.length}
            array={fireSmoke.lifetimes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-size"
            count={fireSmoke.sizes.length}
            array={fireSmoke.sizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-randoms"
            count={fireSmoke.randoms.length / 4}
            array={fireSmoke.randoms}
            itemSize={4}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={smokeMat}
          vertexShader={volumetricVertex}
          fragmentShader={smokeFragment}
          uniforms={{
            uTime: { value: 0 },
            uLength: { value: length * 2.0 },
            uTurbulence: { value: turbulence * 1.5 },
            uBuoyancy: { value: buoyancy * 1.2 },
            uSpreadAngle: { value: spreadAngle * 1.5 },
            uSmokeColor: { value: smokeColor },
          }}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>
    </group>
  );
}

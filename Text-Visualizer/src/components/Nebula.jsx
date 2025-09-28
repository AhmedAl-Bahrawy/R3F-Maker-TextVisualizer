import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

// Enhanced Nebula Component with Floating Movement
export default function Nebula({
  count = 8,
  minDistance = 150,
  maxDistance = 800,
  separationDistance = 750,
  minScale = 25,
  maxScale = 60,
  baseColor = "#8844ff",
  name = "nebula",
  // New floating parameters
  floatingSpeed = 0.2, // Overall movement speed multiplier
  driftRange = 100, // How far nebulae can drift from their original position
  rotationSpeed = 0.1, // How fast they rotate while floating
}) {
  const groupRef = useRef();

  // Create multiple layered textures for depth
  const textures = useMemo(() => {
    const createNebulaTexture = (size, intensity, blur) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      // Create multiple overlapping gradients for realistic cloud formation
      const centerX = size / 2;
      const centerY = size / 2;

      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Create noise-like patterns
      for (let i = 0; i < 8; i++) {
        const x = centerX + (Math.random() - 0.5) * size * 0.3;
        const y = centerY + (Math.random() - 0.5) * size * 0.3;
        const radius1 = Math.random() * size * 0.1 + size * 0.05;
        const radius2 = radius1 + Math.random() * size * 0.4 + size * 0.2;

        const gradient = ctx.createRadialGradient(x, y, radius1, x, y, radius2);

        // Parse base color and create variations
        const color = new THREE.Color(baseColor);
        const hsl = { h: 0, s: 0, l: 0 };
        color.getHSL(hsl);

        // Create color variations
        const h = hsl.h + (Math.random() - 0.5) * 0.1;
        const s = Math.max(0.3, hsl.s + (Math.random() - 0.5) * 0.3);
        const l = Math.max(0.1, hsl.l + (Math.random() - 0.5) * 0.3);

        const variedColor = new THREE.Color().setHSL(h, s, l);

        gradient.addColorStop(
          0,
          `rgba(${variedColor.r * 255}, ${variedColor.g * 255}, ${
            variedColor.b * 255
          }, ${intensity * 0.8})`
        );
        gradient.addColorStop(
          0.3,
          `rgba(${variedColor.r * 255}, ${variedColor.g * 255}, ${
            variedColor.b * 255
          }, ${intensity * 0.4})`
        );
        gradient.addColorStop(
          0.7,
          `rgba(${variedColor.r * 255}, ${variedColor.g * 255}, ${
            variedColor.b * 255
          }, ${intensity * 0.1})`
        );
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
      }

      // Add some bright core regions
      for (let i = 0; i < 3; i++) {
        const x = centerX + (Math.random() - 0.5) * size * 0.4;
        const y = centerY + (Math.random() - 0.5) * size * 0.4;
        const radius = Math.random() * size * 0.15 + size * 0.05;

        const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const coreColor = new THREE.Color(baseColor);
        coreColor.multiplyScalar(1.5); // Brighten the core

        coreGradient.addColorStop(
          0,
          `rgba(${coreColor.r * 255}, ${coreColor.g * 255}, ${
            coreColor.b * 255
          }, ${intensity * 1.2})`
        );
        coreGradient.addColorStop(
          0.5,
          `rgba(${coreColor.r * 255}, ${coreColor.g * 255}, ${
            coreColor.b * 255
          }, ${intensity * 0.3})`
        );
        coreGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = coreGradient;
        ctx.fillRect(0, 0, size, size);
      }

      return new THREE.CanvasTexture(canvas);
    };

    return [
      createNebulaTexture(512, 0.6, 20),
      createNebulaTexture(256, 0.4, 15),
      createNebulaTexture(128, 0.3, 10),
    ];
  }, [baseColor]);

  // Generate well-separated nebula positions
  const generateSeparatedPositions = (count, minDist, maxDist, separation) => {
    const positions = [];
    let attempts = 0;
    const maxAttempts = 1000;

    while (positions.length < count && attempts < maxAttempts) {
      attempts++;

      // Generate random spherical coordinates
      const distance = Math.random() * (maxDist - minDist) + minDist;
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);

      // Convert to Cartesian coordinates
      const x = distance * Math.sin(theta) * Math.cos(phi);
      const y = distance * Math.sin(theta) * Math.sin(phi);
      const z = distance * Math.cos(theta);

      const newPosition = [x, y, z];

      // Check if this position is far enough from existing ones
      let validPosition = true;
      for (const existingPos of positions) {
        const dist = Math.sqrt(
          Math.pow(newPosition[0] - existingPos[0], 2) +
            Math.pow(newPosition[1] - existingPos[1], 2) +
            Math.pow(newPosition[2] - existingPos[2], 2)
        );
        if (dist < separation) {
          validPosition = false;
          break;
        }
      }

      if (validPosition) {
        positions.push(newPosition);
      }
    }

    return positions;
  };

  const clouds = useMemo(() => {
    const cloudArray = [];
    const nebulaPositions = generateSeparatedPositions(
      count,
      minDistance,
      maxDistance,
      separationDistance
    );

    nebulaPositions.forEach((nebulaCenter, nebulaIndex) => {
      // Create 2-4 layers per nebula for depth
      const layersPerNebula = 2 + Math.floor(Math.random() * 3);

      for (let layer = 0; layer < layersPerNebula; layer++) {
        // Small offset within the nebula
        const layerOffset = [
          nebulaCenter[0] + (Math.random() - 0.5) * 15,
          nebulaCenter[1] + (Math.random() - 0.5) * 15,
          nebulaCenter[2] + (Math.random() - 0.5) * 15,
        ];

        cloudArray.push({
          // Store both original position and current position
          originalPosition: [...layerOffset],
          position: [...layerOffset],
          scale: Math.random() * (maxScale - minScale) + minScale,
          opacity: Math.random() * 0.4 + 0.3,
          rotation: [
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
          ],
          textureIndex: Math.floor(Math.random() * textures.length),
          animationSpeed: (Math.random() - 0.5) * 0.0008,
          animationOffset: Math.random() * Math.PI * 2,
          nebulaId: nebulaIndex,

          // Floating motion parameters
          floatDirection: [
            (Math.random() - 0.5) * 2, // Random direction for X
            (Math.random() - 0.5) * 2, // Random direction for Y
            (Math.random() - 0.5) * 2, // Random direction for Z
          ],
          floatSpeed: Math.random() * floatingSpeed * 0.5 + floatingSpeed * 0.5,
          rotationAxis: [
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
          ],
          rotationSpeed: (Math.random() - 0.5) * rotationSpeed,

          // Orbital motion parameters for more complex movement
          orbitRadius: Math.random() * driftRange * 0.3 + driftRange * 0.2,
          orbitSpeed: (Math.random() - 0.5) * 0.1 + 0.05,
          orbitOffset: Math.random() * Math.PI * 2,

          // Sine wave parameters for natural floating
          sineAmplitude: [
            Math.random() * driftRange * 0.4 + driftRange * 0.1,
            Math.random() * driftRange * 0.4 + driftRange * 0.1,
            Math.random() * driftRange * 0.4 + driftRange * 0.1,
          ],
          sineFrequency: [
            Math.random() * 0.3 + 0.1,
            Math.random() * 0.3 + 0.1,
            Math.random() * 0.3 + 0.1,
          ],
          sineOffset: [
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
          ],
        });
      }
    });

    return cloudArray;
  }, [
    count,
    minDistance,
    maxDistance,
    separationDistance,
    minScale,
    maxScale,
    textures.length,
    floatingSpeed,
    driftRange,
  ]);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;

      groupRef.current.children.forEach((child, i) => {
        const cloud = clouds[i];
        if (cloud && child.material) {
          // Opacity animation (breathing effect)
          child.material.opacity =
            cloud.opacity + Math.sin(time * 0.3 + cloud.animationOffset) * 0.08;

          // Complex floating motion combining multiple movement patterns

          // 1. Sine wave motion for natural floating
          const sineX =
            Math.sin(time * cloud.sineFrequency[0] + cloud.sineOffset[0]) *
            cloud.sineAmplitude[0];
          const sineY =
            Math.sin(time * cloud.sineFrequency[1] + cloud.sineOffset[1]) *
            cloud.sineAmplitude[1];
          const sineZ =
            Math.sin(time * cloud.sineFrequency[2] + cloud.sineOffset[2]) *
            cloud.sineAmplitude[2];

          // 2. Orbital motion for larger-scale movement
          const orbitAngle = time * cloud.orbitSpeed + cloud.orbitOffset;
          const orbitX = Math.cos(orbitAngle) * cloud.orbitRadius;
          const orbitY = Math.sin(orbitAngle) * cloud.orbitRadius * 0.5; // Flatter orbit
          const orbitZ = Math.sin(orbitAngle * 0.7) * cloud.orbitRadius * 0.3;

          // 3. Linear drift
          const driftX = cloud.floatDirection[0] * time * cloud.floatSpeed;
          const driftY = cloud.floatDirection[1] * time * cloud.floatSpeed;
          const driftZ = cloud.floatDirection[2] * time * cloud.floatSpeed;

          // Combine all motion types
          child.position.x =
            cloud.originalPosition[0] + sineX + orbitX + driftX;
          child.position.y =
            cloud.originalPosition[1] + sineY + orbitY + driftY;
          child.position.z =
            cloud.originalPosition[2] + sineZ + orbitZ + driftZ;

          // Gentle rotation while floating
          child.rotation.x +=
            cloud.rotationAxis[0] * cloud.rotationSpeed * 0.01;
          child.rotation.y +=
            cloud.rotationAxis[1] * cloud.rotationSpeed * 0.01;
          child.rotation.z +=
            cloud.rotationAxis[2] * cloud.rotationSpeed * 0.01 +
            cloud.animationSpeed;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, i) => (
        <sprite
          key={`${name}-${i}`}
          position={cloud.position}
          scale={[cloud.scale, cloud.scale, 1]}
        >
          <spriteMaterial
            map={textures[cloud.textureIndex]}
            opacity={cloud.opacity}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}

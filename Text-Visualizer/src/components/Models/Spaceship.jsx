import React from "react";
import { useGLTF } from "@react-three/drei";
import FireParticles from "../FireParticles";
import * as THREE from "three";

const GLTF_LOADER = "Models/Spaceship.glb";

export function Spaceship(props) {
  const { nodes, materials } = useGLTF(GLTF_LOADER);

  // Main engines (larger, more powerful)
  const mainEngines = [
    {
      name: "MainEngine_Left",
      position: [-1.2, -1.4, -2.5],
    },
    {
      name: "MainEngine_Right",
      position: [1.2, -1.4, -2.5],
    },
  ];

  // Maneuvering thrusters (smaller, more agile)
  const maneuveringThrusters = [
    {
      name: "Thruster_TopLeft",
      position: [-1.2, 1.4, -2.2],
    },
    {
      name: "Thruster_TopRight",
      position: [1.2, 1.4, -2.2],
    },
  ];

  return (
    <group {...props} dispose={null}>
      {/* Main spaceship mesh */}
      <mesh
        geometry={nodes.Spaceship_BarbaraTheBee?.geometry}
        material={materials.Atlas}
        scale={100}
      />

      {/* Main Engine Exhausts - Large and Powerful */}
      {mainEngines.map((engine) => (
        <FireParticles
          key={`main-${engine.name}`}
          position={engine.position}
          scale={1.0} // Now works at normal scale!
          // Fire intensity
          countCore={300}
          countPlume={500}
          countSmoke={200}
          // Particle sizes (now in world units)
          coreSize={0.1}
          plumeSize={0.15}
          smokeSize={0.25}
          // Engine geometry
          nozzleRadius={0.08}
          length={3.0}
          spreadAngle={20.0 * (Math.PI / 180.0)}
          // Rocket engine colors (blue plasma core)
          coreColor={new THREE.Color(0xaaccff)}
          midColor={new THREE.Color(0x4488ff)}
          outerColor={new THREE.Color(0x1144aa)}
          smokeColor={new THREE.Color(0x002244)}
          // Fire behavior
          turbulence={2.0} // More chaotic for rocket engines
          buoyancy={0.3} // Less buoyancy in space
        />
      ))}

      {/* Maneuvering Thrusters - Smaller and More Precise */}
      {maneuveringThrusters.map((thruster) => (
        <FireParticles
          key={`thruster-${thruster.name}`}
          position={thruster.position}
          scale={0.5} // Smaller scale for thrusters
          // Smaller thruster characteristics
          countCore={150}
          countPlume={250}
          countSmoke={100}
          // Smaller particles
          coreSize={0.06}
          plumeSize={0.09}
          smokeSize={0.15}
          // Smaller nozzle and length
          nozzleRadius={0.04}
          length={1.5}
          spreadAngle={18.0 * (Math.PI / 180.0)}
          // Slightly different thruster colors
          coreColor={new THREE.Color(0xffffaa)} // Yellow-white
          midColor={new THREE.Color(0xffaa44)} // Orange-yellow
          outerColor={new THREE.Color(0xff8800)} // Orange-red
          smokeColor={new THREE.Color(0x442200)} // Dark orange smoke
          // Higher speed for thrusters
          coreSpeed={20.0}
          plumeSpeed={14.0}
          smokeSpeed={8.0}
        />
      ))}

      {/* Optional: Engine glow effects */}
      {mainEngines.map((engine, index) => (
        <pointLight
          key={`glow-main-${index}`}
          position={[
            engine.position[0],
            engine.position[1],
            engine.position[2] - 0.5,
          ]}
          color={0x4488ff}
          intensity={0.8}
          distance={3}
          decay={2}
        />
      ))}

      {maneuveringThrusters.map((thruster, index) => (
        <pointLight
          key={`glow-thruster-${index}`}
          position={[
            thruster.position[0],
            thruster.position[1],
            thruster.position[2] - 0.3,
          ]}
          color={0xffaa44}
          intensity={0.4}
          distance={2}
          decay={2}
        />
      ))}
    </group>
  );
}

useGLTF.preload(GLTF_LOADER);

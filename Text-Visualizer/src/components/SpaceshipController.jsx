// components/SpaceshipController.jsx
import React, { forwardRef } from "react";
import { Float } from "@react-three/drei";

const SpaceshipController = forwardRef(({ children }, ref) => {
  return (
    <group ref={ref} position={[0, 0, 0]} scale={0.5}>
      {children}
    </group>
  );
});

SpaceshipController.displayName = "SpaceshipController";

export default SpaceshipController;

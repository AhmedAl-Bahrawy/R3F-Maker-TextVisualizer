import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
  Stats,
  Environment,
} from "@react-three/drei";
import { Leva, useControls } from "leva";
import { Suspense } from "react";
import FireParticles from "./components/Scene";

function App() {
  const { showStats, showGizmo } = useControls({
    showStats: { value: true },
    showGizmo: { value: true },
  });

  return (
    <div id="canvas-container">
      <Leva />
      {showStats && <Stats />}

      <Canvas
        shadows
        camera={{ position: [5, 5, 5], fov: 60 }}
        style={{ height: "100vh", width: "100vw" }}
      >
        <Suspense fallback={null}>
          <Environment preset="city" />

          {showGizmo && (
            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
              <GizmoViewport />
            </GizmoHelper>
          )}

          {/* Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />

          {/* Scene */}
          <FireParticles
            count={900}
            radius={0.8}
            height={2.4}
            size={50}
            speed={1.2}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;

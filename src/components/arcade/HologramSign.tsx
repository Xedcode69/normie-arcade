"use client";

import { Float, Html } from "@react-three/drei";

export function HologramSign() {
  return (
    <Float speed={1.2} floatIntensity={0.2}>
      <group position={[0, 3.9, 1]}>
        <mesh>
          <boxGeometry args={[5.2, 0.08, 0.08]} />
          <meshBasicMaterial color="#25f4ee" transparent opacity={0.75} />
        </mesh>
        <Html transform center position={[0, 0.35, 0]} distanceFactor={8}>
          <div className="neon-text text-center font-display text-3xl uppercase tracking-[0.25em] text-cyanGlow">
            Normie Arcade
            <div className="mt-1 text-xs tracking-[0.4em] text-magentaGlow">On-chain Neon Casino</div>
          </div>
        </Html>
      </group>
    </Float>
  );
}

"use client";

import { Float, Html } from "@react-three/drei";

export function HologramSign() {
  return (
    <Float speed={1.2} floatIntensity={0.2}>
      <group position={[0, 3.9, 1]}>
        <mesh>
          <boxGeometry args={[5.2, 0.08, 0.08]} />
          <meshBasicMaterial color="#f4f1e8" transparent opacity={0.7} />
        </mesh>
        <Html transform center position={[0, 0.35, 0]} distanceFactor={8}>
          <div className="neon-text text-center font-display text-3xl uppercase tracking-[0.25em] text-paper">
            Normie Arcade
            <div className="terminal-hash mt-1 text-xs tracking-[0.4em] text-pixel">On-chain Bitmap Casino</div>
          </div>
        </Html>
      </group>
    </Float>
  );
}

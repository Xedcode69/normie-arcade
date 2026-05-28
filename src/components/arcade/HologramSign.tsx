"use client";

import { Float, Html } from "@react-three/drei";
import { useArcadeStore } from "@/stores/arcadeStore";

export function HologramSign() {
  const activeGame = useArcadeStore((state) => state.activeGame);

  return (
    <Float speed={1.2} floatIntensity={0.2}>
      <group position={[0, 3.9, 1]}>
        <mesh>
          <boxGeometry args={[5.2, 0.08, 0.08]} />
          <meshBasicMaterial color="#f4f1e8" transparent opacity={0.7} />
        </mesh>
        {activeGame === "lobby" ? (
          <Html transform center position={[0, 0.35, 0]} distanceFactor={8} zIndexRange={[20, 0]}>
            <div className="neon-text text-center font-display text-3xl uppercase tracking-[0.25em] text-paper">
              Normie Arcade
              <div className="terminal-hash mt-1 text-xs tracking-[0.4em] text-pixel">On-chain Bitmap Casino</div>
            </div>
          </Html>
        ) : null}
      </group>
    </Float>
  );
}

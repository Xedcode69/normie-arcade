"use client";

import { Float, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { useArcadeStore, type Dealer, type GameId } from "@/stores/arcadeStore";

type Props = {
  id: Exclude<GameId, "lobby">;
  label: string;
  position: [number, number, number];
  accent: string;
  dealer: Dealer;
};

export function GameTable({ id, label, position, accent, dealer }: Props) {
  const setActiveGame = useArcadeStore((state) => state.setActiveGame);
  const activeGame = useArcadeStore((state) => state.activeGame);
  const group = useRef<Group>(null);
  const active = activeGame === id;

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.6 + position[0]) * 0.035;
    group.current.scale.setScalar(active ? 1.08 : 1);
  });

  return (
    <Float speed={1.1} rotationIntensity={0.03} floatIntensity={0.08}>
      <group ref={group} position={position} onClick={() => setActiveGame(id)}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.55, 1.85, 0.42, 72]} />
          <meshStandardMaterial color="#0a0a0a" emissive={accent} emissiveIntensity={active ? 0.24 : 0.1} metalness={0.45} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.15, 1.52, 96]} />
          <meshBasicMaterial color={accent} transparent opacity={active ? 0.72 : 0.42} />
        </mesh>
        <Html center transform position={[0, 0.72, 0]} distanceFactor={7}>
          <button
            className="hud-panel min-w-44 border px-4 py-3 text-center uppercase tracking-[0.18em] transition hover:scale-105"
            style={{ borderColor: accent, color: accent }}
          >
            <span className="terminal-hash block text-[10px] text-paper/70">{dealer?.persona ?? "Normie Dealer"}</span>
            <span className="mt-1 block text-xs">{label}</span>
          </button>
        </Html>
      </group>
    </Float>
  );
}

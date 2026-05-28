"use client";

import { Float } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { useArcadeStore, type Dealer } from "@/stores/arcadeStore";
import { NormieVoxel } from "./NormieVoxel";

export function NormieDealer({ dealer, position }: { dealer: Dealer; position: [number, number, number] }) {
  const group = useRef<Group>(null);
  const activeGame = useArcadeStore((state) => state.activeGame);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 1.4 + position[0]) * 0.025;
  });

  return (
    <Float speed={1.7} floatIntensity={0.15} rotationIntensity={0.04}>
      <group ref={group} position={position}>
        <NormieVoxel normie={dealer.normie} label={dealer.role} scale={0.5} accent="#f4f1e8" showLabel={activeGame === "lobby"} />
      </group>
    </Float>
  );
}

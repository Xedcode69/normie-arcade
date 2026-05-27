"use client";

import { Html, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import type { Normie } from "@/types/normie";

type Props = {
  normie?: Normie;
  label?: string;
  accent?: string;
  scale?: number;
  seated?: boolean;
  pose?: "idle" | "walking" | "playing" | "talking";
  animated?: boolean;
  showLabel?: boolean;
};

export function NormieVoxel({
  normie,
  label,
  accent = "#f4f1e8",
  scale = 1,
  seated = false,
  pose = "idle",
  animated = true,
  showLabel = true
}: Props) {
  const root = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const head = useRef<Group>(null);
  const texture = useTexture(normie?.image ?? "/normie-placeholder.svg");
  texture.colorSpace = "srgb";
  texture.magFilter = 1003;
  texture.minFilter = 1003;

  useFrame(({ clock }) => {
    if (!animated) return;
    const t = clock.elapsedTime;
    const walking = pose === "walking";
    const talking = pose === "talking";
    const playing = pose === "playing";
    if (root.current) root.current.position.y = Math.sin(t * (walking ? 7 : 1.8)) * (walking ? 0.045 : 0.025);
    if (head.current) head.current.rotation.y = Math.sin(t * (talking ? 3.2 : 1.2)) * (talking ? 0.18 : 0.06);
    if (leftArm.current) leftArm.current.rotation.x = playing ? -0.9 + Math.sin(t * 4.4) * 0.12 : Math.sin(t * (walking ? 7 : 1.7)) * (walking ? 0.55 : 0.1);
    if (rightArm.current) rightArm.current.rotation.x = playing ? -0.9 - Math.sin(t * 4.2) * 0.12 : -Math.sin(t * (walking ? 7 : 1.5)) * (walking ? 0.55 : 0.1);
  });

  return (
    <group ref={root} scale={scale}>
      <group>
        <mesh castShadow position={[0, seated ? 0.46 : 0.35, 0]}>
          <boxGeometry args={[0.7, seated ? 0.72 : 0.92, 0.36]} />
          <meshStandardMaterial color="#111111" emissive={accent} emissiveIntensity={0.08} metalness={0.18} roughness={0.36} />
        </mesh>
        <mesh castShadow position={[0, seated ? 0.92 : 1.18, 0]}>
          <boxGeometry args={[0.82, 0.82, 0.2]} />
          <meshStandardMaterial color="#f4f1e8" roughness={0.3} />
        </mesh>
        <group ref={head} position={[0, seated ? 0.92 : 1.18, 0]}>
          <mesh position={[0, 0, 0.108]}>
            <planeGeometry args={[0.72, 0.72]} />
            <meshBasicMaterial map={texture} transparent />
          </mesh>
          <mesh position={[0, 0.49, 0]}>
            <boxGeometry args={[0.9, 0.18, 0.26]} />
            <meshStandardMaterial color="#080808" emissive={accent} emissiveIntensity={0.08} roughness={0.35} />
          </mesh>
          <mesh position={[-0.5, 0.03, 0]}>
            <boxGeometry args={[0.1, 0.72, 0.24]} />
            <meshStandardMaterial color="#080808" roughness={0.35} />
          </mesh>
          <mesh position={[0.5, 0.03, 0]}>
            <boxGeometry args={[0.1, 0.72, 0.24]} />
            <meshStandardMaterial color="#080808" roughness={0.35} />
          </mesh>
        </group>

        <group ref={leftArm} position={[-0.52, seated ? 0.64 : 0.62, 0]}>
          <mesh castShadow position={[0, -0.28, seated ? 0.14 : 0]}>
            <boxGeometry args={[0.22, 0.72, 0.24]} />
            <meshStandardMaterial color="#101010" emissive={accent} emissiveIntensity={0.06} roughness={0.4} />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.52, seated ? 0.64 : 0.62, 0]}>
          <mesh castShadow position={[0, -0.28, seated ? 0.14 : 0]}>
            <boxGeometry args={[0.22, 0.72, 0.24]} />
            <meshStandardMaterial color="#101010" emissive={accent} emissiveIntensity={0.06} roughness={0.4} />
          </mesh>
        </group>

        {seated ? (
          <>
            <mesh castShadow position={[-0.22, 0.02, 0.22]} rotation={[1.1, 0, 0]}>
              <boxGeometry args={[0.24, 0.58, 0.22]} />
              <meshStandardMaterial color="#181818" roughness={0.44} />
            </mesh>
            <mesh castShadow position={[0.22, 0.02, 0.22]} rotation={[1.1, 0, 0]}>
              <boxGeometry args={[0.24, 0.58, 0.22]} />
              <meshStandardMaterial color="#181818" roughness={0.44} />
            </mesh>
          </>
        ) : (
          <>
            <mesh castShadow position={[-0.21, -0.47, 0]}>
              <boxGeometry args={[0.25, 0.72, 0.26]} />
              <meshStandardMaterial color="#181818" roughness={0.44} />
            </mesh>
            <mesh castShadow position={[0.21, -0.47, 0]}>
              <boxGeometry args={[0.25, 0.72, 0.26]} />
              <meshStandardMaterial color="#181818" roughness={0.44} />
            </mesh>
          </>
        )}
      </group>
      {showLabel ? (
        <Html transform center position={[0, seated ? 1.58 : 1.86, 0]} distanceFactor={5.3}>
          <div className="flex flex-col items-center gap-1">
            <div className="h-0 w-0 border-x-[6px] border-t-[10px] border-x-transparent drop-shadow-[0_0_8px_rgba(244,241,232,0.75)]" style={{ borderTopColor: accent }} />
            <div className="border border-paper/70 bg-black/75 px-2 py-1 text-center shadow-neon">
              <div className="text-[8px] uppercase tracking-widest" style={{ color: accent }}>
                {label ?? "Normie"}
              </div>
            </div>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

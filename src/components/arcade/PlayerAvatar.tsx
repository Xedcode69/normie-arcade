"use client";

import { Html, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import { useArcadeStore } from "@/stores/arcadeStore";
import { usePlayerStore } from "@/stores/playerStore";

const bounds = {
  minX: -7.4,
  maxX: 7.4,
  minZ: -4.9,
  maxZ: 5.2
};

export function PlayerAvatar() {
  const group = useRef<Group>(null);
  const body = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const face = useRef<Group>(null);
  const keys = useRef<Record<string, boolean>>({});
  const moving = useRef(false);
  const normie = useArcadeStore((state) => state.loadedNormies[0]);
  const touchMove = usePlayerStore((state) => state.touchMove);
  const setPosition = usePlayerStore((state) => state.setPosition);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = true;
    };
    const up = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;

    const keyX = (keys.current.d || keys.current.arrowright ? 1 : 0) - (keys.current.a || keys.current.arrowleft ? 1 : 0);
    const keyZ = (keys.current.s || keys.current.arrowdown ? 1 : 0) - (keys.current.w || keys.current.arrowup ? 1 : 0);
    const x = keyX || touchMove.x;
    const z = keyZ || touchMove.z;
    const length = Math.hypot(x, z) || 1;
    const speed = 3.15;
    moving.current = Boolean(x || z);

    if (x || z) {
      group.current.position.x = Math.min(bounds.maxX, Math.max(bounds.minX, group.current.position.x + (x / length) * speed * delta));
      group.current.position.z = Math.min(bounds.maxZ, Math.max(bounds.minZ, group.current.position.z + (z / length) * speed * delta));
      group.current.rotation.y = Math.atan2(x, z);
    }

    const t = clock.elapsedTime;
    group.current.position.y = 0.72 + Math.sin(t * (moving.current ? 10 : 2.1)) * (moving.current ? 0.045 : 0.025);

    if (body.current) body.current.rotation.z = Math.sin(t * 2.4) * (moving.current ? 0.035 : 0.015);
    if (face.current) face.current.rotation.y = Math.sin(t * 1.4) * 0.045;
    if (leftArm.current) leftArm.current.rotation.x = Math.sin(t * 8) * (moving.current ? 0.72 : 0.12);
    if (rightArm.current) rightArm.current.rotation.x = -Math.sin(t * 8) * (moving.current ? 0.72 : 0.12);
    if (leftLeg.current) leftLeg.current.rotation.x = -Math.sin(t * 8) * (moving.current ? 0.62 : 0.04);
    if (rightLeg.current) rightLeg.current.rotation.x = Math.sin(t * 8) * (moving.current ? 0.62 : 0.04);

    setPosition({ x: group.current.position.x, z: group.current.position.z });
  });

  return (
    <group ref={group} position={[0, 0.72, 3.2]}>
      <group ref={body} scale={0.78}>
        <mesh castShadow position={[0, 0.35, 0]}>
          <boxGeometry args={[0.7, 0.92, 0.36]} />
          <meshStandardMaterial color="#15182b" emissive="#25f4ee" emissiveIntensity={0.18} metalness={0.25} roughness={0.34} />
        </mesh>
        <mesh castShadow position={[0, 0.92, 0]}>
          <boxGeometry args={[0.86, 0.18, 0.42]} />
          <meshStandardMaterial color="#25293d" emissive="#f846d8" emissiveIntensity={0.08} metalness={0.2} roughness={0.38} />
        </mesh>

        <group ref={leftArm} position={[-0.52, 0.62, 0]}>
          <mesh castShadow position={[0, -0.28, 0]}>
            <boxGeometry args={[0.22, 0.72, 0.24]} />
            <meshStandardMaterial color="#111827" emissive="#25f4ee" emissiveIntensity={0.12} roughness={0.4} />
          </mesh>
          <mesh castShadow position={[0, -0.7, 0]}>
            <boxGeometry args={[0.24, 0.18, 0.26]} />
            <meshStandardMaterial color="#f6f3ea" roughness={0.42} />
          </mesh>
        </group>

        <group ref={rightArm} position={[0.52, 0.62, 0]}>
          <mesh castShadow position={[0, -0.28, 0]}>
            <boxGeometry args={[0.22, 0.72, 0.24]} />
            <meshStandardMaterial color="#111827" emissive="#f846d8" emissiveIntensity={0.12} roughness={0.4} />
          </mesh>
          <mesh castShadow position={[0, -0.7, 0]}>
            <boxGeometry args={[0.24, 0.18, 0.26]} />
            <meshStandardMaterial color="#f6f3ea" roughness={0.42} />
          </mesh>
        </group>

        <group ref={leftLeg} position={[-0.21, -0.13, 0]}>
          <mesh castShadow position={[0, -0.34, 0]}>
            <boxGeometry args={[0.25, 0.72, 0.26]} />
            <meshStandardMaterial color="#22253a" roughness={0.44} />
          </mesh>
          <mesh castShadow position={[0, -0.75, 0.08]}>
            <boxGeometry args={[0.3, 0.16, 0.42]} />
            <meshStandardMaterial color="#070910" emissive="#25f4ee" emissiveIntensity={0.08} roughness={0.36} />
          </mesh>
        </group>

        <group ref={rightLeg} position={[0.21, -0.13, 0]}>
          <mesh castShadow position={[0, -0.34, 0]}>
            <boxGeometry args={[0.25, 0.72, 0.26]} />
            <meshStandardMaterial color="#22253a" roughness={0.44} />
          </mesh>
          <mesh castShadow position={[0, -0.75, 0.08]}>
            <boxGeometry args={[0.3, 0.16, 0.42]} />
            <meshStandardMaterial color="#070910" emissive="#f846d8" emissiveIntensity={0.08} roughness={0.36} />
          </mesh>
        </group>

        <group ref={face} position={[0, 1.18, 0]}>
          <NormieHead image={normie?.image} />
          <mesh position={[0, 0.49, 0]}>
            <boxGeometry args={[0.9, 0.18, 0.26]} />
            <meshStandardMaterial color="#111827" emissive="#25f4ee" emissiveIntensity={0.12} roughness={0.35} />
          </mesh>
          <mesh position={[-0.5, 0.03, 0]}>
            <boxGeometry args={[0.1, 0.72, 0.24]} />
            <meshStandardMaterial color="#111827" roughness={0.35} />
          </mesh>
          <mesh position={[0.5, 0.03, 0]}>
            <boxGeometry args={[0.1, 0.72, 0.24]} />
            <meshStandardMaterial color="#111827" roughness={0.35} />
          </mesh>
        </group>
      </group>
      <mesh position={[0, -0.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.46, 0.58, 48]} />
        <meshBasicMaterial color="#25f4ee" transparent opacity={0.55} />
      </mesh>
      <Html transform center position={[0, 1.52, 0]} distanceFactor={5.2}>
        <div className="h-0 w-0 border-x-[7px] border-t-[12px] border-x-transparent border-t-cyanGlow drop-shadow-[0_0_10px_rgba(37,244,238,0.9)]" />
      </Html>
    </group>
  );
}

function NormieHead({ image }: { image?: string }) {
  const texture = useTexture(image ?? "/normie-placeholder.svg");
  texture.colorSpace = "srgb";
  texture.magFilter = 1003;
  texture.minFilter = 1003;

  return (
    <>
      <mesh castShadow>
        <boxGeometry args={[0.82, 0.82, 0.2]} />
        <meshStandardMaterial color="#f6f3ea" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.108]}>
        <planeGeometry args={[0.72, 0.72]} />
        <meshBasicMaterial map={texture} transparent />
      </mesh>
    </>
  );
}

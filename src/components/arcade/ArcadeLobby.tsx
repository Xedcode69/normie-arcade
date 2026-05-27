"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Html, PerspectiveCamera, Stars } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import { AdditiveBlending } from "three";
import { GameTable } from "./GameTable";
import { NormieDealer } from "./NormieDealer";
import { HologramSign } from "./HologramSign";
import { useNormiePreload } from "@/hooks/useNormiePreload";
import { useArcadeStore } from "@/stores/arcadeStore";
import type { Normie } from "@/types/normie";
import { usePlayerStore } from "@/stores/playerStore";
import { PlayerAvatar } from "./PlayerAvatar";
import { NormieVoxel } from "./NormieVoxel";

export function ArcadeLobby() {
  useNormiePreload();

  return (
    <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true }}>
      <color attach="background" args={["#080710"]} />
      <fog attach="fog" args={["#090712", 8, 30]} />
      <PerspectiveCamera makeDefault position={[0, 6.2, 12]} fov={48} />
      <Suspense fallback={null}>
        <LobbyScene />
      </Suspense>
    </Canvas>
  );
}

function LobbyScene() {
  const activeGame = useArcadeStore((state) => state.activeGame);
  const dealers = useArcadeStore((state) => state.dealers);
  const loadedNormies = useArcadeStore((state) => state.loadedNormies);
  const playerPosition = usePlayerStore((state) => state.position);
  const rig = useRef<Group>(null);

  useFrame(({ clock, camera }) => {
    const targetX = activeGame === "roulette" ? -4.8 : activeGame === "rps" ? 0 : activeGame === "updown" ? 4.8 : 0;
    if (activeGame === "lobby") {
      camera.position.x += (playerPosition.x - camera.position.x) * 0.06;
      camera.position.y += (4.7 - camera.position.y) * 0.04;
      camera.position.z += (playerPosition.z + 7.4 - camera.position.z) * 0.05;
      camera.lookAt(playerPosition.x, 0.9, playerPosition.z - 0.8);
    } else {
      camera.position.x += (targetX - camera.position.x) * 0.035;
      camera.position.y = 6.2 + Math.sin(clock.elapsedTime * 0.4) * 0.08;
      camera.position.z += (12 - camera.position.z) * 0.04;
      camera.lookAt(targetX * 0.25, 0.7, 0);
    }
    if (rig.current) rig.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.015;
  });

  return (
    <group ref={rig}>
      <ambientLight intensity={0.35} />
      <pointLight position={[-6, 5, 4]} intensity={85} color="#25f4ee" />
      <pointLight position={[6, 5, 4]} intensity={70} color="#f846d8" />
      <spotLight position={[0, 9, 7]} angle={0.44} penumbra={0.7} intensity={115} color="#ffffff" castShadow />
      <MovingLights />
      <Environment preset="night" />
      <Stars radius={40} depth={20} count={900} factor={2.6} saturation={0} fade speed={0.25} />
      <CasinoFloor />
      <CeilingGrid />
      <HologramSign />
      <GameTable id="roulette" label="Expression Roulette" position={[-5.2, 0.72, 0]} accent="#25f4ee" dealer={dealers[0]} />
      <GameTable id="rps" label="Type RPS Arena" position={[0, 0.72, -0.8]} accent="#f846d8" dealer={dealers[1]} />
      <GameTable id="updown" label="Up or Down" position={[5.2, 0.72, 0]} accent="#d6ff38" dealer={dealers[2]} />
      <Cashier normie={dealers[3]?.normie ?? loadedNormies[4]} />
      <PlayerAvatar />
      {dealers.slice(0, 3).map((dealer, index) => (
        <NormieDealer
          key={dealer.role}
          dealer={dealer}
          position={[-5.2 + index * 5.2, 1.42, -1.35 - (index === 1 ? 0.8 : 0)]}
        />
      ))}
      <NormieCrowd normies={loadedNormies.slice(5, 13)} />
    </group>
  );
}

function CasinoFloor() {
  const grid = useMemo(() => Array.from({ length: 34 }, (_, index) => index), []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 16, 1, 1]} />
        <meshStandardMaterial color="#151120" roughness={0.18} metalness={0.56} />
      </mesh>
      {grid.map((line) => {
        const offset = -8 + line * 0.5;
        return (
          <mesh key={line} position={[offset, 0.012, 0]} rotation={[-Math.PI / 2, 0, Math.sin(line) * 0.8]}>
            <planeGeometry args={[0.028, 18]} />
            <meshBasicMaterial
              color={line % 3 === 0 ? "#25f4ee" : line % 3 === 1 ? "#f846d8" : "#ffb84d"}
              transparent
              opacity={0.45}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function CeilingGrid() {
  return (
    <group position={[0, 5.4, -1]}>
      {Array.from({ length: 9 }, (_, index) => (
        <mesh key={`beam-x-${index}`} position={[-8 + index * 2, 0, 0]}>
          <boxGeometry args={[0.05, 0.05, 12]} />
          <meshStandardMaterial color="#1b1624" emissive="#3c1b53" emissiveIntensity={0.45} />
        </mesh>
      ))}
      {Array.from({ length: 7 }, (_, index) => (
        <mesh key={`beam-z-${index}`} position={[0, 0, -6 + index * 2]}>
          <boxGeometry args={[18, 0.05, 0.05]} />
          <meshStandardMaterial color="#1b1624" emissive="#112c44" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function MovingLights() {
  const lightA = useRef<Mesh>(null);
  const lightB = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (lightA.current) lightA.current.position.x = Math.sin(t * 0.7) * 7;
    if (lightB.current) lightB.current.position.x = Math.cos(t * 0.55) * 7;
  });

  return (
    <>
      <mesh ref={lightA} position={[0, 4.9, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.1, 48]} />
        <meshBasicMaterial color="#25f4ee" transparent opacity={0.16} blending={AdditiveBlending} />
      </mesh>
      <mesh ref={lightB} position={[0, 4.92, -4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.1, 48]} />
        <meshBasicMaterial color="#f846d8" transparent opacity={0.14} blending={AdditiveBlending} />
      </mesh>
    </>
  );
}

function NormieCrowd({ normies }: { normies: Normie[] }) {
  const placements: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    pose: "idle" | "walking" | "playing" | "talking";
    accent: string;
  }> = [
    { position: [-7.1, 0.72, -4.7], rotation: [0, 0.5, 0], pose: "playing", accent: "#25f4ee" },
    { position: [-5.8, 0.72, -4.2], rotation: [0, -0.55, 0], pose: "talking", accent: "#f846d8" },
    { position: [-2.7, 0.72, -4.8], rotation: [0, 0.18, 0], pose: "walking", accent: "#ffb84d" },
    { position: [2.4, 0.72, -4.7], rotation: [0, -0.25, 0], pose: "walking", accent: "#d6ff38" },
    { position: [5.6, 0.72, -4.2], rotation: [0, 0.65, 0], pose: "talking", accent: "#25f4ee" },
    { position: [7.0, 0.72, -4.8], rotation: [0, -0.75, 0], pose: "playing", accent: "#f846d8" },
    { position: [-7.2, 0.72, 1.7], rotation: [0, 1.2, 0], pose: "idle", accent: "#d6ff38" },
    { position: [6.1, 0.72, 1.5], rotation: [0, -1.1, 0], pose: "talking", accent: "#ffb84d" }
  ];

  return (
    <group>
      {normies.map((normie, index) => (
        <Float key={normie.id} speed={1.1 + index * 0.08} floatIntensity={0.04} rotationIntensity={0.02}>
          <group position={placements[index].position} rotation={placements[index].rotation}>
            {placements[index].pose === "playing" ? <MiniMachine accent={placements[index].accent} /> : null}
            {placements[index].pose === "talking" ? <SpeechPulse accent={placements[index].accent} /> : null}
            <NormieVoxel
              normie={normie}
              scale={0.46}
              accent={placements[index].accent}
              pose={placements[index].pose}
              showLabel={false}
            />
          </group>
        </Float>
      ))}
    </group>
  );
}

function MiniMachine({ accent }: { accent: string }) {
  return (
    <group position={[0, 0.24, 0.55]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.76, 0.88, 0.32]} />
        <meshStandardMaterial color="#11101c" emissive={accent} emissiveIntensity={0.22} metalness={0.45} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0.12, -0.17]}>
        <planeGeometry args={[0.48, 0.38]} />
        <meshBasicMaterial color={accent} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, -0.37, 0.08]}>
        <boxGeometry args={[0.58, 0.08, 0.34]} />
        <meshStandardMaterial color="#070910" emissive="#ffb84d" emissiveIntensity={0.08} />
      </mesh>
    </group>
  );
}

function SpeechPulse({ accent }: { accent: string }) {
  return (
    <group position={[0.42, 1.4, 0]}>
      <mesh>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={accent} transparent opacity={0.65} />
      </mesh>
      <mesh position={[0.14, 0.1, 0]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={accent} transparent opacity={0.45} />
      </mesh>
      <mesh position={[0.25, 0.2, 0]}>
        <sphereGeometry args={[0.032, 16, 16]} />
        <meshBasicMaterial color={accent} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function Cashier({ normie }: { normie?: Normie }) {
  return (
    <group position={[7.2, 0.72, 3.5]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.2, 1]} />
        <meshStandardMaterial color="#181426" emissive="#ffb84d" emissiveIntensity={0.16} metalness={0.55} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.72, -0.12]} castShadow receiveShadow>
        <boxGeometry args={[2.45, 0.18, 1.15]} />
        <meshStandardMaterial color="#2a1725" emissive="#ffb84d" emissiveIntensity={0.18} metalness={0.35} roughness={0.25} />
      </mesh>
      <group position={[0, 0.82, -0.42]}>
        <NormieVoxel normie={normie} label="Chip Master" accent="#ffb84d" scale={0.5} seated />
      </group>
      <ChipStacks />
      <Float speed={1.2} floatIntensity={0.16}>
        <Html transform position={[0, 1.45, 0.42]} distanceFactor={5.2}>
          <div className="rounded border border-amberChip/60 bg-black/75 px-3 py-2 text-center shadow-magenta">
            <div className="text-[9px] uppercase tracking-widest text-amberChip">Chip Master</div>
            <div className="text-[7px] text-white/45">#{normie?.id ?? "----"}</div>
          </div>
        </Html>
      </Float>
    </group>
  );
}

function ChipStacks() {
  const colors = ["#25f4ee", "#f846d8", "#ffb84d", "#d6ff38"];

  return (
    <group position={[0, 0.9, 0.12]}>
      {Array.from({ length: 14 }, (_, index) => {
        const x = -0.78 + (index % 7) * 0.26;
        const z = index < 7 ? -0.08 : 0.18;
        const height = 0.05 + (index % 4) * 0.025;
        return (
          <group key={index} position={[x, height * 0.5, z]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.095, 0.095, height, 28]} />
              <meshStandardMaterial color={colors[index % colors.length]} emissive={colors[index % colors.length]} emissiveIntensity={0.18} metalness={0.4} roughness={0.24} />
            </mesh>
            <mesh position={[0, height / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.045, 0.075, 24]} />
              <meshBasicMaterial color="#fff7d6" transparent opacity={0.75} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

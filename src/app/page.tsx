"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { HUD } from "@/components/hud/HUD";
import { NotificationSystem } from "@/components/hud/NotificationSystem";
import { GameDock } from "@/components/games/GameDock";
import { Leaderboard } from "@/components/hud/Leaderboard";
import { AudioBoot } from "@/components/audio/AudioBoot";
import { LobbyControls } from "@/components/hud/LobbyControls";
import { PlayerControls } from "@/components/hud/PlayerControls";

const ArcadeLobby = dynamic(() => import("@/components/arcade/ArcadeLobby").then((mod) => mod.ArcadeLobby), {
  ssr: false,
  loading: () => <div className="grid h-screen place-items-center bg-void text-cyanGlow">Booting neon floor...</div>
});

export default function Home() {
  return (
    <main className="relative h-screen overflow-hidden bg-void text-white">
      <Suspense fallback={<div className="grid h-screen place-items-center">Loading arcade...</div>}>
        <ArcadeLobby />
      </Suspense>
      <HUD />
      <Leaderboard />
      <LobbyControls />
      <PlayerControls />
      <GameDock />
      <NotificationSystem />
      <AudioBoot />
    </main>
  );
}

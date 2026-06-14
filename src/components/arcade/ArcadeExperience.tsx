"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { AudioBoot } from "@/components/audio/AudioBoot";
import { ArcadeAuthGate } from "@/components/auth/ArcadeAuthGate";
import { GameDock } from "@/components/games/GameDock";
import { HUD } from "@/components/hud/HUD";
import { CommunityGames } from "@/components/hud/CommunityGames";
import { Leaderboard } from "@/components/hud/Leaderboard";
import { LobbyHelp } from "@/components/hud/LobbyHelp";
import { LobbyControls } from "@/components/hud/LobbyControls";
import { LobbyHotkeys } from "@/components/hud/LobbyHotkeys";
import { NotificationSystem } from "@/components/hud/NotificationSystem";
import { PlayerControls } from "@/components/hud/PlayerControls";

const ArcadeLobby = dynamic(() => import("@/components/arcade/ArcadeLobby").then((mod) => mod.ArcadeLobby), {
  ssr: false,
  loading: () => <div className="grid h-screen place-items-center bg-void text-paper terminal-hash">Booting bitmap floor...</div>
});

export function ArcadeExperience() {
  return (
    <main className="bitmap-bg relative h-screen overflow-hidden bg-void text-paper">
      <ArcadeAuthGate />
      <Suspense fallback={<div className="grid h-screen place-items-center">Loading arcade...</div>}>
        <ArcadeLobby />
      </Suspense>
      <HUD />
      <CommunityGames />
      <Leaderboard />
      <LobbyHelp />
      <LobbyControls />
      <PlayerControls />
      <GameDock />
      <NotificationSystem />
      <AudioBoot />
      <LobbyHotkeys />
    </main>
  );
}

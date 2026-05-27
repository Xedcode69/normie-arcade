"use client";

import { CircleDot, Joystick, TrendingUp } from "lucide-react";
import { useArcadeStore, type GameId } from "@/stores/arcadeStore";

const stations: Array<{ id: Exclude<GameId, "lobby">; label: string; icon: React.ReactNode; color: string }> = [
  { id: "roulette", label: "Roulette", icon: <CircleDot size={16} />, color: "text-paper border-paper/70" },
  { id: "rps", label: "RPS Arena", icon: <Joystick size={16} />, color: "text-paper border-paper/70" },
  { id: "updown", label: "Up or Down", icon: <TrendingUp size={16} />, color: "text-paper border-paper/70" }
];

export function LobbyControls() {
  const activeGame = useArcadeStore((state) => state.activeGame);
  const setActiveGame = useArcadeStore((state) => state.setActiveGame);

  if (activeGame !== "lobby") return null;

  return (
    <nav className="pointer-events-auto absolute bottom-5 left-1/2 z-30 hidden -translate-x-1/2 gap-2 md:flex">
      {stations.map((station) => (
        <button
          key={station.id}
          onClick={() => setActiveGame(station.id)}
          className={`hud-panel inline-flex items-center gap-2 border px-4 py-3 text-sm uppercase tracking-widest transition hover:scale-[1.03] ${station.color}`}
        >
          {station.icon}
          {station.label}
        </button>
      ))}
    </nav>
  );
}

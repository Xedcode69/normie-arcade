"use client";

import { CircleDot, Dices, Joystick, TrendingUp } from "lucide-react";
import { useArcadeStore, type GameId } from "@/stores/arcadeStore";

const stations: Array<{ id: Exclude<GameId, "lobby">; label: string; shortcut: string; icon: React.ReactNode; color: string }> = [
  { id: "roulette", label: "Roulette", shortcut: "1", icon: <CircleDot size={16} />, color: "text-paper border-paper/70" },
  { id: "rps", label: "RPS Arena", shortcut: "2", icon: <Joystick size={16} />, color: "text-paper border-paper/70" },
  { id: "poker", label: "DNA Poker", shortcut: "3", icon: <Dices size={16} />, color: "text-paper border-paper/70" },
  { id: "updown", label: "Up or Down", shortcut: "4", icon: <TrendingUp size={16} />, color: "text-paper border-paper/70" }
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
          <span className="border border-paper/30 px-1.5 py-0.5 text-[10px] text-pixel/70">{station.shortcut}</span>
        </button>
      ))}
      <button
        onClick={() =>
          useArcadeStore.getState().notify({
            kind: "info",
            title: "Chip Master",
            body: "Chip purchase and withdraw support will arrive in a future update."
          })
        }
        className="hud-panel inline-flex items-center gap-2 border border-paper/70 px-4 py-3 text-sm uppercase tracking-widest text-paper transition hover:scale-[1.03]"
      >
        Chip Master
        <span className="border border-paper/30 px-1.5 py-0.5 text-[10px] text-pixel/70">C</span>
      </button>
    </nav>
  );
}

"use client";

import type { ReactNode } from "react";
import { CircleDot, Dices, Flame, Gamepad2, Joystick, Layers3, Search, Shapes, Shell, TrendingUp, X } from "lucide-react";
import { useArcadeStore, type GameId } from "@/stores/arcadeStore";

const stations: Array<{ id: Exclude<GameId, "lobby">; label: string; shortcut: string; icon: ReactNode; description: string }> = [
  { id: "roulette", label: "Roulette District", shortcut: "1", icon: <CircleDot size={16} />, description: "Neon expression casino" },
  { id: "rps", label: "RPS Arena", shortcut: "2", icon: <Joystick size={16} />, description: "Fixed-stake battle station" },
  { id: "poker", label: "DNA Poker Club", shortcut: "3", icon: <Dices size={16} />, description: "Private trait lounge" },
  { id: "updown", label: "Prediction Tower", shortcut: "4", icon: <TrendingUp size={16} />, description: "Up/Down terminal" },
  { id: "sort", label: "Sort Sprint Depot", shortcut: "5", icon: <Shapes size={16} />, description: "Transit sorting station" },
  { id: "pixel", label: "Pixel Detective", shortcut: "6", icon: <Search size={16} />, description: "Fragment ID lab" },
  { id: "whack", label: "Whack-A-Normie", shortcut: "7", icon: <Flame size={16} />, description: "Burn yard whack grid" },
  { id: "tcg", label: "Circuit Clash", shortcut: "8", icon: <Layers3 size={16} />, description: "PvP Normie TCG" },
  { id: "shells", label: "Normie Shells", shortcut: "9", icon: <Shell size={16} />, description: "Shuffle tracking table" }
];

export function LobbyControls() {
  const activeGame = useArcadeStore((state) => state.activeGame);
  const gameMenuOpen = useArcadeStore((state) => state.gameMenuOpen);
  const setActiveGame = useArcadeStore((state) => state.setActiveGame);
  const setGameMenuOpen = useArcadeStore((state) => state.setGameMenuOpen);
  const toggleGameMenu = useArcadeStore((state) => state.toggleGameMenu);

  if (activeGame !== "lobby") return null;

  return (
    <nav className="pointer-events-auto absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-3">
      {gameMenuOpen ? (
        <div className="hud-panel w-[min(92vw,34rem)] border border-paper/65 p-3 shadow-neon">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-paper/20 pb-3">
            <div>
              <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">Normie City</div>
              <div className="font-display text-sm uppercase tracking-[0.22em] text-paper">District Directory</div>
            </div>
            <button
              aria-label="Close games menu"
              onClick={() => setGameMenuOpen(false)}
              className="grid h-8 w-8 place-items-center border border-paper/40 bg-black/70 text-paper/70 transition hover:text-paper"
            >
              <X size={15} />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {stations.map((station) => (
              <button
                key={station.id}
                onClick={() => setActiveGame(station.id)}
                className="group grid min-h-20 grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-3 border border-paper/25 bg-black/70 px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-mint/70 hover:bg-paper/10"
              >
                <span className="grid h-8 w-8 place-items-center border border-paper/30 text-paper/75 group-hover:border-mint/70 group-hover:text-mint">
                  {station.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm uppercase tracking-[0.15em] text-paper">{station.label}</span>
                  <span className="mt-1 block truncate text-[11px] text-paper/50">{station.description}</span>
                </span>
                <span className="justify-self-end border border-paper/30 px-2 py-1 text-[10px] uppercase text-pixel/75 group-hover:border-mint/70 group-hover:text-mint">
                  {station.shortcut}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <button
        onClick={toggleGameMenu}
        className="hud-panel inline-flex items-center gap-2 border border-paper/70 px-5 py-3 text-sm uppercase tracking-widest text-paper transition hover:scale-[1.03] hover:border-mint/80"
      >
        <Gamepad2 size={16} />
        Games
        <span className="border border-paper/30 px-1.5 py-0.5 text-[10px] text-pixel/70">G</span>
      </button>
    </nav>
  );
}

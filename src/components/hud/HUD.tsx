"use client";

import { Gamepad2, Volume2, VolumeX } from "lucide-react";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useAudioStore } from "@/stores/audioStore";
import { CreditSystem } from "./CreditSystem";

export function HUD() {
  const activeGame = useArcadeStore((state) => state.activeGame);
  const muted = useAudioStore((state) => state.muted);
  const toggleMuted = useAudioStore((state) => state.toggleMuted);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 md:p-5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="hud-panel pointer-events-auto px-4 py-3">
          <div className="font-display text-sm uppercase tracking-[0.32em] text-paper neon-text">Normie Arcade</div>
          <div className="terminal-hash mt-1 text-xs text-pixel/70">Live API dealers, chips, and bitmap tables</div>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <CreditSystem />
          <Metric icon={<Gamepad2 size={16} />} label="Game" value={activeGame} />
          <button
            aria-label="Toggle audio"
            onClick={toggleMuted}
            className="grid h-11 w-11 place-items-center hud-panel text-paper/70 transition hover:text-paper"
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="hud-panel flex min-w-28 items-center gap-2 px-3 py-2">
      <span className="text-paper">{icon}</span>
      <span>
        <span className="terminal-hash block text-[9px] uppercase tracking-widest text-pixel/55">{label}</span>
        <span className="block text-sm capitalize text-paper">{value}</span>
      </span>
    </div>
  );
}

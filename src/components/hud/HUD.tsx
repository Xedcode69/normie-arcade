"use client";

import { Gamepad2, Volume2, VolumeX } from "lucide-react";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useAudioStore } from "@/stores/audioStore";
import { AuthButton } from "./AuthButton";
import { CreditSystem } from "./CreditSystem";
import { ProfileButton } from "./ProfileButton";
import { RotateScreenButton } from "./RotateScreenButton";

export function HUD() {
  const activeGame = useArcadeStore((state) => state.activeGame);
  const muted = useAudioStore((state) => state.muted);
  const toggleMuted = useAudioStore((state) => state.toggleMuted);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 py-3 md:px-5">
      <div className="mx-auto flex max-w-7xl justify-end">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-end gap-1.5 rounded-sm border border-paper/15 bg-black/35 p-1.5 shadow-[0_0_28px_rgba(34,255,225,0.08)] backdrop-blur-sm">
          <AuthButton />
          <ProfileButton />
          <CreditSystem />
          <Metric icon={<Gamepad2 size={16} />} label="Game" value={activeGame} />
          <RotateScreenButton />
          <button
            aria-label="Toggle audio"
            onClick={toggleMuted}
            className="grid h-9 w-9 place-items-center border border-paper/25 bg-black/65 text-paper/65 transition hover:border-paper/55 hover:text-paper"
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
    <div className="flex h-9 min-w-24 items-center gap-2 border border-paper/25 bg-black/65 px-2.5">
      <span className="text-paper/70">{icon}</span>
      <span>
        <span className="terminal-hash block text-[8px] uppercase tracking-widest text-pixel/45">{label}</span>
        <span className="block text-xs capitalize leading-none text-paper">{value}</span>
      </span>
    </div>
  );
}

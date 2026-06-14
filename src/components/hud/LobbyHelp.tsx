"use client";

import { BookOpen, Coins, HelpCircle, Keyboard, Users, X } from "lucide-react";
import { useState } from "react";
import { useArcadeStore } from "@/stores/arcadeStore";

const lobbyGuide = [
  {
    title: "Pick A District",
    detail: "Click any station on the city map or use hotkeys 1-8 to open a game.",
    icon: <Keyboard size={15} />
  },
  {
    title: "Use Chips",
    detail: "Solo casino games use your chip balance. PvP rooms reserve chips before matches settle.",
    icon: <Coins size={15} />
  },
  {
    title: "Play PvP",
    detail: "RPS, DNA Poker, and Circuit Clash support invite rooms, reconnects, and live opponents.",
    icon: <Users size={15} />
  },
  {
    title: "Read Rules",
    detail: "Open a game and press the ? button for full rules, combo lists, payouts, and controls.",
    icon: <BookOpen size={15} />
  }
];

export function LobbyHelp() {
  const activeGame = useArcadeStore((state) => state.activeGame);
  const [open, setOpen] = useState(false);

  if (activeGame !== "lobby") return null;

  return (
    <aside className="pointer-events-auto fixed right-3 top-32 z-[132] md:right-5">
      <button
        type="button"
        aria-label="Open how to play guide"
        onClick={() => setOpen(true)}
        className="grid h-11 w-11 place-items-center hud-panel text-mint transition hover:scale-105"
      >
        <HelpCircle size={17} />
      </button>
      {open ? (
        <div className="mt-2 w-[min(92vw,28rem)] border border-mint/45 bg-black/92 p-4 shadow-neon backdrop-blur-md">
          <div className="mb-3 flex items-start justify-between gap-4 border-b border-paper/15 pb-3">
            <div>
              <div className="terminal-hash text-[10px] uppercase tracking-[0.24em] text-mint/70">How To Play</div>
              <h2 className="mt-1 font-display text-base uppercase tracking-[0.18em] text-paper">Arcade Guide</h2>
            </div>
            <button
              type="button"
              aria-label="Close how to play guide"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 shrink-0 place-items-center border border-paper/35 bg-black/80 text-paper/65 transition hover:text-paper"
            >
              <X size={15} />
            </button>
          </div>
          <div className="grid gap-2">
            {lobbyGuide.map((item) => (
              <div key={item.title} className="border border-paper/15 bg-black/50 p-3">
                <div className="flex items-center gap-2 text-mint">
                  <span className="grid h-7 w-7 shrink-0 place-items-center border border-mint/45 bg-mint/10">{item.icon}</span>
                  <div className="font-display text-[11px] uppercase tracking-[0.14em] text-paper">{item.title}</div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-paper/60">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

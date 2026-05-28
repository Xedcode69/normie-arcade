"use client";

import { Minus, Plus } from "lucide-react";
import { clampBet, formatChips } from "@/lib/gameMath";
import { useChipStore } from "@/stores/chipStore";

export function BetControls({ bet, setBet }: { bet: number; setBet: (bet: number) => void }) {
  const balance = useChipStore((state) => state.balance);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        className="grid h-9 w-9 place-items-center border border-paper/40 bg-black/70 transition hover:border-paper"
        onClick={() => setBet(clampBet(bet - 50, balance))}
        aria-label="Lower bet"
      >
        <Minus size={16} />
      </button>
      <div className="min-w-32 border-2 border-paper bg-black/80 px-3 py-2 text-center text-sm text-paper shadow-neon">
        {formatChips(bet)} chips
      </div>
      <button
        className="grid h-9 w-9 place-items-center border border-paper/40 bg-black/70 transition hover:border-paper"
        onClick={() => setBet(clampBet(bet + 50, balance))}
        aria-label="Raise bet"
      >
        <Plus size={16} />
      </button>
      {[100, 250, 500].map((value) => (
        <button
          key={value}
          onClick={() => setBet(clampBet(value, balance))}
          className="border border-paper/30 bg-black/60 px-3 py-2 text-xs text-paper/75 transition hover:border-paper hover:text-paper"
        >
          {value}
        </button>
      ))}
    </div>
  );
}

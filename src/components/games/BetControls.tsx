"use client";

import { Minus, Plus } from "lucide-react";
import { clampBet, formatChips } from "@/lib/gameMath";
import { useChipStore } from "@/stores/chipStore";

export function BetControls({ bet, setBet }: { bet: number; setBet: (bet: number) => void }) {
  const balance = useChipStore((state) => state.balance);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="grid h-9 w-9 place-items-center rounded border border-white/15 bg-white/5"
        onClick={() => setBet(clampBet(bet - 50, balance))}
        aria-label="Lower bet"
      >
        <Minus size={16} />
      </button>
      <div className="min-w-32 rounded border border-amberChip/40 bg-black/35 px-3 py-2 text-center text-sm text-amberChip">
        {formatChips(bet)} chips
      </div>
      <button
        className="grid h-9 w-9 place-items-center rounded border border-white/15 bg-white/5"
        onClick={() => setBet(clampBet(bet + 50, balance))}
        aria-label="Raise bet"
      >
        <Plus size={16} />
      </button>
      {[100, 250, 500].map((value) => (
        <button
          key={value}
          onClick={() => setBet(clampBet(value, balance))}
          className="rounded border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:border-cyanGlow"
        >
          {value}
        </button>
      ))}
    </div>
  );
}

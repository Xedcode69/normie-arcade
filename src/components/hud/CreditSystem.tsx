"use client";

import { Coins, RotateCcw, Zap } from "lucide-react";
import { formatChips } from "@/lib/gameMath";
import { useChipStore } from "@/stores/chipStore";

export function CreditSystem() {
  const balance = useChipStore((state) => state.balance);
  const streak = useChipStore((state) => state.streak);
  const multiplier = useChipStore((state) => state.multiplier);
  const reset = useChipStore((state) => state.reset);

  return (
    <>
      <Metric icon={<Coins size={16} />} label="Chips" value={formatChips(balance)} />
      <Metric icon={<Zap size={16} />} label="Streak" value={`${streak} / ${multiplier.toFixed(1)}x`} />
      <button
        aria-label="Reset chips"
        onClick={reset}
        className="grid h-11 w-11 place-items-center rounded-lg hud-panel text-white/70 transition hover:text-white"
      >
        <RotateCcw size={17} />
      </button>
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="hud-panel flex min-w-28 items-center gap-2 rounded-lg px-3 py-2">
      <span className="text-amberChip">{icon}</span>
      <span>
        <span className="block text-[9px] uppercase tracking-widest text-white/40">{label}</span>
        <span className="block text-sm capitalize text-white">{value}</span>
      </span>
    </div>
  );
}

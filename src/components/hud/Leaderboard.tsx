"use client";

import { Trophy } from "lucide-react";
import { useState } from "react";
import { useArcadeStore } from "@/stores/arcadeStore";
import { NormieImage } from "@/components/normies/NormieImage";

export function Leaderboard() {
  const normies = useArcadeStore((state) => state.loadedNormies);
  const [open, setOpen] = useState(false);
  const leaders = normies.slice(8, 13);

  return (
    <aside className="pointer-events-auto absolute right-3 top-32 z-40 md:right-5">
      <button
        aria-label="Toggle leaderboard"
        onClick={() => setOpen((value) => !value)}
        className="ml-auto grid h-11 w-11 place-items-center rounded-lg hud-panel text-amberChip transition hover:scale-105"
      >
        <Trophy size={17} />
      </button>
      {open ? (
        <div className="mt-2 w-60 rounded-lg hud-panel p-3">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amberChip">
            <Trophy size={15} /> Leaderboard
          </div>
          <div className="space-y-2">
            {leaders.length
              ? leaders.map((normie, index) => (
                  <div key={normie.id} className="flex items-center gap-2 rounded border border-white/10 bg-white/5 p-2">
                    <NormieImage src={normie.image} alt={`Leaderboard Normie ${normie.id}`} className="h-9 w-9" />
                    <div className="min-w-0">
                      <div className="truncate text-xs text-white">#{normie.id}</div>
                      <div className="text-[10px] text-white/45">{(5 - index) * 1200} chips</div>
                    </div>
                  </div>
                ))
              : Array.from({ length: 5 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded bg-white/10" />)}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

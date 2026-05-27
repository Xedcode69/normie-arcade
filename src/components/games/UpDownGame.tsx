"use client";

import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { useState } from "react";
import { NormieAPIService } from "@/services/NormieAPIService";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useChipStore } from "@/stores/chipStore";
import type { Normie } from "@/types/normie";
import { playTone } from "@/lib/audio";
import { NormieImage } from "@/components/normies/NormieImage";

export function UpDownGame() {
  const [base, setBase] = useState(5000);
  const [round, setRound] = useState(1);
  const [active, setActive] = useState(true);
  const [lastNormie, setLastNormie] = useState<Normie | null>(null);
  const [message, setMessage] = useState("Survive 10 predictions. Base starts at 5000.");
  const win = useChipStore((state) => state.win);
  const lose = useChipStore((state) => state.lose);
  const notify = useArcadeStore((state) => state.notify);

  async function predict(direction: "higher" | "lower") {
    if (!active) return;
    const normie = await NormieAPIService.getRandomNormie();
    setLastNormie(normie);
    const correct = direction === "higher" ? normie.id > base : normie.id < base;

    if (correct) {
      const nextRound = round + 1;
      setBase(normie.id);
      playTone(620 + round * 18, 0.15, "triangle");
      if (round >= 10) {
        setActive(false);
        win(1500);
        setMessage(`Terminal cleared. Normie #${normie.id} completed the tenth read.`);
        notify({ kind: "win", title: "Prediction run cleared", body: "10-round survival bonus paid." });
      } else {
        setRound(nextRound);
        setMessage(`Correct. Normie #${normie.id} becomes the new base.`);
      }
    } else {
      setActive(false);
      lose();
      playTone(170, 0.25, "square");
      setMessage(`Wrong read. Normie #${normie.id} ended the run.`);
      notify({ kind: "loss", title: "Prediction failed", body: "Reset the terminal for another run." });
    }
  }

  function reset() {
    setBase(5000);
    setRound(1);
    setActive(true);
    setLastNormie(null);
    setMessage("Survive 10 predictions. Base starts at 5000.");
  }

  return (
    <div className="pr-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl uppercase tracking-[0.2em] text-acid">Up or Down</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/60">{message}</p>
        </div>
        <div className="rounded border border-acid/50 bg-acid/10 px-4 py-2 text-sm text-acid">Round {round}/10</div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <button
          disabled={!active}
          onClick={() => predict("lower")}
          className="inline-flex items-center justify-center gap-2 rounded border border-white/15 bg-white/5 px-4 py-4 text-lg text-white disabled:opacity-45"
        >
          <ArrowDown /> Lower
        </button>
        <div className="text-center">
          <div className="font-display text-5xl text-acid neon-text">{base}</div>
          <div className="mt-2 text-xs uppercase tracking-[0.3em] text-white/45">Current Base</div>
        </div>
        <button
          disabled={!active}
          onClick={() => predict("higher")}
          className="inline-flex items-center justify-center gap-2 rounded border border-white/15 bg-white/5 px-4 py-4 text-lg text-white disabled:opacity-45"
        >
          Higher <ArrowUp />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button onClick={reset} className="inline-flex items-center gap-2 rounded border border-white/15 bg-black/35 px-4 py-2 text-sm text-white/80">
          <RotateCcw size={16} /> Reset Terminal
        </button>
        {lastNormie ? (
          <div className="flex items-center gap-3 rounded border border-white/15 bg-black/35 p-2">
            <NormieImage src={lastNormie.image} alt={`Normie ${lastNormie.id}`} className="h-16 w-16" />
            <div>
              <div className="text-sm text-white">Normie #{lastNormie.id}</div>
              <div className="text-xs text-white/50">{lastNormie.traits.Expression ?? "Unknown"} expression</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

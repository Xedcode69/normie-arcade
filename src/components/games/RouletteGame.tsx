"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { NormieAPIService } from "@/services/NormieAPIService";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useChipStore } from "@/stores/chipStore";
import type { Normie, NormieExpression } from "@/types/normie";
import { BetControls } from "./BetControls";
import { playTone } from "@/lib/audio";
import { NormieImage } from "@/components/normies/NormieImage";

const difficulty = {
  easy: { label: "Easy", count: 3, payout: 3 },
  medium: { label: "Medium", count: 4, payout: 8 },
  hard: { label: "Hard", count: 5, payout: 18 }
} as const;

type Difficulty = keyof typeof difficulty;

export function RouletteGame() {
  const [mode, setMode] = useState<Difficulty>("easy");
  const [bet, setBet] = useState(100);
  const [normies, setNormies] = useState<Array<Normie & { rouletteExpression: NormieExpression }>>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("Choose difficulty, place chips, reveal matching expressions.");
  const wager = useChipStore((state) => state.wager);
  const win = useChipStore((state) => state.win);
  const lose = useChipStore((state) => state.lose);
  const notify = useArcadeStore((state) => state.notify);
  const cardSlots: Array<(Normie & { rouletteExpression: NormieExpression }) | null> = normies.length
    ? normies
    : Array.from({ length: difficulty[mode].count }, () => null);

  async function spin() {
    const config = difficulty[mode];
    if (!wager(bet)) {
      notify({ kind: "loss", title: "Not enough chips", body: "Lower the table bet." });
      return;
    }

    setLoading(true);
    setNormies([]);
    setResult("Roulette matrix is decoding expressions...");
    playTone(360, 0.12, "sawtooth");
    const drawn = await NormieAPIService.getRouletteNormies(config.count);
    setNormies(drawn);
    const expressions = drawn.map((normie) => normie.rouletteExpression);
    const won = expressions.every((expression) => expression === expressions[0]);

    if (won) {
      const payout = bet * config.payout;
      win(payout);
      setResult(`Jackpot: all ${expressions[0]}. Paid ${payout} chips.`);
      notify({ kind: "win", title: "Expression jackpot", body: `${config.payout}x payout hit.` });
      playTone(760, 0.24, "triangle");
    } else {
      lose();
      setResult(`No match: ${expressions.join(" / ")}.`);
      notify({ kind: "loss", title: "Roulette miss", body: "The expressions split." });
      playTone(180, 0.22, "square");
    }

    setLoading(false);
  }

  return (
    <div className="pr-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl uppercase tracking-[0.2em] text-cyanGlow">Normie Expression Roulette</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/60">{result}</p>
        </div>
        <button
          onClick={spin}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded border border-cyanGlow/60 bg-cyanGlow/10 px-4 py-2 text-sm uppercase tracking-widest text-cyanGlow shadow-neon disabled:opacity-50"
        >
          <Sparkles size={16} /> Spin
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {(Object.keys(difficulty) as Difficulty[]).map((key) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`rounded border px-4 py-2 text-xs uppercase tracking-widest ${
              mode === key ? "border-cyanGlow bg-cyanGlow/15 text-cyanGlow" : "border-white/15 bg-white/5 text-white/65"
            }`}
          >
            {difficulty[key].label} {difficulty[key].payout}x
          </button>
        ))}
        <BetControls bet={bet} setBet={setBet} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-5">
        {cardSlots.map((normie, index) => (
          <motion.div
            key={normie ? normie.id : `slot-${index}`}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ delay: index * 0.08 }}
            className="rounded border border-white/15 bg-black/35 p-2 text-center"
          >
            {normie ? (
              <NormieImage src={normie.image} alt={`Normie ${normie.id}`} className="mx-auto aspect-square w-full max-w-28 object-cover" />
            ) : (
              <div className="mx-auto aspect-square w-full max-w-28 animate-pulse bg-white/10" />
            )}
            <div className="mt-2 text-xs text-white/60">#{normie ? normie.id : "----"}</div>
            <div className="text-sm text-cyanGlow">{normie ? normie.rouletteExpression : "Spinning"}</div>
            {normie ? <div className="mt-1 text-[10px] text-white/40">Trait: {normie.traits.Expression ?? "Unknown"}</div> : null}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

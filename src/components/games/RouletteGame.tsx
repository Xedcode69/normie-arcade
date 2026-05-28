"use client";

import { motion } from "framer-motion";
import { RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { NormieAPIService } from "@/services/NormieAPIService";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useChipStore } from "@/stores/chipStore";
import { EXPRESSIONS, type Normie } from "@/types/normie";
import { BetControls } from "./BetControls";
import { playTone } from "@/lib/audio";
import { CenteredNormieImage } from "@/components/normies/CenteredNormieImage";

const difficulty = {
  easy: { label: "Easy", count: 3, payout: 3 },
  medium: { label: "Medium", count: 4, payout: 8 },
  hard: { label: "Hard", count: 5, payout: 18 }
} as const;

type Difficulty = keyof typeof difficulty;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function RouletteGame() {
  const [mode, setMode] = useState<Difficulty>("easy");
  const [bet, setBet] = useState(100);
  const [normies, setNormies] = useState<Array<Normie | null>>([]);
  const [loading, setLoading] = useState(false);
  const [activeColumn, setActiveColumn] = useState<number | null>(null);
  const [result, setResult] = useState<string>("Choose difficulty, place chips, reveal matching expressions.");
  const [roundResult, setRoundResult] = useState<string>("Ready for the next expression run.");
  const wager = useChipStore((state) => state.wager);
  const win = useChipStore((state) => state.win);
  const lose = useChipStore((state) => state.lose);
  const notify = useArcadeStore((state) => state.notify);
  const cardSlots = normies.length ? normies : Array.from({ length: difficulty[mode].count }, () => null);

  async function spin() {
    const config = difficulty[mode];
    if (!wager(bet)) {
      notify({ kind: "loss", title: "Not enough chips", body: "Lower the table bet." });
      return;
    }

    setLoading(true);
    setNormies(Array.from({ length: config.count }, () => null));
    setRoundResult("Round in progress...");
    setResult("Column 1 is spinning through expression symbols...");
    playTone(360, 0.12, "sawtooth");
    const drawn: Normie[] = [];

    for (let index = 0; index < config.count; index += 1) {
      setActiveColumn(index);
      setResult(`Column ${index + 1} is spinning. Fetching a Normie...`);
      playTone(320 + index * 55, 0.1, "sawtooth");

      const [normie] = await Promise.all([NormieAPIService.getRandomNormie(), wait(900)]);
      drawn.push(normie);
      setNormies((current) => current.map((item, itemIndex) => (itemIndex === index ? normie : item)));
      setResult(`Column ${index + 1} stopped on ${normie.traits.Expression ?? "Unknown"}.`);
      playTone(520 + index * 70, 0.12, "triangle");
      await wait(420);
    }

    setActiveColumn(null);
    const expressions = drawn.map((normie) => normie.traits.Expression ?? "Unknown");
    const won = expressions.every((expression) => expression === expressions[0]);

    if (won) {
      const payout = bet * config.payout;
      win(payout);
      setResult(`Jackpot: all ${expressions[0]}. Paid ${payout} chips.`);
      setRoundResult(`WIN - all columns stopped on ${expressions[0]}. Paid ${payout} chips.`);
      playTone(760, 0.24, "triangle");
    } else {
      lose();
      setResult(`No match: ${expressions.join(" / ")}.`);
      setRoundResult(`LOSE - stopped on ${expressions.join(" / ")}.`);
      playTone(180, 0.22, "square");
    }

    setLoading(false);
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-4">
      <div className="shrink-0 text-center">
        <div className="min-w-0">
          <h2 className="font-display text-lg uppercase tracking-[0.24em] text-paper">Normie Expression Roulette</h2>
          <p className="terminal-hash mx-auto mt-1 max-w-4xl truncate text-xs text-pixel/70">{result}</p>
        </div>
      </div>
      <div className="mt-8 flex shrink-0 flex-wrap items-center justify-center gap-2">
        {(Object.keys(difficulty) as Difficulty[]).map((key) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            disabled={loading}
            className={`min-w-28 border px-3 py-2 text-xs uppercase tracking-widest transition ${
              mode === key ? "border-paper bg-paper/15 text-paper shadow-neon" : "border-paper/25 bg-black/60 text-paper/55 hover:border-paper/70"
            }`}
          >
            {difficulty[key].label} {difficulty[key].payout}x
          </button>
        ))}
        <BetControls bet={bet} setBet={setBet} />
      </div>
      <div
        className="mt-6 grid shrink-0 grid-cols-1 content-start justify-center gap-4 overflow-hidden sm:grid-cols-3"
        style={{ gridTemplateColumns: `repeat(${cardSlots.length}, minmax(0, 18rem))` }}
      >
        {cardSlots.map((normie, index) => (
          <RouletteReel
            key={normie ? normie.id : `slot-${index}`}
            normie={normie}
            index={index}
            spinning={loading && activeColumn === index && !normie}
          />
        ))}
      </div>
      <div className="mt-5 flex shrink-0 justify-center">
        <button
          onClick={spin}
          disabled={loading}
          className="inline-flex min-w-36 items-center justify-center gap-2 border border-paper/70 bg-paper/10 px-5 py-3 text-xs uppercase tracking-widest text-paper shadow-neon transition hover:bg-paper/15 disabled:opacity-50"
        >
          {normies.some(Boolean) ? <RotateCcw size={16} /> : <Sparkles size={16} />}
          {normies.some(Boolean) ? "Retry" : "Spin"}
        </button>
      </div>
      <div className="mx-auto mt-4 w-full max-w-5xl shrink-0 border-t border-paper/20 pt-3 text-center">
        <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Round Result</div>
        <div className="truncate text-sm text-paper">{roundResult}</div>
      </div>
    </div>
  );
}

function RouletteReel({
  normie,
  index,
  spinning
}: {
  normie: Normie | null;
  index: number;
  spinning: boolean;
}) {
  const reelItems = Array.from({ length: 14 }, (_, itemIndex) => EXPRESSIONS[(itemIndex + index) % EXPRESSIONS.length]);

  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ delay: index * 0.08 }}
      className="pixel-card mx-auto grid h-64 w-full max-w-72 grid-rows-[9rem_1rem_1.4rem_1rem] overflow-hidden p-2 text-center"
    >
      <div className="relative mx-auto grid h-36 w-36 place-items-center overflow-hidden border border-paper/40 bg-black/80">
        {normie ? (
          <motion.div
            className="grid h-full w-full place-items-center bg-paper"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
          >
            <CenteredNormieImage src={normie.image} alt={`Normie ${normie.id}`} className="h-full w-full" />
          </motion.div>
        ) : (
          <motion.div
            className="absolute inset-x-0 top-0"
            animate={{ y: spinning ? ["0%", "-68%"] : "-12%" }}
            transition={{ duration: 0.42, repeat: spinning ? Infinity : 0, ease: "linear" }}
          >
            {reelItems.map((expression, itemIndex) => (
              <div key={`${expression}-${itemIndex}`} className="grid h-14 place-items-center border-b border-paper/10 text-[10px] uppercase tracking-widest text-paper">
                {expression}
              </div>
            ))}
          </motion.div>
        )}
      </div>
      <div className="self-end text-xs leading-4 text-white/60">#{normie ? normie.id : "----"}</div>
      <div className="text-sm leading-6 text-paper">{normie ? normie.traits.Expression ?? "Unknown" : spinning ? "Spinning" : "Waiting"}</div>
      <div className="truncate text-[10px] leading-4 text-white/40">
        {normie ? `API Expression: ${normie.traits.Expression ?? "Unknown"}` : "Awaiting reveal"}
      </div>
    </motion.div>
  );
}

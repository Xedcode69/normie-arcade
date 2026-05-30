"use client";

import { motion } from "framer-motion";
import { Dices, RotateCcw } from "lucide-react";
import { useState } from "react";
import { CenteredNormieImage } from "@/components/normies/CenteredNormieImage";
import { playTone } from "@/lib/audio";
import { NormieAPIService } from "@/services/NormieAPIService";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useChipStore } from "@/stores/chipStore";
import type { Normie } from "@/types/normie";
import { BetControls } from "./BetControls";

type PokerHand = {
  name: string;
  multiplier: number;
  summary: string;
};

const handRanks = {
  none: { name: "No DNA Hand", multiplier: 0 },
  pair: { name: "Expression Pair", multiplier: 2 },
  threeType: { name: "Type Three Of A Kind", multiplier: 4 },
  flush: { name: "Trait Flush", multiplier: 7 },
  fullHouse: { name: "DNA Full House", multiplier: 12 }
} as const;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function countValues(values: Array<string | undefined>) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = value ?? "Unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function hasCount(counts: Record<string, number>, target: number) {
  return Object.values(counts).some((count) => count >= target);
}

function allSame(values: Array<string | undefined>) {
  const known = values.map((value) => value ?? "Unknown");
  return known.every((value) => value === known[0]);
}

function evaluateHand(cards: Normie[]): PokerHand {
  const expressions = cards.map((card) => card.traits.Expression);
  const types = cards.map((card) => card.traits.Type);
  const genders = cards.map((card) => card.traits.Gender);
  const ages = cards.map((card) => card.traits.Age);
  const expressionCounts = countValues(expressions);
  const typeCounts = countValues(types);
  const expressionTriple = hasCount(expressionCounts, 3);
  const typePair = hasCount(typeCounts, 2);
  const typeTriple = hasCount(typeCounts, 3);
  const expressionPair = hasCount(expressionCounts, 2);
  const genderFlush = allSame(genders);
  const ageFlush = allSame(ages);

  if (typePair && expressionTriple) {
    return {
      ...handRanks.fullHouse,
      summary: `Type pair plus Expression triple. Expressions: ${expressions.join(" / ")}.`
    };
  }

  if (genderFlush || ageFlush) {
    return {
      ...handRanks.flush,
      summary: `All cards share ${genderFlush ? `Gender ${genders[0] ?? "Unknown"}` : `Age ${ages[0] ?? "Unknown"}`}.`
    };
  }

  if (typeTriple) {
    return {
      ...handRanks.threeType,
      summary: `Three or more cards share a Type. Types: ${types.join(" / ")}.`
    };
  }

  if (expressionPair) {
    return {
      ...handRanks.pair,
      summary: `Two or more cards share an Expression. Expressions: ${expressions.join(" / ")}.`
    };
  }

  return {
    ...handRanks.none,
    summary: `No scoring DNA combination. Expressions: ${expressions.join(" / ")}.`
  };
}

export function PokerGame() {
  const [bet, setBet] = useState(100);
  const [cards, setCards] = useState<Array<Normie | null>>(Array.from({ length: 5 }, () => null));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("Deal five API Normies and score trait combinations.");
  const [roundResult, setRoundResult] = useState("Ready for a DNA Poker hand.");
  const wager = useChipStore((state) => state.wager);
  const win = useChipStore((state) => state.win);
  const lose = useChipStore((state) => state.lose);
  const notify = useArcadeStore((state) => state.notify);
  const hasCards = cards.some(Boolean);

  async function deal() {
    if (!wager(bet)) {
      notify({ kind: "loss", title: "Not enough chips", body: "Lower the DNA Poker bet." });
      return;
    }

    setLoading(true);
    setCards(Array.from({ length: 5 }, () => null));
    setResult("Shuffling on-chain DNA traits...");
    setRoundResult("Dealing five Normies...");
    playTone(340, 0.12, "sawtooth");

    const hand = await NormieAPIService.getRandomNormies(5);

    for (let index = 0; index < hand.length; index += 1) {
      await wait(220);
      setCards((current) => current.map((card, cardIndex) => (cardIndex === index ? hand[index] : card)));
      playTone(420 + index * 42, 0.08, "triangle");
    }

    const evaluated = evaluateHand(hand);

    if (evaluated.multiplier > 0) {
      const payout = bet * evaluated.multiplier;
      win(payout);
      setResult(`${evaluated.name}. Paid ${payout} chips.`);
      setRoundResult(`WIN - ${evaluated.name} (${evaluated.multiplier}x). ${evaluated.summary}`);
      playTone(720, 0.22, "triangle");
    } else {
      lose();
      setResult("No scoring DNA hand.");
      setRoundResult(`LOSE - ${evaluated.summary}`);
      playTone(180, 0.2, "square");
    }

    setLoading(false);
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-4">
      <div className="shrink-0 text-center">
        <h2 className="font-display text-lg uppercase tracking-[0.24em] text-paper">Normie DNA Poker</h2>
        <p className="terminal-hash mx-auto mt-3 max-w-4xl truncate text-xs text-pixel/70">{result}</p>
      </div>

      <div className="mt-8 flex shrink-0 flex-wrap items-center justify-center gap-2">
        <div className="border border-paper/35 bg-black/70 px-3 py-2 text-xs uppercase tracking-widest text-paper/70">
          Pair 2x
        </div>
        <div className="border border-paper/35 bg-black/70 px-3 py-2 text-xs uppercase tracking-widest text-paper/70">
          Three Type 4x
        </div>
        <div className="border border-paper/35 bg-black/70 px-3 py-2 text-xs uppercase tracking-widest text-paper/70">
          Flush 7x
        </div>
        <div className="border border-paper/60 bg-paper/10 px-3 py-2 text-xs uppercase tracking-widest text-paper shadow-neon">
          Full House 12x
        </div>
        <BetControls bet={bet} setBet={setBet} />
      </div>

      <div className="mt-6 grid shrink-0 grid-cols-1 justify-center gap-3 overflow-hidden sm:grid-cols-5">
        {cards.map((card, index) => (
          <PokerCard key={card ? card.id : `poker-slot-${index}`} normie={card} index={index} loading={loading && !card} />
        ))}
      </div>

      <div className="mt-5 flex shrink-0 justify-center">
        <button
          onClick={deal}
          disabled={loading}
          className="inline-flex min-w-36 items-center justify-center gap-2 border border-paper/70 bg-paper/10 px-5 py-3 text-xs uppercase tracking-widest text-paper shadow-neon transition hover:bg-paper/15 disabled:opacity-50"
        >
          {hasCards ? <RotateCcw size={16} /> : <Dices size={16} />}
          {hasCards ? "Redeal" : "Deal"}
        </button>
      </div>

      <div className="mx-auto mt-4 w-full max-w-5xl shrink-0 border-t border-paper/20 pt-3 text-center">
        <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Round Result</div>
        <div className="truncate text-sm text-paper">{roundResult}</div>
      </div>
    </div>
  );
}

function PokerCard({ normie, index, loading }: { normie: Normie | null; index: number; loading: boolean }) {
  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ delay: index * 0.06 }}
      className="pixel-card mx-auto grid h-72 w-full max-w-52 grid-rows-[8.5rem_1rem_1.25rem_4rem] overflow-hidden p-2 text-center"
    >
      <div className="relative mx-auto grid h-32 w-32 place-items-center overflow-hidden border border-paper/40 bg-paper">
        {normie ? (
          <CenteredNormieImage src={normie.image} alt={`Poker Normie ${normie.id}`} className="h-full w-full" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-black/80">
            <motion.div
              animate={{ opacity: loading ? [0.25, 0.8, 0.25] : 0.25 }}
              transition={{ duration: 0.8, repeat: loading ? Infinity : 0 }}
              className="h-20 w-20 border border-paper/20 bg-paper/10"
            />
          </div>
        )}
      </div>
      <div className="text-xs leading-4 text-white/60">#{normie ? normie.id : "----"}</div>
      <div className="truncate text-sm leading-5 text-paper">{normie ? normie.traits.Expression ?? "Unknown" : loading ? "Dealing" : "Waiting"}</div>
      <div className="space-y-1 text-[10px] leading-3 text-white/45">
        <div>Type: {normie?.traits.Type ?? "----"}</div>
        <div>Gender: {normie?.traits.Gender ?? "----"}</div>
        <div>Age: {normie?.traits.Age ?? "----"}</div>
      </div>
    </motion.div>
  );
}

"use client";

import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { useState } from "react";
import { NormieAPIService } from "@/services/NormieAPIService";
import { useChipStore } from "@/stores/chipStore";
import type { Normie } from "@/types/normie";
import { playTone } from "@/lib/audio";
import { NormieImage } from "@/components/normies/NormieImage";
import { useLeaderboardRecorder } from "@/hooks/useLeaderboardRecorder";
import { BetControls } from "./BetControls";
import { GameResultPanel } from "@/components/games/GameResultPanel";

const modes = {
  easy: { label: "Easy", target: 5, payout: 2 },
  medium: { label: "Medium", target: 10, payout: 5 },
  hard: { label: "Hard", target: 15, payout: 12 }
} as const;

type Mode = keyof typeof modes;
type UpDownSummary = {
  outcome: "win" | "loss";
  finalScore: string;
  chips: string;
  bestMoment: string;
};

export function UpDownGame() {
  const [mode, setMode] = useState<Mode>("medium");
  const [bet, setBet] = useState(100);
  const [base, setBase] = useState(5000);
  const [round, setRound] = useState(1);
  const [active, setActive] = useState(true);
  const [started, setStarted] = useState(false);
  const [lastNormie, setLastNormie] = useState<Normie | null>(null);
  const [message, setMessage] = useState("Choose a mode, place chips, then predict higher or lower.");
  const [roundResult, setRoundResult] = useState("Ready for the prediction terminal.");
  const [summary, setSummary] = useState<UpDownSummary | null>(null);
  const wager = useChipStore((state) => state.wager);
  const win = useChipStore((state) => state.win);
  const lose = useChipStore((state) => state.lose);
  const recordLeaderboardResult = useLeaderboardRecorder();
  const target = modes[mode].target;

  async function predict(direction: "higher" | "lower") {
    if (!active) return;

    if (!started) {
      if (!wager(bet)) {
        setRoundResult("Not enough chips. Lower the bet.");
        return;
      }
      setStarted(true);
      setSummary(null);
      setRoundResult("Run started.");
    }

    const normie = await NormieAPIService.getRandomNormie();
    setLastNormie(normie);
    const correct = direction === "higher" ? normie.id > base : normie.id < base;

    if (correct) {
      const nextRound = round + 1;
      setBase(normie.id);
      playTone(620 + round * 18, 0.15, "triangle");
      if (round >= target) {
        const payout = bet * modes[mode].payout;
        setActive(false);
        win(payout);
        void recordLeaderboardResult({
          game: "UP_DOWN",
          mode: "SOLO",
          outcome: "WIN",
          score: payout - bet,
          chipsWon: payout,
          netChips: payout - bet,
          metadata: { difficulty: mode, bet, target, survived: target }
        });
        setMessage(`Terminal cleared. Normie #${normie.id} completed the final read.`);
        setRoundResult(`WIN - survived ${target} predictions. Paid ${payout} chips.`);
        setSummary({
          outcome: "win",
          finalScore: `${target}/${target} survived`,
          chips: `+${payout - bet} net / ${payout} paid`,
          bestMoment: `Final read landed on Normie #${normie.id}.`
        });
      } else {
        setRound(nextRound);
        setMessage(`Correct. Normie #${normie.id} becomes the new base.`);
        setRoundResult(`Correct ${direction}. Normie #${normie.id} is now the base.`);
      }
    } else {
      setActive(false);
      lose();
      void recordLeaderboardResult({
        game: "UP_DOWN",
        mode: "SOLO",
        outcome: "LOSS",
        score: 0,
        chipsWon: 0,
        netChips: -bet,
        metadata: { difficulty: mode, bet, target, survived: Math.max(0, round - 1) }
      });
      playTone(170, 0.25, "square");
      setMessage(`Wrong read. Normie #${normie.id} ended the run.`);
      setRoundResult(`LOSE - ${direction} failed against Normie #${normie.id}.`);
      setSummary({
        outcome: "loss",
        finalScore: `${Math.max(0, round - 1)}/${target} survived`,
        chips: `-${bet} chips`,
        bestMoment: `Run ended on Normie #${normie.id} after ${Math.max(0, round - 1)} correct prediction${round - 1 === 1 ? "" : "s"}.`
      });
    }
  }

  function reset() {
    setBase(5000);
    setRound(1);
    setActive(true);
    setStarted(false);
    setLastNormie(null);
    setMessage("Choose a mode, place chips, then predict higher or lower.");
    setRoundResult("Ready for the prediction terminal.");
    setSummary(null);
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-4 pt-1">
      <div className="shrink-0 text-center">
        <h2 className="font-display text-lg uppercase tracking-[0.24em] text-paper">Up or Down</h2>
        <p className="terminal-hash mx-auto mt-1 max-w-4xl truncate text-xs text-pixel/70">{message}</p>
      </div>
      <div className="mt-8 flex shrink-0 flex-wrap items-center justify-center gap-2">
        {(Object.keys(modes) as Mode[]).map((key) => (
          <button
            key={key}
            disabled={started}
            onClick={() => setMode(key)}
            className={`min-w-32 border px-3 py-2 text-xs uppercase tracking-widest transition ${
              mode === key ? "border-paper bg-paper/15 text-paper shadow-neon" : "border-paper/25 bg-black/60 text-paper/55 hover:border-paper/70"
            } disabled:opacity-45`}
          >
            {modes[key].label} {modes[key].target}
          </button>
        ))}
        <BetControls bet={bet} setBet={setBet} />
      </div>
      <div className="mt-7 grid shrink-0 gap-4 md:grid-cols-[minmax(0,18rem)_auto_minmax(0,18rem)] md:items-center md:justify-center">
        <button
          disabled={!active}
          onClick={() => predict("lower")}
          className="inline-flex h-20 items-center justify-center gap-2 border border-paper/60 bg-paper/10 px-4 py-4 text-lg text-paper transition hover:bg-paper/15 disabled:opacity-45"
        >
          <ArrowDown /> Lower
        </button>
        <div className="min-w-48 text-center">
          <div className="font-display text-5xl text-paper neon-text">{base}</div>
          <div className="mt-2 text-xs uppercase tracking-[0.3em] text-white/45">Current Base</div>
        </div>
        <button
          disabled={!active}
          onClick={() => predict("higher")}
          className="inline-flex h-20 items-center justify-center gap-2 border border-paper/60 bg-paper/10 px-4 py-4 text-lg text-paper transition hover:bg-paper/15 disabled:opacity-45"
        >
          Higher <ArrowUp />
        </button>
      </div>
      <div className="mt-5 flex shrink-0 flex-wrap items-center justify-center gap-4">
        <div className="pixel-card px-5 py-2 text-sm text-paper">
          Round {Math.min(round, target)} / {target}
        </div>
        {lastNormie ? (
          <div className="pixel-card flex items-center gap-3 p-2">
            <NormieImage src={lastNormie.image} alt={`Normie ${lastNormie.id}`} className="h-16 w-16" />
            <div>
              <div className="text-sm text-white">Normie #{lastNormie.id}</div>
              <div className="text-xs text-white/50">{lastNormie.traits.Expression ?? "Unknown"} expression</div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-5 flex shrink-0 justify-center">
        <button onClick={reset} className="inline-flex min-w-44 items-center justify-center gap-2 border border-paper/70 bg-paper/10 px-5 py-3 text-xs uppercase tracking-widest text-paper shadow-neon transition hover:bg-paper/15">
          <RotateCcw size={16} /> Retry
        </button>
      </div>
      <div className="mx-auto mt-4 w-full max-w-4xl shrink-0 border-t border-paper/20 pt-4 text-center">
        <div className="mx-auto min-w-0 max-w-3xl text-center">
          <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Round Result</div>
          <div className="truncate text-sm text-paper">{roundResult}</div>
        </div>
      </div>
      <div className="mx-auto mt-4 w-full max-w-5xl shrink-0">
        <GameResultPanel
          visible={Boolean(summary)}
          title="Up or Down"
          result={summary?.outcome ?? "complete"}
          finalScore={summary?.finalScore ?? ""}
          chips={summary?.chips}
          bestMoment={summary?.bestMoment ?? ""}
          leaderboard={{ game: "UP_DOWN", mode: "SOLO", label: "Up/Down Leaderboard" }}
          playAgainLabel="New Run"
          onPlayAgain={reset}
        />
      </div>
    </div>
  );
}

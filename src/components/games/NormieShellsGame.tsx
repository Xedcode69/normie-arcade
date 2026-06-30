"use client";

import { Eye, Play, RotateCcw, Shell } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameResultPanel } from "@/components/games/GameResultPanel";
import { NormieImage } from "@/components/normies/NormieImage";
import { useLeaderboardRecorder } from "@/hooks/useLeaderboardRecorder";
import { playTone } from "@/lib/audio";
import { NormieAPIService } from "@/services/NormieAPIService";
import { useArcadeStore } from "@/stores/arcadeStore";

type Phase = "idle" | "reveal" | "shuffling" | "guessing" | "result" | "ended";
type Cup = {
  id: number;
  slot: number;
};

const MAX_ID = 9999;
const REVEAL_MS = 1300;
const RESULT_MS = 900;

function randomNormieId() {
  return Math.floor(Math.random() * (MAX_ID + 1));
}

function randomCupId() {
  return Math.floor(Math.random() * 3);
}

function shufflePlan(level: number) {
  const swaps = Math.min(7 + level * 2, 28);
  const duration = Math.max(145, 520 - level * 28);
  let previousPair = "";

  return Array.from({ length: swaps }, () => {
    let a = Math.floor(Math.random() * 3);
    let b = Math.floor(Math.random() * 3);
    while (b === a) b = Math.floor(Math.random() * 3);

    const pair = [a, b].sort().join("-");
    if (pair === previousPair) {
      b = [0, 1, 2].find((slot) => slot !== a && slot !== b) ?? b;
    }
    previousPair = [a, b].sort().join("-");
    return { a, b, duration };
  });
}

function swapSlots(cups: Cup[], a: number, b: number) {
  return cups.map((cup) => {
    if (cup.slot === a) return { ...cup, slot: b };
    if (cup.slot === b) return { ...cup, slot: a };
    return cup;
  });
}

function slotStyle(slot: number, duration = 320): CSSProperties {
  return {
    transform: `translateX(${(slot - 1) * 118}%)`,
    transitionDuration: `${duration}ms`
  };
}

function levelLabel(level: number) {
  if (level < 4) return "Warmup";
  if (level < 8) return "Street Speed";
  if (level < 13) return "Neon Hands";
  return "Shell Storm";
}

export function NormieShellsGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cups, setCups] = useState<Cup[]>([
    { id: 0, slot: 0 },
    { id: 1, slot: 1 },
    { id: 2, slot: 2 }
  ]);
  const [level, setLevel] = useState(1);
  const [bestLevel, setBestLevel] = useState(0);
  const [targetCupId, setTargetCupId] = useState(1);
  const [targetNormieId, setTargetNormieId] = useState(() => randomNormieId());
  const [selectedCupId, setSelectedCupId] = useState<number | null>(null);
  const [message, setMessage] = useState("Track the shell hiding the Normie.");
  const [lastResult, setLastResult] = useState("Ready for level 1.");
  const [swapDuration, setSwapDuration] = useState(320);
  const timeoutsRef = useRef<number[]>([]);
  const recordLeaderboardResult = useLeaderboardRecorder();
  const notify = useArcadeStore((state) => state.notify);

  const targetCup = cups.find((cup) => cup.id === targetCupId);
  const currentLevelBest = Math.max(bestLevel, level - 1);
  const canPick = phase === "guessing";
  const currentPlan = useMemo(() => shufflePlan(level), [level]);

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    timeoutsRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const recordRun = useCallback(
    async (score: number) => {
      await recordLeaderboardResult({
        game: "NORMIE_SHELLS",
        mode: "SKILL",
        outcome: score > 0 ? "WIN" : "LOSS",
        score,
        chipsWon: 0,
        netChips: 0,
        bestCombo: score,
        metadata: {
          finalLevel: level,
          hiddenNormieId: targetNormieId
        }
      });
    },
    [level, recordLeaderboardResult, targetNormieId]
  );

  const startRound = useCallback(
    (nextLevel = level) => {
      clearTimers();
      const hiddenCupId = randomCupId();
      const normieId = randomNormieId();
      const plan = shufflePlan(nextLevel);

      setLevel(nextLevel);
      setCups([
        { id: 0, slot: 0 },
        { id: 1, slot: 1 },
        { id: 2, slot: 2 }
      ]);
      setTargetCupId(hiddenCupId);
      setTargetNormieId(normieId);
      setSelectedCupId(null);
      setPhase("reveal");
      setSwapDuration(320);
      setMessage(`Level ${nextLevel}: memorize the shell.`);
      setLastResult(`Hidden Normie #${normieId} is exposed.`);
      playTone(520, 0.08, "triangle");

      timeoutsRef.current.push(
        window.setTimeout(() => {
          setPhase("shuffling");
          setMessage("Shells moving. Keep your eyes locked.");
          setLastResult(`${plan.length} swaps at ${levelLabel(nextLevel)} speed.`);

          let elapsed = 0;
          plan.forEach((swap) => {
            elapsed += swap.duration;
            timeoutsRef.current.push(
              window.setTimeout(() => {
                setSwapDuration(swap.duration);
                setCups((current) => swapSlots(current, swap.a, swap.b));
                playTone(220 + Math.random() * 80, 0.025, "square");
              }, elapsed)
            );
          });

          timeoutsRef.current.push(
            window.setTimeout(() => {
              setPhase("guessing");
              setMessage("Pick the shell hiding the Normie.");
              setLastResult("Choose carefully.");
              playTone(680, 0.08, "triangle");
            }, elapsed + 220)
          );
        }, REVEAL_MS)
      );
    },
    [clearTimers, level]
  );

  function beginRun() {
    setBestLevel(0);
    startRound(1);
  }

  function pickCup(cupId: number) {
    if (!canPick) return;

    setSelectedCupId(cupId);
    const correct = cupId === targetCupId;

    if (correct) {
      const achieved = level;
      setBestLevel((value) => Math.max(value, achieved));
      setPhase("result");
      setMessage("Correct shell.");
      setLastResult(`Level ${achieved} cleared. Speed increases.`);
      playTone(880, 0.12, "triangle");
      timeoutsRef.current.push(window.setTimeout(() => startRound(level + 1), RESULT_MS));
      return;
    }

    const finalBest = Math.max(bestLevel, level - 1);
    setPhase("ended");
    setMessage("Wrong shell. The Normie slips away.");
    setLastResult(`Run ended at level ${level}. Best streak ${finalBest}.`);
    playTone(180, 0.18, "sawtooth");
    void recordRun(finalBest);
    notify({
      kind: finalBest > 0 ? "info" : "loss",
      title: "Normie Shells ended",
      body: `Best consecutive level: ${finalBest}.`
    });
  }

  function playAgain() {
    beginRun();
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 pb-4 pt-1">
      <header className="shrink-0 text-center">
        <div className="terminal-hash text-[10px] uppercase tracking-[0.28em] text-pixel/70">Shell District</div>
        <h2 className="mt-1 font-display text-xl uppercase tracking-[0.24em] text-paper">Normie Shells</h2>
        <p className="terminal-hash mx-auto mt-1 max-w-3xl truncate text-xs text-pixel/70">{message}</p>
      </header>

      <GameResultPanel
        visible={phase === "ended"}
        title="Best Level"
        result={currentLevelBest > 0 ? "complete" : "loss"}
        finalScore={`${currentLevelBest}`}
        bestMoment={currentLevelBest > 0 ? `Tracked the Normie through ${currentLevelBest} consecutive level${currentLevelBest === 1 ? "" : "s"}.` : "No shells cleared yet."}
        leaderboard={{ game: "NORMIE_SHELLS", mode: "SKILL", label: "Shells Leaderboard" }}
        playAgainLabel="New Run"
        onPlayAgain={playAgain}
      />

      <section className="mt-4 grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="game-panel p-4">
          <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">Run Status</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <StatTile label="Level" value={String(level)} />
            <StatTile label="Best" value={String(currentLevelBest)} />
            <StatTile label="Swaps" value={String(currentPlan.length)} />
            <StatTile label="Speed" value={`${Math.round(currentPlan[0]?.duration ?? 320)}ms`} />
          </div>
          <div className="mt-4 border border-paper/15 bg-black/60 p-3">
            <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Rules</div>
            <p className="mt-2 text-sm leading-relaxed text-paper/65">
              Watch the hidden Normie, track the shell through the shuffle, then pick the correct shell. Every correct guess raises the level.
            </p>
          </div>
          <button
            onClick={beginRun}
            disabled={phase === "reveal" || phase === "shuffling" || phase === "guessing"}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-mint/70 bg-mint/10 px-4 py-3 text-xs uppercase tracking-widest text-mint transition hover:bg-mint/15 disabled:cursor-not-allowed disabled:border-paper/20 disabled:bg-black/50 disabled:text-paper/30"
          >
            {phase === "idle" ? <Play size={15} /> : <RotateCcw size={15} />}
            {phase === "idle" ? "Start Run" : "Restart"}
          </button>
        </aside>

        <main className="game-panel min-h-[34rem] overflow-hidden p-4">
          <div className="flex items-center justify-between gap-3 border-b border-paper/15 pb-3">
            <div>
              <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">Tracking Table</div>
              <div className="mt-1 text-sm text-paper/60">{lastResult}</div>
            </div>
            <div className="hidden items-center gap-2 border border-paper/20 bg-black/60 px-3 py-2 text-xs uppercase tracking-widest text-paper/55 sm:flex">
              <Eye size={14} /> {phase === "guessing" ? "Pick Now" : levelLabel(level)}
            </div>
          </div>

          <div className="relative mx-auto mt-10 h-[24rem] max-w-4xl">
            <div className="absolute inset-x-8 bottom-12 h-2 border border-paper/15 bg-paper/10 shadow-[0_0_28px_rgba(34,255,225,0.1)]" />
            {phase === "reveal" && targetCup ? (
              <div
                className="absolute left-1/2 top-[8.5rem] z-0 w-32 -translate-x-1/2 transition-transform duration-300"
                style={slotStyle(targetCup.slot, 320)}
              >
                <NormieImage src={NormieAPIService.imageUrl(targetNormieId)} alt={`Hidden Normie #${targetNormieId}`} className="mx-auto h-24 w-24 border border-mint/60 bg-paper object-contain shadow-neon" />
                <div className="mt-1 text-center text-[10px] uppercase tracking-widest text-mint">#{targetNormieId}</div>
              </div>
            ) : null}

            {cups.map((cup) => {
              const chosen = selectedCupId === cup.id;
              const correct = phase === "ended" && cup.id === targetCupId;
              const wrong = phase === "ended" && chosen && cup.id !== targetCupId;
              const lifted = phase === "reveal" && cup.id === targetCupId;
              return (
                <button
                  key={cup.id}
                  disabled={!canPick}
                  onClick={() => pickCup(cup.id)}
                  className={`absolute left-1/2 top-16 z-10 flex h-56 w-40 -translate-x-1/2 flex-col items-center justify-end transition-transform ease-in-out disabled:cursor-default ${
                    canPick ? "hover:-translate-y-3" : ""
                  }`}
                  style={slotStyle(cup.slot, swapDuration)}
                >
                  <span
                    className={`relative grid h-40 w-36 place-items-center border bg-black/90 transition ${
                      correct
                        ? "border-mint text-mint shadow-neon"
                        : wrong
                          ? "border-magenta text-magenta shadow-[0_0_28px_rgba(255,61,242,0.24)]"
                          : canPick
                            ? "border-paper/55 text-paper hover:border-mint hover:text-mint"
                            : "border-paper/30 text-paper/65"
                    } ${lifted ? "-translate-y-20" : ""}`}
                  >
                    <span className="absolute inset-x-3 top-4 h-4 border border-current/35 bg-current/10" />
                    <Shell size={54} />
                    <span className="absolute bottom-3 text-[10px] uppercase tracking-[0.24em]">Shell {cup.id + 1}</span>
                  </span>
                  <span className="mt-4 h-3 w-28 border border-paper/15 bg-black/80 shadow-[0_0_18px_rgba(244,241,232,0.08)]" />
                </button>
              );
            })}

            {phase === "ended" && targetCup ? (
              <div
                className="absolute left-1/2 top-[15.5rem] z-0 w-32 -translate-x-1/2 transition-transform duration-300"
                style={slotStyle(targetCup.slot, 320)}
              >
                <NormieImage src={NormieAPIService.imageUrl(targetNormieId)} alt={`Revealed Normie #${targetNormieId}`} className="mx-auto h-20 w-20 border border-mint/60 bg-paper object-contain" />
              </div>
            ) : null}
          </div>
        </main>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-paper/15 bg-black/60 px-3 py-2">
      <div className="terminal-hash text-[9px] uppercase tracking-[0.2em] text-paper/40">{label}</div>
      <div className="mt-1 font-display text-lg text-paper">{value}</div>
    </div>
  );
}

"use client";

import { Flame, MousePointerClick, RotateCcw, Timer, Trophy, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NormieImage } from "@/components/normies/NormieImage";
import { playTone } from "@/lib/audio";
import { useLeaderboardRecorder } from "@/hooks/useLeaderboardRecorder";
import { NormieAPIService } from "@/services/NormieAPIService";
import { useArcadeStore } from "@/stores/arcadeStore";
import { GameResultPanel } from "@/components/games/GameResultPanel";

const RUN_SECONDS = 60;
const HOLE_COUNT = 9;
const MAX_ID = 9999;
const NORMAL_POINTS = 10;
const COMBO_MILESTONE_BONUS = 25;
const BURNED_PENALTY = 25;
const CORNER_HOLES = [0, 2, 6, 8];

type Phase = "idle" | "loading" | "running" | "ended";

type Target = {
  id: string;
  normieId: number;
  hole: number;
  burned: boolean;
  expiresAt: number;
  lifeMs: number;
};

function randomId() {
  return Math.floor(Math.random() * (MAX_ID + 1));
}

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function availableHoles(targets: Target[]) {
  return Array.from({ length: HOLE_COUNT }, (_, index) => index).filter((hole) => !targets.some((target) => target.hole === hole));
}

function spawnDelay(timeLeft: number) {
  if (timeLeft < 12) return 430;
  if (timeLeft < 30) return 560;
  return 720;
}

function lifeSpan(timeLeft: number) {
  if (timeLeft < 12) return 760;
  if (timeLeft < 30) return 920;
  return 1100;
}

export function WhackRushGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(RUN_SECONDS);
  const [targets, setTargets] = useState<Target[]>([]);
  const [burnedIds, setBurnedIds] = useState<number[]>([]);
  const [burnFeedLoading, setBurnFeedLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [burnedHits, setBurnedHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [message, setMessage] = useState("Whack live Normies. Do not hit burned Normies.");
  const recordedRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  const targetSerial = useRef(0);
  const burnedIdsRef = useRef<number[]>([]);
  const timeLeftRef = useRef(RUN_SECONDS);
  const scoreRef = useRef(0);
  const hitsRef = useRef(0);
  const burnedHitsRef = useRef(0);
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);
  const waveTimersRef = useRef<number[]>([]);
  const recordLeaderboardResult = useLeaderboardRecorder();
  const notify = useArcadeStore((state) => state.notify);

  const clearWaveTimers = useCallback(() => {
    waveTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    waveTimersRef.current = [];
  }, []);

  const scheduleWaveStep = useCallback((run: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      waveTimersRef.current = waveTimersRef.current.filter((item) => item !== timer);
      if (phaseRef.current === "running") run();
    }, delay);
    waveTimersRef.current.push(timer);
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    burnedIdsRef.current = burnedIds;
  }, [burnedIds]);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    hitsRef.current = hits;
  }, [hits]);

  useEffect(() => {
    burnedHitsRef.current = burnedHits;
  }, [burnedHits]);

  useEffect(() => {
    bestComboRef.current = bestCombo;
  }, [bestCombo]);

  const finishRun = useCallback(
    (reason: string) => {
      if (recordedRef.current) return;
      recordedRef.current = true;
      clearWaveTimers();
      phaseRef.current = "ended";
      setPhase("ended");
      setTargets([]);
      setMessage(reason);
      const finalScore = scoreRef.current;
      const finalHits = hitsRef.current;
      const finalBurnedHits = burnedHitsRef.current;
      const finalBestCombo = bestComboRef.current;
      void recordLeaderboardResult({
        game: "WHACK_RUSH",
        mode: "SKILL",
        outcome: finalScore > 0 ? "WIN" : "LOSS",
        score: finalScore,
        chipsWon: 0,
        netChips: 0,
        bestCombo: finalBestCombo,
        metadata: { hits: finalHits, burnedHits: finalBurnedHits, seconds: RUN_SECONDS }
      });
      notify({
        kind: "info",
        title: "Whack-A-Normie posted",
        body: `${finalScore} points, ${finalHits} clean hits, ${finalBurnedHits} burned mistakes.`
      });
    },
    [clearWaveTimers, notify, recordLeaderboardResult]
  );

  async function start() {
    if (phase === "loading" || phase === "running") return;
    clearWaveTimers();
    recordedRef.current = false;
    phaseRef.current = "running";
    setPhase("running");
    setTimeLeft(RUN_SECONDS);
    setTargets([]);
    setScore(0);
    setHits(0);
    setBurnedHits(0);
    setCombo(0);
    setBestCombo(0);
    scoreRef.current = 0;
    hitsRef.current = 0;
    burnedHitsRef.current = 0;
    comboRef.current = 0;
    bestComboRef.current = 0;
    setBurnedIds([]);
    setMessage("Rush started. Burn feed loading in the background.");
    setBurnFeedLoading(true);
    spawnTarget({ burned: false });

    NormieAPIService.fetchBurnedNormieIds(120)
      .then((ids) => {
        setBurnedIds(ids);
        setMessage(ids.length ? "Rush active. Avoid the burned targets." : "Rush active. Burn feed fallback active.");
      })
      .catch(() => setMessage("Rush active. Burn feed fallback active."))
      .finally(() => setBurnFeedLoading(false));
  }

  function reset() {
    clearWaveTimers();
    recordedRef.current = false;
    phaseRef.current = "idle";
    setPhase("idle");
    setTimeLeft(RUN_SECONDS);
    setTargets([]);
    setScore(0);
    setHits(0);
    setBurnedHits(0);
    setCombo(0);
    setBestCombo(0);
    scoreRef.current = 0;
    hitsRef.current = 0;
    burnedHitsRef.current = 0;
    comboRef.current = 0;
    bestComboRef.current = 0;
    setMessage("Whack live Normies. Do not hit burned Normies.");
  }

  const spawnTarget = useCallback((options?: { hole?: number; burned?: boolean; lifeScale?: number }) => {
    setTargets((items) => {
      const openHoles = availableHoles(items);
      if (!openHoles.length) return items;

      const burned = options?.burned ?? Math.random() < 0.28;
      const burnedPool = burnedIdsRef.current;
      const normieId = burned && burnedPool.length ? pickRandom(burnedPool) : randomId();
      const now = Date.now();
      const lifeMs = Math.round(lifeSpan(timeLeftRef.current) * (options?.lifeScale ?? 1));
      const requestedHole = options?.hole;
      const hole = requestedHole !== undefined && openHoles.includes(requestedHole) ? requestedHole : pickRandom(openHoles);
      const target: Target = {
        id: `${now}-${targetSerial.current++}`,
        normieId,
        hole,
        burned,
        expiresAt: now + lifeMs,
        lifeMs
      };

      return [...items, target].slice(-HOLE_COUNT);
    });
  }, []);

  const triggerWave = useCallback(() => {
    const roll = Math.random();

    if (roll < 0.48) {
      spawnTarget();
      return;
    }

    if (roll < 0.7) {
      spawnTarget({ burned: false });
      spawnTarget({ burned: false });
      setMessage("Double pop. Build the combo.");
      return;
    }

    if (roll < 0.88) {
      const baitHole = Math.floor(Math.random() * HOLE_COUNT);
      spawnTarget({ hole: baitHole, burned: true, lifeScale: 0.95 });
      scheduleWaveStep(() => {
        const nearby = [baitHole - 1, baitHole + 1, baitHole - 3, baitHole + 3].filter((hole) => hole >= 0 && hole < HOLE_COUNT);
        spawnTarget({ hole: nearby.length ? pickRandom(nearby) : undefined, burned: false, lifeScale: 0.9 });
      }, 280);
      setMessage("Burned bait. Wait for the clean target.");
      return;
    }

    const corners = [...CORNER_HOLES].sort(() => Math.random() - 0.5);
    corners.forEach((hole, index) => {
      scheduleWaveStep(() => spawnTarget({ hole, burned: false, lifeScale: 0.72 }), index * 150);
    });
    setMessage("Corner run. Track the route.");
  }, [scheduleWaveStep, spawnTarget]);

  function whack(target: Target) {
    if (phase !== "running") return;

    setTargets((items) => items.filter((item) => item.id !== target.id));

    if (target.burned) {
      burnedHitsRef.current += 1;
      setBurnedHits(burnedHitsRef.current);
      comboRef.current = 0;
      setCombo(0);
      scoreRef.current = Math.max(0, scoreRef.current - BURNED_PENALTY);
      setScore(scoreRef.current);
      setMessage(`Burned Normie #${target.normieId}. -${BURNED_PENALTY}.`);
      playTone(170, 0.16, "square");
      return;
    }

    const nextCombo = comboRef.current + 1;
    const comboBonus = nextCombo > 0 && nextCombo % 5 === 0 ? COMBO_MILESTONE_BONUS : 0;
    hitsRef.current += 1;
    comboRef.current = nextCombo;
    scoreRef.current += NORMAL_POINTS + comboBonus;
    bestComboRef.current = Math.max(bestComboRef.current, nextCombo);
    setHits(hitsRef.current);
    setCombo(nextCombo);
    setBestCombo(bestComboRef.current);
    setScore(scoreRef.current);
    setMessage(comboBonus ? `Clean whack. +${NORMAL_POINTS} and +${comboBonus} combo bonus. Combo ${nextCombo}.` : `Clean whack. +${NORMAL_POINTS}. Combo ${nextCombo}.`);
    playTone(520 + Math.min(nextCombo, 12) * 18, 0.08, "triangle");
  }

  useEffect(() => {
    if (phase !== "running") return undefined;
    const interval = window.setInterval(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return undefined;
    const interval = window.setInterval(() => {
      setTargets((items) => {
        const now = Date.now();
        const expired = items.filter((target) => target.expiresAt <= now);
        const missedNormal = expired.some((target) => !target.burned);
        if (missedNormal && comboRef.current > 0) {
          comboRef.current = 0;
          setCombo(0);
          setMessage("Normal Normie escaped. Combo reset.");
        }
        const next = items.filter((target) => target.expiresAt > now);
        return next.length === items.length ? items : next;
      });
    }, 120);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running") return undefined;
    const interval = window.setInterval(() => {
      if (phaseRef.current === "running") triggerWave();
    }, spawnDelay(timeLeft));
    return () => window.clearInterval(interval);
  }, [phase, timeLeft, triggerWave]);

  useEffect(() => clearWaveTimers, [clearWaveTimers]);

  useEffect(() => {
    if (phase === "running" && timeLeft <= 0) finishRun("Rush complete.");
  }, [finishRun, phase, timeLeft]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 pb-4 pt-1">
      <header className="shrink-0 text-center">
        <h2 className="font-display text-lg uppercase tracking-[0.24em] text-paper">Whack-A-Normie</h2>
        <p className="terminal-hash mx-auto mt-1 max-w-4xl truncate text-xs text-pixel/70">{message}</p>
      </header>

      <section className="mx-auto mt-4 grid w-full max-w-5xl grid-cols-2 gap-2 md:grid-cols-5">
        <Metric icon={<Timer size={15} />} label="Clock" value={`${timeLeft}s`} />
        <Metric icon={<Trophy size={15} />} label="Score" value={score} />
        <Metric icon={<MousePointerClick size={15} />} label="Hits" value={hits} />
        <Metric icon={<Zap size={15} />} label="Combo" value={combo} />
        <Metric icon={<Flame size={15} />} label="Burned" value={burnedHits} />
      </section>

      <div className="mx-auto mt-4 w-full max-w-5xl">
        <GameResultPanel
          visible={phase === "ended"}
          title="Whack-A-Normie"
          result={score > 0 ? "complete" : "loss"}
          finalScore={`${score} points`}
          bestMoment={`${hits} clean hit${hits === 1 ? "" : "s"}, best combo x${bestCombo}. ${burnedHits} burned mistake${burnedHits === 1 ? "" : "s"}.`}
          leaderboard={{ game: "WHACK_RUSH", mode: "SKILL", label: "Whack Leaderboard" }}
          playAgainLabel="Start Rush"
          onPlayAgain={start}
        />
      </div>

      <main className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
        <aside className="game-panel p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">Burn Yard</div>
              <div className="mt-1 font-display text-2xl uppercase tracking-[0.08em] text-paper">
                {phase === "running" ? "Active" : phase === "loading" ? "Loading" : "Ready"}
              </div>
            </div>
            <button
              onClick={phase === "idle" || phase === "ended" ? start : reset}
              className="inline-flex shrink-0 items-center justify-center gap-2 border border-paper/70 bg-paper/10 px-4 py-2 text-xs uppercase tracking-widest text-paper shadow-neon transition hover:bg-paper/15"
            >
              {phase === "idle" || phase === "ended" ? <MousePointerClick size={15} /> : <RotateCcw size={15} />}
              {phase === "idle" || phase === "ended" ? "Start" : "Reset"}
            </button>
          </div>

          <div className="mt-4 space-y-3 text-sm leading-relaxed text-paper/65">
            <Rule label="Normal Normie" value={`+${NORMAL_POINTS} points`} />
            <Rule label="Burned Normie" value={`-${BURNED_PENALTY} points`} danger />
            <Rule label="Combo" value={`Every 5 clean hits +${COMBO_MILESTONE_BONUS}`} />
            <Rule label="Leaderboard" value="Highest score wins" />
          </div>

          <div className="mt-5 border border-paper/15 bg-black/60 p-3">
            <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Burn Feed</div>
            <div className="mt-2 text-sm text-paper/70">
              {burnFeedLoading ? "Loading burned tokens while play continues." : burnedIds.length ? `${burnedIds.length} burned tokens loaded.` : "Fallback hazards will use burned styling."}
            </div>
          </div>
        </aside>

        <section className="game-panel min-h-[34rem] p-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">Whack Grid</div>
              <div className="text-sm text-paper/60">Hit bright Normies. Avoid the flame-marked burned ones.</div>
            </div>
            <div className="hidden border border-paper/20 bg-black/55 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-paper/50 md:block">
              Click targets fast
            </div>
          </div>

          <div className="grid min-h-[29rem] grid-cols-3 gap-3">
            {Array.from({ length: HOLE_COUNT }, (_, hole) => {
              const target = targets.find((item) => item.hole === hole);
              return <Hole key={hole} target={target} phase={phase} onWhack={whack} />;
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function Hole({ target, phase, onWhack }: { target?: Target; phase: Phase; onWhack: (target: Target) => void }) {
  return (
    <div className="relative min-h-44 overflow-hidden border border-paper/20 bg-black/70">
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(244,241,232,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(244,241,232,0.09)_1px,transparent_1px)] [background-size:8px_8px]" />
      <div className="absolute inset-x-8 bottom-6 h-11 rounded-[50%] border border-paper/30 bg-black shadow-[0_0_26px_rgba(0,0,0,0.95)_inset]" />
      {target ? (
        <button
          onClick={() => onWhack(target)}
          className="absolute inset-x-6 bottom-7 top-1 flex items-end justify-center overflow-hidden transition hover:-translate-y-1"
        >
          <span
            className={`relative grid h-[calc(100%+0.75rem)] w-36 origin-bottom place-items-end overflow-hidden rounded-[50%_50%_42%_42%/42%_42%_18%_18%] border-2 bg-black/90 shadow-[0_12px_0_rgba(0,0,0,0.75)] animate-[whack-pop_var(--whack-life)_linear_both] ${
              target.burned ? "border-red-500/80 shadow-[0_0_0_1px_rgba(239,68,68,0.55),0_0_24px_rgba(239,68,68,0.35)]" : "border-mint shadow-neon"
            }`}
            style={{ "--whack-life": `${target.lifeMs}ms` } as React.CSSProperties}
          >
            <span className="absolute inset-0 grid place-items-center text-[9px] uppercase tracking-[0.18em] text-paper/25">0xN</span>
            <NormieImage
              src={target.burned ? NormieAPIService.burnedImageUrl(target.normieId) : NormieAPIService.imageUrl(target.normieId)}
              alt={`${target.burned ? "Burned" : "Normie"} target #${target.normieId}`}
              className={`relative h-full w-full -translate-y-[7%] object-contain object-bottom ${target.burned ? "opacity-85 grayscale contrast-125" : ""}`}
            />
          </span>
          {target.burned ? (
            <span className="absolute right-3 top-2 grid h-7 w-7 place-items-center border border-red-500 bg-black/80 text-red-500">
              <Flame size={15} />
            </span>
          ) : null}
          <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] ${target.burned ? "text-paper/70" : "text-mint"}`}>
            #{target.normieId}
          </span>
        </button>
      ) : (
        <div className="absolute inset-0 grid place-items-center pb-8 text-[10px] uppercase tracking-[0.2em] text-paper/22">
          {phase === "running" ? "Waiting" : "Dormant"}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-8 bottom-6 h-11 rounded-[50%] border border-paper/35 bg-black shadow-[0_0_22px_rgba(0,0,0,1)_inset]" />
      <div className="pointer-events-none absolute inset-x-12 bottom-7 h-5 rounded-[50%] bg-black/85" />
    </div>
  );
}

function Rule({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-paper/15 bg-black/55 px-3 py-2">
      <span className="text-paper/45">{label}</span>
      <span className={danger ? "text-red-500" : "text-mint"}>{value}</span>
    </div>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-2 border border-paper/20 bg-black/60 px-3 py-2">
      <span className="text-paper/55">{icon}</span>
      <span className="min-w-0 text-right">
        <span className="block text-[9px] uppercase tracking-widest text-paper/40">{label}</span>
        <span className="block truncate text-lg text-paper">{value}</span>
      </span>
    </div>
  );
}

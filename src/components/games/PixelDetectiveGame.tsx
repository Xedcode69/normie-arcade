"use client";

import { Crosshair, RotateCcw, Search, Timer, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NormieImage } from "@/components/normies/NormieImage";
import { playTone } from "@/lib/audio";
import { NormieAPIService } from "@/services/NormieAPIService";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useLeaderboardRecorder } from "@/hooks/useLeaderboardRecorder";
import { GameResultPanel } from "@/components/games/GameResultPanel";

const RUN_SECONDS = 60;
const COUNTDOWN_SECONDS = 3;
const MAX_ID = 9999;

type Phase = "idle" | "loading" | "countdown" | "running" | "ended";

type PixelRound = {
  targetId: number;
  options: number[];
  rows: string[];
  crop: { x: number; y: number; size: number };
};

type RevealedGuess = {
  guessedId: number;
  correctId: number;
  wasCorrect: boolean;
};

function randomId() {
  return Math.floor(Math.random() * (MAX_ID + 1));
}

function randomOptions(targetId: number) {
  const ids = new Set<number>([targetId]);
  while (ids.size < 4) ids.add(randomId());
  return [...ids].sort(() => Math.random() - 0.5);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function fragmentSizeForTime(timeLeft: number) {
  if (timeLeft > 45) return 12;
  if (timeLeft > 20) return 10;
  return 8;
}

function buildFragment(pixels: string, size: number) {
  const cleaned = pixels.trim();
  if (cleaned.length < 1600) {
    throw new Error("Pixel payload was incomplete.");
  }

  const litPixels: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < 1600; index += 1) {
    if (cleaned[index] === "1") litPixels.push({ x: index % 40, y: Math.floor(index / 40) });
  }

  const center = litPixels.length ? litPixels[Math.floor(Math.random() * litPixels.length)] : { x: 20, y: 20 };
  const x = clamp(center.x - Math.floor(size / 2) + Math.floor(Math.random() * 5) - 2, 0, 40 - size);
  const y = clamp(center.y - Math.floor(size / 2) + Math.floor(Math.random() * 5) - 2, 0, 40 - size);
  const rows = Array.from({ length: size }, (_, row) =>
    cleaned.slice((y + row) * 40 + x, (y + row) * 40 + x + size)
  );

  return { rows, crop: { x, y, size } };
}

function suspectStateClass(id: number, revealedGuess: RevealedGuess | null) {
  if (!revealedGuess) return "";
  if (id !== revealedGuess.correctId && id !== revealedGuess.guessedId) return "opacity-35";
  return "";
}

function suspectStateStyle(id: number, revealedGuess: RevealedGuess | null): React.CSSProperties {
  if (!revealedGuess) {
    return { borderColor: "rgba(244,241,232,0.3)" };
  }

  if (id === revealedGuess.correctId) {
    return {
      borderColor: "#22c55e",
      backgroundColor: "rgba(34,197,94,0.14)",
      boxShadow: "0 0 0 2px rgba(34,197,94,0.95), 0 0 34px rgba(34,197,94,0.72)"
    };
  }

  if (id === revealedGuess.guessedId) {
    return {
      borderColor: "#ef4444",
      backgroundColor: "rgba(239,68,68,0.14)",
      boxShadow: "0 0 0 2px rgba(239,68,68,0.95), 0 0 34px rgba(239,68,68,0.7)"
    };
  }

  return { borderColor: "rgba(244,241,232,0.15)" };
}

export function PixelDetectiveGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(RUN_SECONDS);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [round, setRound] = useState<PixelRound | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [revealedGuess, setRevealedGuess] = useState<RevealedGuess | null>(null);
  const [message, setMessage] = useState("Inspect the pixel fragment and identify the matching Normie.");
  const [lastResult, setLastResult] = useState("Case board idle.");
  const loadingRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  const notify = useArcadeStore((state) => state.notify);
  const recordLeaderboardResult = useLeaderboardRecorder();

  const beginCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS);
    setPhase("countdown");
    setMessage("Evidence locked. Study the suspects before the case opens.");
    setLastResult("Case opens in 3.");
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const loadRound = useCallback(async () => {
    if (loadingRef.current || phaseRef.current === "ended") return;
    loadingRef.current = true;
    setPhase((current) => (current === "idle" ? "loading" : current));

    try {
      const targetId = randomId();
      const pixels = await NormieAPIService.fetchNormiePixels(targetId);
      const fragment = buildFragment(pixels, fragmentSizeForTime(timeLeft));
      setRound({
        targetId,
        options: randomOptions(targetId),
        rows: fragment.rows,
        crop: fragment.crop
      });
      beginCountdown();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pixel feed failed.");
      setLastResult("Could not load a clean pixel fragment.");
      setPhase("idle");
    } finally {
      loadingRef.current = false;
    }
  }, [beginCountdown, timeLeft]);

  useEffect(() => {
    if (phase !== "countdown") return undefined;

    if (countdown <= 0) {
      setPhase("running");
      setMessage("Match the fragment to the correct suspect.");
      setLastResult("Case open. Identify the suspect.");
      return undefined;
    }

    setLastResult(`Case opens in ${countdown}.`);
    const timeout = window.setTimeout(() => {
      setCountdown((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [countdown, phase]);

  useEffect(() => {
    if (phase !== "running") return undefined;

    const interval = window.setInterval(() => {
      setTimeLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running" || timeLeft > 0) return;

    setPhase("ended");
    playTone(740, 0.2, "triangle");
    setMessage("Investigation closed.");
    setLastResult(`FINAL - ${score} correct, ${mistakes} misses, best streak ${bestStreak}.`);
    void recordLeaderboardResult({
      game: "PIXEL_DETECTIVE",
      mode: "SKILL",
      outcome: score > 0 ? "WIN" : "LOSS",
      score,
      chipsWon: 0,
      netChips: 0,
      bestCombo: bestStreak,
      metadata: { mistakes, seconds: RUN_SECONDS }
    });
    notify({
      kind: "info",
      title: "Pixel Detective closed",
      body: `${score} correct IDs in ${RUN_SECONDS} seconds.`
    });
  }, [bestStreak, mistakes, notify, phase, recordLeaderboardResult, score, timeLeft]);

  useEffect(() => {
    if (phase !== "running") return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const index = Number(event.key) - 1;
      if (!round || index < 0 || index >= round.options.length) return;
      event.preventDefault();
      guess(round.options[index]);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function start() {
    if (phase === "loading" || phase === "running") return;
    phaseRef.current = "loading";
    setPhase("loading");
    setTimeLeft(RUN_SECONDS);
    setCountdown(COUNTDOWN_SECONDS);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setMistakes(0);
    setRound(null);
    setRevealedGuess(null);
    setMessage("Pulling pixel evidence from the Normies API.");
    setLastResult("New investigation started.");
    void loadRound();
  }

  function reset() {
    setPhase("idle");
    setTimeLeft(RUN_SECONDS);
    setCountdown(COUNTDOWN_SECONDS);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setMistakes(0);
    setRound(null);
    setRevealedGuess(null);
    setMessage("Inspect the pixel fragment and identify the matching Normie.");
    setLastResult("Case board idle.");
  }

  function guess(id: number) {
    if (phase !== "running" || !round || loadingRef.current || revealedGuess) return;

    if (id === round.targetId) {
      const nextStreak = streak + 1;
      setScore((value) => value + 1);
      setStreak(nextStreak);
      setBestStreak((value) => Math.max(value, nextStreak));
      setLastResult(`Correct - fragment matched Normie #${round.targetId}.`);
      playTone(560 + Math.min(nextStreak, 8) * 28, 0.1, "triangle");
    } else {
      setMistakes((value) => value + 1);
      setStreak(0);
      setLastResult(`Miss - evidence belonged to Normie #${round.targetId}, not #${id}.`);
      playTone(180, 0.16, "square");
    }

    setRevealedGuess({
      guessedId: id,
      correctId: round.targetId,
      wasCorrect: id === round.targetId
    });

    window.setTimeout(() => {
      setRevealedGuess(null);
      void loadRound();
    }, 850);
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 pb-4 pt-1">
      <header className="shrink-0 text-center">
        <h2 className="font-display text-lg uppercase tracking-[0.24em] text-paper">Pixel Detective</h2>
        <p className="terminal-hash mx-auto mt-1 max-w-4xl truncate text-xs text-pixel/70">{message}</p>
      </header>

      <section className="mx-auto mt-4 grid w-full max-w-5xl grid-cols-2 gap-2 md:grid-cols-5">
        <Metric icon={<Timer size={15} />} label="Clock" value={`${timeLeft}s`} />
        <Metric icon={<Trophy size={15} />} label="Correct" value={score} />
        <Metric label="Streak" value={streak} />
        <Metric label="Best" value={bestStreak} />
        <Metric label="Misses" value={mistakes} />
      </section>

      <div className="mx-auto mt-4 w-full max-w-5xl">
        <GameResultPanel
          visible={phase === "ended"}
          title="Pixel Detective"
          result="complete"
          finalScore={`${score} correct`}
          bestMoment={`Best streak x${bestStreak}. ${mistakes} missed suspect${mistakes === 1 ? "" : "s"}.`}
          leaderboard={{ game: "PIXEL_DETECTIVE", mode: "SKILL", label: "Detective Leaderboard" }}
          playAgainLabel="Open New Case"
          onPlayAgain={start}
        />
      </div>

      <main className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(20rem,28rem)_minmax(0,1fr)]">
        <section className="game-panel min-h-0 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">Evidence Fragment</div>
              <div className="mt-1 font-display text-2xl uppercase tracking-[0.08em] text-paper">
                {round ? `${round.crop.size}x${round.crop.size} Crop` : "No Case"}
              </div>
            </div>
            <button
              onClick={phase === "idle" || phase === "ended" ? start : reset}
              className="inline-flex shrink-0 items-center justify-center gap-2 border border-paper/70 bg-paper/10 px-4 py-2 text-xs uppercase tracking-widest text-paper shadow-neon transition hover:bg-paper/15"
            >
              {phase === "idle" || phase === "ended" ? <Search size={15} /> : <RotateCcw size={15} />}
              {phase === "idle" || phase === "ended" ? "Start" : "Reset"}
            </button>
          </div>

          <div className="grid min-h-80 place-items-center border border-paper/15 bg-black/70 p-4">
            {round ? (
              <div className="relative">
                <PixelFragment rows={round.rows} size={round.crop.size} />
                {phase === "countdown" ? (
                  <div className="absolute inset-0 grid place-items-center border border-mint/70 bg-black/65 font-display text-5xl text-mint shadow-neon">
                    {countdown}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid place-items-center gap-3 text-center text-paper/55">
                <Crosshair size={38} />
                <span>{phase === "loading" ? "Scanning pixels..." : "Start a 60-second pixel case."}</span>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-paper/20 pt-3">
            <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Last Read</div>
            <div className="mt-1 min-h-6 text-sm leading-relaxed text-paper/75">{lastResult}</div>
          </div>
        </section>

        <section className="min-h-0 min-w-0">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">Suspects</div>
              <div className="text-sm text-paper/60">Pick the full Normie matching the cropped pixel evidence.</div>
            </div>
            <div className="hidden border border-paper/20 bg-black/55 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-paper/50 md:block">
              Keys 1-4 select suspects
            </div>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(round?.options ?? [0, 1, 2, 3]).map((id, index) => (
              <button
                key={`${id}-${index}`}
                disabled={phase !== "running" || !round || Boolean(revealedGuess)}
                onClick={() => guess(id)}
                className={`group grid min-h-72 min-w-0 grid-rows-[1fr_auto] overflow-hidden border-2 bg-black/70 p-2 text-left transition hover:-translate-y-0.5 hover:border-mint/80 hover:bg-mint/10 disabled:cursor-default md:p-3 ${suspectStateClass(id, revealedGuess)}`}
                style={suspectStateStyle(id, revealedGuess)}
              >
                {round ? (
                  <NormieImage src={NormieAPIService.imageUrl(id)} alt={`Normie suspect #${id}`} className="mx-auto h-40 w-full max-w-40 border border-paper/30 bg-paper object-contain xl:h-36 xl:max-w-36 2xl:h-40 2xl:max-w-40" />
                ) : (
                  <div className="mx-auto h-40 w-full max-w-40 animate-pulse border border-paper/15 bg-paper/10 xl:h-36 xl:max-w-36 2xl:h-40 2xl:max-w-40" />
                )}
                <span className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-paper/15 pt-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm uppercase tracking-[0.14em] text-paper">Normie #{round ? id : "----"}</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-paper/45">Suspect {index + 1}</span>
                  </span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center border border-paper/30 text-pixel/75 group-hover:border-mint group-hover:text-mint">{index + 1}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function PixelFragment({ rows, size }: { rows: string[]; size: number }) {
  return (
    <div className="border-2 border-paper bg-[#e3e5e4] p-2 shadow-[6px_6px_0_#000]">
      <div className="grid h-64 w-64 border border-black/25" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {rows.join("").split("").map((pixel, index) => (
          <span
            key={index}
            className="border border-black/10"
            style={{ backgroundColor: pixel === "1" ? "#48494b" : "#e3e5e4" }}
          />
        ))}
      </div>
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

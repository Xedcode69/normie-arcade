"use client";

import { RotateCcw, Send, Timer, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NormieImage } from "@/components/normies/NormieImage";
import { playTone } from "@/lib/audio";
import { NormieAPIService } from "@/services/NormieAPIService";
import { useAccountStore } from "@/stores/accountStore";
import { useArcadeStore } from "@/stores/arcadeStore";
import type { Normie } from "@/types/normie";
import { useLeaderboardRecorder } from "@/hooks/useLeaderboardRecorder";
import { GameResultPanel } from "@/components/games/GameResultPanel";

const RUN_SECONDS = 30;
const RULE_EVERY = 4;
const LEADERBOARD_KEY = "normie-sort-sprint-leaderboard:v1";
const START_QUEUE_TARGET = 48;
const START_MIN_READY = 30;
const MIN_QUEUE_BUFFER = 22;
const REFILL_BATCH_SIZE = 28;

const fallbackRuleLabels = {
  Expression: [],
  Age: ["Young", "Middle-Aged", "Old"],
  "Facial Feature": [],
  "Hair Style": []
} as const;

type Rule = keyof typeof fallbackRuleLabels;
type Phase = "idle" | "loading" | "running" | "ended";
type SortSprintEntry = {
  id: string;
  player: string;
  correct: number;
  mistakes: number;
  bestCombo: number;
  accuracy: number;
  createdAt: string;
};

const rules: Rule[] = ["Expression", "Age", "Facial Feature", "Hair Style"];

function displayTrait(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : "Unknown";
}

function nextRule(current: Rule) {
  const index = rules.indexOf(current);
  return rules[(index + 1) % rules.length];
}

function seededShuffle<T>(items: T[], seed: string) {
  const shuffled = [...items];
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const swapIndex = hash % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function buildBins(rule: Rule, current: Normie | null, queue: Normie[]) {
  const liveValues = [current, ...queue]
    .map((normie) => displayTrait(normie?.traits[rule]))
    .filter((value) => current && displayTrait(current.traits[rule]) === "Unknown" ? true : value !== "Unknown");
  const values = Array.from(new Set([...liveValues, ...fallbackRuleLabels[rule]]));
  const expected = current ? displayTrait(current.traits[rule]) : "";
  const compact = values.filter((value) => expected === "Unknown" || value !== "Unknown").slice(0, 8);
  const withExpected = expected && !compact.includes(expected) ? [expected, ...compact.slice(0, 7)] : compact;

  return seededShuffle(withExpected, `${current?.id ?? "empty"}:${rule}:${withExpected.join("|")}`);
}

function rankEntries(entries: SortSprintEntry[]) {
  return [...entries]
    .sort((left, right) => {
      if (right.correct !== left.correct) return right.correct - left.correct;
      if (right.accuracy !== left.accuracy) return right.accuracy - left.accuracy;
      if (right.bestCombo !== left.bestCombo) return right.bestCombo - left.bestCombo;
      if (left.mistakes !== right.mistakes) return left.mistakes - right.mistakes;
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    })
    .slice(0, 8);
}

function loadLeaderboard() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(LEADERBOARD_KEY) ?? "[]");
    return Array.isArray(parsed) ? rankEntries(parsed as SortSprintEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(entries: SortSprintEntry[]) {
  window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(rankEntries(entries)));
}

export function SortSprintGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState<number>(RUN_SECONDS);
  const [rule, setRule] = useState<Rule>("Expression");
  const [sortsOnRule, setSortsOnRule] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [current, setCurrent] = useState<Normie | null>(null);
  const [queue, setQueue] = useState<Normie[]>([]);
  const [leaderboard, setLeaderboard] = useState<SortSprintEntry[]>([]);
  const [message, setMessage] = useState("Clock in, read the rule, and throw Normies into the right bin.");
  const [lastResult, setLastResult] = useState("Waiting for the sorting belt.");
  const loadingRef = useRef(false);
  const currentRef = useRef<Normie | null>(null);
  const queueRef = useRef<Normie[]>([]);
  const loadGenerationRef = useRef(0);
  const notify = useArcadeStore((state) => state.notify);
  const displayName = useAccountStore((state) => state.displayName);
  const username = useAccountStore((state) => state.username);
  const recordLeaderboardResult = useLeaderboardRecorder();

  const bins = useMemo(() => buildBins(rule, current, queue), [current, queue, rule]);

  useEffect(() => {
    setLeaderboard(loadLeaderboard());
  }, []);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const loadMore = useCallback(async (target = REFILL_BATCH_SIZE) => {
    if (loadingRef.current) return;
    const generation = loadGenerationRef.current;
    loadingRef.current = true;
    try {
      const requested = Math.max(1, Math.round(target));
      const normies = await NormieAPIService.getRandomNormies(requested);
      if (generation !== loadGenerationRef.current) return;

      setQueue((items) => {
        const nextItems = [...items, ...normies];
        queueRef.current = nextItems;
        if (currentRef.current) {
          return nextItems;
        }

        const [next, ...rest] = nextItems;
        currentRef.current = next ?? null;
        queueRef.current = rest;
        setCurrent(next ?? null);
        return rest;
      });
    } catch {
      if (generation === loadGenerationRef.current) {
        notify({ kind: "loss", title: "Sort Belt Delayed", body: "Could not load the next Normie batch. Retrying." });
      }
    } finally {
      if (generation === loadGenerationRef.current) {
        loadingRef.current = false;
      }
    }
  }, [notify]);

  const warmQueue = useCallback(async () => {
    if (loadingRef.current) return;
    const generation = loadGenerationRef.current;
    loadingRef.current = true;
    try {
      const needed = Math.max(START_MIN_READY, START_QUEUE_TARGET - queueRef.current.length - (currentRef.current ? 1 : 0));
      const normies = await NormieAPIService.getRandomNormies(needed);
      if (generation !== loadGenerationRef.current) return;

      setQueue((items) => {
        const nextItems = [...items, ...normies];
        queueRef.current = nextItems;
        if (currentRef.current) return nextItems;

        const [next, ...rest] = nextItems;
        currentRef.current = next ?? null;
        queueRef.current = rest;
        setCurrent(next ?? null);
        return rest;
      });
    } catch {
      if (generation === loadGenerationRef.current) {
        notify({ kind: "loss", title: "Sort Belt Delayed", body: "Preload failed. Retrying the belt fill." });
      }
    } finally {
      if (generation === loadGenerationRef.current) {
        loadingRef.current = false;
      }
    }
  }, [notify]);

  const pullNext = useCallback(() => {
    setQueue((items) => {
      const [next, ...rest] = items;
      currentRef.current = next ?? null;
      queueRef.current = rest;
      setCurrent(next ?? null);
      return rest;
    });
  }, []);

  useEffect(() => {
    if (phase === "idle" && !current && queue.length < START_MIN_READY) void loadMore(START_MIN_READY);
    if (phase === "loading" && queue.length + (current ? 1 : 0) < START_MIN_READY) void warmQueue();
    if (phase === "running" && queue.length < MIN_QUEUE_BUFFER) void loadMore(REFILL_BATCH_SIZE);
  }, [current, loadMore, phase, queue.length, warmQueue]);

  useEffect(() => {
    if (phase === "loading" && current && queue.length >= START_MIN_READY - 1) {
      setPhase("running");
      setMessage("Sorting belt online. Score as many correct sorts as possible.");
      setLastResult("30-second shift started.");
    }
  }, [current, phase, queue.length]);

  useEffect(() => {
    if (phase !== "running") return undefined;

    const interval = window.setInterval(() => {
      setTimeLeft((value) => (currentRef.current ? Math.max(0, value - 1) : value));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running" || timeLeft > 0) return;

    const totalAttempts = correct + mistakes;
    const accuracy = totalAttempts > 0 ? Math.round((correct / totalAttempts) * 100) : 0;
    const entry: SortSprintEntry = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      player: displayName || username || "Guest Sorter",
      correct,
      mistakes,
      bestCombo,
      accuracy,
      createdAt: new Date().toISOString()
    };
    const ranked = rankEntries([...leaderboard, entry]);
    setLeaderboard(ranked);
    saveLeaderboard(ranked);
    setPhase("ended");
    playTone(760, 0.2, "triangle");
    setMessage("Shift complete. Score posted to the cabinet board.");
    setLastResult(`FINAL - ${correct} correct, ${accuracy}% accuracy, best combo ${bestCombo}.`);
    void recordLeaderboardResult({
      game: "SORT_SPRINT",
      mode: "SKILL",
      outcome: correct > 0 ? "WIN" : "LOSS",
      score: correct,
      chipsWon: 0,
      netChips: 0,
      bestCombo,
      metadata: { mistakes, accuracy, seconds: RUN_SECONDS }
    });
    notify({
      kind: "info",
      title: "Sort Sprint complete",
      body: `${correct} correct selections in ${RUN_SECONDS} seconds.`
    });
  }, [bestCombo, correct, displayName, leaderboard, mistakes, notify, phase, recordLeaderboardResult, timeLeft, username]);

  function start() {
    if (phase === "running" || phase === "loading") return;

    const readyCount = queueRef.current.length + (currentRef.current ? 1 : 0);
    setPhase(readyCount >= START_MIN_READY ? "running" : "loading");
    setTimeLeft(RUN_SECONDS);
    setRule("Expression");
    setSortsOnRule(0);
    setCorrect(0);
    setCombo(0);
    setBestCombo(0);
    setMistakes(0);
    setMessage(readyCount >= START_MIN_READY ? "Sorting belt online. Score as many correct sorts as possible." : "Preloading the sorting belt.");
    setLastResult(readyCount >= START_MIN_READY ? "30-second shift started." : "Filling the queue before the clock starts.");
    if (readyCount < START_QUEUE_TARGET) void warmQueue();
  }

  function reset() {
    loadGenerationRef.current += 1;
    loadingRef.current = false;
    currentRef.current = null;
    queueRef.current = [];
    setPhase("idle");
    setTimeLeft(RUN_SECONDS);
    setRule("Expression");
    setSortsOnRule(0);
    setCorrect(0);
    setCombo(0);
    setBestCombo(0);
    setMistakes(0);
    setCurrent(null);
    setQueue([]);
    setMessage("Clock in, read the rule, and throw Normies into the right bin.");
    setLastResult("Waiting for the sorting belt.");
  }

  function sortTo(bin: string) {
    if (phase !== "running" || !current) return;

    const expected = displayTrait(current.traits[rule]);
    const correct = bin === expected;

    if (correct) {
      const nextCombo = combo + 1;
      const nextSortsOnRule = sortsOnRule + 1;
      setCorrect((value) => value + 1);
      setCombo(nextCombo);
      setBestCombo((value) => Math.max(value, nextCombo));
      setSortsOnRule(nextSortsOnRule);
      playTone(520 + Math.min(nextCombo, 12) * 24, 0.1, "triangle");
      setLastResult(`Correct - ${expected}. Combo ${nextCombo}.`);

      if (nextSortsOnRule >= RULE_EVERY) {
        const changedRule = nextRule(rule);
        setRule(changedRule);
        setSortsOnRule(0);
        setMessage(`Rule swap. Sort by ${changedRule}.`);
      }
    } else {
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      setCombo(0);
      playTone(190, 0.16, "square");
      setLastResult(`Wrong bin - ${current.metadata?.name ?? `Normie #${current.id}`} was ${expected}.`);
      setMessage(nextMistakes >= 3 ? "Three wrong bins is rough. One clean streak can still save it." : "Wrong bin. Combo reset.");
    }

    pullNext();
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 pb-4 pt-1">
      <header className="shrink-0 text-center">
        <h2 className="font-display text-lg uppercase tracking-[0.24em] text-paper">Normie Sort Sprint</h2>
        <p className="terminal-hash mx-auto mt-1 max-w-4xl truncate text-xs text-pixel/70">{message}</p>
      </header>

      <section className="mx-auto mt-4 grid w-full max-w-6xl grid-cols-2 gap-2 md:grid-cols-[1.25fr_repeat(5,minmax(0,1fr))]">
        <div className="col-span-2 border border-mint/55 bg-mint/10 px-3 py-2 md:col-span-1">
          <div className="terminal-hash text-[9px] uppercase tracking-[0.2em] text-mint/75">Rule</div>
          <div className="truncate font-display text-xl uppercase tracking-[0.14em] text-paper">{rule}</div>
        </div>
        <Metric icon={<Timer size={15} />} label="Clock" value={`${timeLeft}s`} />
        <Metric icon={<Trophy size={15} />} label="Correct" value={correct} />
        <Metric label="Combo" value={combo} />
        <Metric label="Best" value={bestCombo} />
        <Metric label="Mistakes" value={mistakes} />
      </section>

      <div className="mx-auto mt-4 w-full max-w-6xl">
        <GameResultPanel
          visible={phase === "ended"}
          title="Sort Sprint"
          result="complete"
          finalScore={`${correct} correct`}
          bestMoment={`Best combo x${bestCombo}. ${correct + mistakes > 0 ? `${Math.round((correct / (correct + mistakes)) * 100)}% accuracy.` : "No bins sorted."}`}
          leaderboard={{ game: "SORT_SPRINT", mode: "SKILL", label: "Sort Leaderboard" }}
          playAgainLabel="Start New Shift"
          onPlayAgain={start}
        />
      </div>

      <main className="mt-4 grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(20rem,28rem)_minmax(0,1fr)]">
        <section className="game-panel min-h-0 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">On The Belt</div>
              <div className="mt-1 font-display text-2xl uppercase tracking-[0.08em] text-paper">
                {current?.metadata?.name ?? (current ? `Normie #${current.id}` : "Sorter Ready")}
              </div>
            </div>
            <button
              onClick={phase === "idle" ? start : reset}
              className="inline-flex shrink-0 items-center justify-center gap-2 border border-paper/70 bg-paper/10 px-4 py-2 text-xs uppercase tracking-widest text-paper shadow-neon transition hover:bg-paper/15"
            >
              {phase === "idle" ? <Send size={15} /> : <RotateCcw size={15} />}
              {phase === "idle" ? "Start" : "Reset"}
            </button>
          </div>

          {current ? (
            <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] xl:grid-cols-1">
              <NormieImage src={current.image} alt={`Normie ${current.id}`} className="mx-auto h-36 w-36 border border-paper/30 bg-paper object-cover" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                {rules.map((item) => (
                  <div key={item} className={`min-w-0 border px-3 py-2 ${item === rule ? "border-mint bg-mint/10 text-mint" : "border-paper/20 text-paper/65"}`}>
                    <span className="block text-[9px] uppercase tracking-widest text-paper/40">{item}</span>
                    <span className="block truncate">{displayTrait(current.traits[item])}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid min-h-56 place-items-center border border-paper/15 bg-black/50 text-paper/55">
              {phase === "loading"
                ? "Preloading the sorting belt..."
                : phase === "running"
                  ? "Refilling the belt. Clock paused..."
                  : "Start a 30-second sorting shift."}
            </div>
          )}

          <div className="mt-4 border-t border-paper/20 pt-3">
            <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Last Sort</div>
            <div className="mt-1 min-h-6 text-sm leading-relaxed text-paper/75">{lastResult}</div>
          </div>
        </section>

        <section className="min-h-0">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">Sorting Bins</div>
              <div className="text-sm text-paper/60">Choose the bin matching the highlighted trait.</div>
            </div>
            <div className="hidden border border-paper/20 bg-black/55 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-paper/50 md:block">
              30 seconds / highest correct wins
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {bins.map((bin) => (
              <button
                key={bin}
                disabled={phase !== "running" || !current}
                onClick={() => sortTo(bin)}
                className="group grid min-h-24 place-items-center border border-paper/30 bg-black/70 px-3 py-4 text-center transition hover:-translate-y-0.5 hover:border-mint/80 hover:bg-mint/10 disabled:opacity-40"
              >
                <Send className="mb-2 text-paper/60 transition group-hover:text-mint" size={18} />
                <span className="text-sm uppercase tracking-[0.12em] text-paper">{bin}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      <section className="mt-4 shrink-0 border-t border-paper/20 pt-3">
        <div className="mb-2 flex items-center justify-center gap-2 terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/70">
          <Trophy size={14} /> Sort Sprint Leaderboard
        </div>
        <div className="mx-auto grid w-full max-w-5xl gap-2 md:grid-cols-2">
          {leaderboard.length ? (
            leaderboard.slice(0, 4).map((entry, index) => (
              <div key={entry.id} className="grid grid-cols-[2rem_minmax(0,1fr)_4rem_4rem_4rem] items-center gap-2 border border-paper/15 bg-black/60 px-3 py-2 text-sm">
                <span className="text-pixel/70">#{index + 1}</span>
                <span className="truncate text-paper">{entry.player}</span>
                <span className="text-right text-paper">{entry.correct}</span>
                <span className="text-right text-paper/65">{entry.accuracy}%</span>
                <span className="text-right text-paper/65">x{entry.bestCombo}</span>
              </div>
            ))
          ) : (
            <div className="col-span-full border border-paper/15 bg-black/50 px-3 py-3 text-center text-sm text-paper/55">
              No runs posted yet.
            </div>
          )}
        </div>
      </section>
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

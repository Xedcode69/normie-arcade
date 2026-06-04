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

const RUN_SECONDS = 30;
const RULE_EVERY = 4;
const LEADERBOARD_KEY = "normie-sort-sprint-leaderboard:v1";

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
    .filter((value) => value !== "Unknown");
  const values = Array.from(new Set([...liveValues, ...fallbackRuleLabels[rule]]));
  const expected = current ? displayTrait(current.traits[rule]) : "";
  const compact = values.filter((value) => value !== "Unknown").slice(0, 8);
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
  const notify = useArcadeStore((state) => state.notify);
  const displayName = useAccountStore((state) => state.displayName);
  const username = useAccountStore((state) => state.username);
  const recordLeaderboardResult = useLeaderboardRecorder();

  const bins = useMemo(() => buildBins(rule, current, queue), [current, queue, rule]);

  useEffect(() => {
    setLeaderboard(loadLeaderboard());
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const normies = await NormieAPIService.getRandomNormies(6);
      if (current) {
        setQueue((items) => [...items, ...normies]);
      } else {
        setCurrent(normies[0] ?? null);
        setQueue((items) => [...items, ...normies.slice(1)]);
      }
    } finally {
      loadingRef.current = false;
    }
  }, [current]);

  const pullNext = useCallback(() => {
    setQueue((items) => {
      const [next, ...rest] = items;
      setCurrent(next ?? null);
      return rest;
    });
  }, []);

  useEffect(() => {
    if ((phase === "idle" || phase === "running") && queue.length < 4) void loadMore();
  }, [loadMore, phase, queue.length]);

  useEffect(() => {
    if (phase === "loading" && current) setPhase("running");
  }, [current, phase]);

  useEffect(() => {
    if (phase !== "running") return undefined;

    const interval = window.setInterval(() => {
      setTimeLeft((value) => Math.max(0, value - 1));
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

    setPhase(current ? "running" : "loading");
    setTimeLeft(RUN_SECONDS);
    setRule("Expression");
    setSortsOnRule(0);
    setCorrect(0);
    setCombo(0);
    setBestCombo(0);
    setMistakes(0);
    setMessage("Sorting belt online. Score as many correct sorts as possible.");
    setLastResult("30-second shift started.");
    if (!current || queue.length < 4) void loadMore();
  }

  function reset() {
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
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-4 pt-1">
      <div className="shrink-0 text-center">
        <h2 className="font-display text-lg uppercase tracking-[0.24em] text-paper">Normie Sort Sprint</h2>
        <p className="terminal-hash mx-auto mt-1 max-w-4xl truncate text-xs text-pixel/70">{message}</p>
      </div>

      <div className="mt-5 flex shrink-0 items-center justify-center">
        <div className="pixel-card px-5 py-2 text-center text-xs uppercase tracking-[0.2em] text-paper/75">
          30 seconds / ranked by correct selections
        </div>
      </div>

      <div className="mt-5 grid min-h-0 flex-1 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)_17rem]">
        <section className="hud-panel flex min-h-0 flex-col justify-between p-4">
          <div>
            <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-mint/70">Current Rule</div>
            <div className="mt-2 font-display text-4xl uppercase text-paper neon-text">{rule}</div>
            <div className="mt-3 text-sm text-paper/65">Send the active Normie to the bin matching its {rule} trait.</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="pixel-card px-3 py-2">
              <Timer className="mx-auto mb-1" size={16} />
              <div className="text-xl text-paper">{timeLeft}s</div>
              <div className="text-[9px] uppercase tracking-widest text-paper/45">Clock</div>
            </div>
            <div className="pixel-card px-3 py-2">
              <Trophy className="mx-auto mb-1" size={16} />
              <div className="text-xl text-paper">{correct}</div>
              <div className="text-[9px] uppercase tracking-widest text-paper/45">Correct</div>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col items-center justify-center gap-4">
          <div className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {bins.map((bin) => (
              <button
                key={bin}
                disabled={phase !== "running" || !current}
                onClick={() => sortTo(bin)}
                className="group min-h-24 border border-paper/30 bg-black/70 px-3 py-4 text-center transition hover:-translate-y-0.5 hover:border-paper/70 disabled:opacity-40"
              >
                <Send className="mx-auto mb-2 text-paper/70 transition group-hover:text-paper" size={18} />
                <span className="block text-sm uppercase tracking-[0.12em] text-paper">{bin}</span>
              </button>
            ))}
          </div>

          <div className="pixel-card w-full max-w-2xl p-4">
            {current ? (
              <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
                <NormieImage src={current.image} alt={`Normie ${current.id}`} className="mx-auto h-36 w-36 object-cover" />
                <div className="min-w-0">
                  <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">On The Belt</div>
                  <div className="mt-1 font-display text-3xl uppercase text-paper">{current.metadata?.name ?? `Normie #${current.id}`}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    {rules.map((item) => (
                      <div key={item} className={`border px-3 py-2 ${item === rule ? "border-mint text-mint" : "border-paper/20 text-paper/65"}`}>
                        <span className="block text-[9px] uppercase tracking-widest text-paper/40">{item}</span>
                        <span className="truncate">{displayTrait(current.traits[item])}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid h-48 place-items-center text-paper/55">{phase === "loading" ? "Loading the belt..." : "Start a shift to load Normies."}</div>
            )}
          </div>
        </section>

        <section className="hud-panel flex min-h-0 flex-col justify-between p-4">
          <div className="space-y-3">
            <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/70">Shift Stats</div>
            <div className="grid gap-2">
              <Stat label="Combo" value={combo} />
              <Stat label="Best" value={bestCombo} />
              <Stat label="Mistakes" value={mistakes} />
              <Stat label="Queued" value={queue.length} />
            </div>
          </div>
          <div className="space-y-2">
            <button
              onClick={phase === "idle" ? start : reset}
              className="inline-flex w-full items-center justify-center gap-2 border border-paper/70 bg-paper/10 px-5 py-3 text-xs uppercase tracking-widest text-paper shadow-neon transition hover:bg-paper/15"
            >
              {phase === "idle" ? <Send size={16} /> : <RotateCcw size={16} />}
              {phase === "idle" ? "Start Shift" : "Reset"}
            </button>
            <div className="border-t border-paper/20 pt-3">
              <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Last Sort</div>
              <div className="mt-1 text-sm leading-relaxed text-paper/75">{lastResult}</div>
            </div>
          </div>
        </section>
      </div>
      <section className="mt-4 shrink-0 border-t border-paper/20 pt-3">
        <div className="mb-2 flex items-center justify-center gap-2 terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/70">
          <Trophy size={14} /> Sort Sprint Leaderboard
        </div>
        <div className="mx-auto grid w-full max-w-5xl gap-2 md:grid-cols-2">
          {leaderboard.length ? (
            leaderboard.slice(0, 6).map((entry, index) => (
              <div key={entry.id} className="grid grid-cols-[2rem_minmax(0,1fr)_4rem_4rem_4rem] items-center gap-2 border border-paper/15 bg-black/60 px-3 py-2 text-sm">
                <span className="text-pixel/70">#{index + 1}</span>
                <span className="truncate text-paper">{entry.player}</span>
                <span className="text-right text-paper">{entry.correct}</span>
                <span className="text-right text-paper/65">{entry.accuracy}%</span>
                <span className="text-right text-paper/65">x{entry.bestCombo}</span>
              </div>
            ))
          ) : (
            <div className="col-span-full border border-paper/15 bg-black/50 px-3 py-4 text-center text-sm text-paper/55">
              No runs posted yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border border-paper/15 bg-black/55 px-3 py-2">
      <span className="text-[10px] uppercase tracking-widest text-paper/45">{label}</span>
      <span className="text-sm text-paper">{value}</span>
    </div>
  );
}

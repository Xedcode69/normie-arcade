"use client";

import { RotateCcw, Send, Timer, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NormieImage } from "@/components/normies/NormieImage";
import { playTone } from "@/lib/audio";
import { NormieAPIService } from "@/services/NormieAPIService";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useChipStore } from "@/stores/chipStore";
import type { Normie } from "@/types/normie";
import { BetControls } from "./BetControls";

const modes = {
  easy: { label: "Easy", seconds: 45, target: 12, payout: 2, ruleEvery: 5 },
  medium: { label: "Medium", seconds: 40, target: 16, payout: 4, ruleEvery: 4 },
  hard: { label: "Hard", seconds: 35, target: 20, payout: 7, ruleEvery: 3 }
} as const;

const fallbackRuleLabels = {
  Expression: [],
  Age: ["Young", "Middle-Aged", "Old"],
  "Facial Feature": [],
  "Hair Style": []
} as const;

type Mode = keyof typeof modes;
type Rule = keyof typeof fallbackRuleLabels;
type Phase = "idle" | "loading" | "running" | "won" | "lost";

const rules: Rule[] = ["Expression", "Age", "Facial Feature", "Hair Style"];

function displayTrait(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : "Unknown";
}

function nextRule(current: Rule) {
  const index = rules.indexOf(current);
  return rules[(index + 1) % rules.length];
}

function buildBins(rule: Rule, current: Normie | null, queue: Normie[]) {
  const liveValues = [current, ...queue]
    .map((normie) => displayTrait(normie?.traits[rule]))
    .filter((value) => value !== "Unknown");
  const values = Array.from(new Set([...liveValues, ...fallbackRuleLabels[rule]]));
  const expected = current ? displayTrait(current.traits[rule]) : "";
  const compact = values.filter((value) => value === expected || value !== "Unknown").slice(0, 8);

  return expected && !compact.includes(expected) ? [expected, ...compact.slice(0, 7)] : compact;
}

export function SortSprintGame() {
  const [mode, setMode] = useState<Mode>("medium");
  const [bet, setBet] = useState(100);
  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState<number>(modes.medium.seconds);
  const [rule, setRule] = useState<Rule>("Expression");
  const [sortsOnRule, setSortsOnRule] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [current, setCurrent] = useState<Normie | null>(null);
  const [queue, setQueue] = useState<Normie[]>([]);
  const [message, setMessage] = useState("Clock in, read the rule, and throw Normies into the right bin.");
  const [lastResult, setLastResult] = useState("Waiting for the sorting belt.");
  const loadingRef = useRef(false);
  const wager = useChipStore((state) => state.wager);
  const win = useChipStore((state) => state.win);
  const lose = useChipStore((state) => state.lose);
  const notify = useArcadeStore((state) => state.notify);
  const settings = modes[mode];

  const bins = useMemo(() => buildBins(rule, current, queue), [current, queue, rule]);

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
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(interval);
          setPhase("lost");
          lose();
          playTone(160, 0.25, "square");
          setMessage("Shift failed. The belt outran the sorter.");
          setLastResult(`LOSE - scored ${score}/${settings.target} before the clock hit zero.`);
          notify({
            kind: "loss",
            title: "Sort Sprint failed",
            body: `You sorted ${score}/${settings.target} before time expired.`
          });
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lose, notify, phase, score, settings.target]);

  function start() {
    if (phase === "running" || phase === "loading") return;
    if (!wager(bet)) {
      setLastResult("Not enough chips. Lower the bet.");
      return;
    }

    setPhase(current ? "running" : "loading");
    setTimeLeft(settings.seconds);
    setRule("Expression");
    setSortsOnRule(0);
    setScore(0);
    setCombo(0);
    setMistakes(0);
    setMessage("Sorting belt online. First rule: Expression.");
    setLastResult("Shift started.");
    if (!current || queue.length < 4) void loadMore();
  }

  function reset() {
    setPhase("idle");
    setTimeLeft(settings.seconds);
    setRule("Expression");
    setSortsOnRule(0);
    setScore(0);
    setCombo(0);
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
      const gained = 1 + Math.floor(nextCombo / 5);
      const nextScore = score + gained;
      const nextSortsOnRule = sortsOnRule + 1;
      setScore(nextScore);
      setCombo(nextCombo);
      setSortsOnRule(nextSortsOnRule);
      playTone(520 + Math.min(nextCombo, 12) * 24, 0.1, "triangle");
      setLastResult(`Correct - ${expected}. Combo ${nextCombo} scored +${gained}.`);

      if (nextScore >= settings.target) {
        const payout = bet * settings.payout + nextCombo * 10;
        setPhase("won");
        win(payout);
        playTone(780, 0.22, "sawtooth");
        setMessage("Shift cleared. The bins are immaculate.");
        setLastResult(`WIN - paid ${payout} chips with a ${nextCombo} combo.`);
        notify({
          kind: "win",
          title: "Sort Sprint cleared",
          body: `Paid ${payout} chips for ${nextScore} correct sorting points.`
        });
      } else if (nextSortsOnRule >= settings.ruleEvery) {
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

  const activeTrait = current ? displayTrait(current.traits[rule]) : "Loading";

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-4 pt-1">
      <div className="shrink-0 text-center">
        <h2 className="font-display text-lg uppercase tracking-[0.24em] text-paper">Normie Sort Sprint</h2>
        <p className="terminal-hash mx-auto mt-1 max-w-4xl truncate text-xs text-pixel/70">{message}</p>
      </div>

      <div className="mt-5 flex shrink-0 flex-wrap items-center justify-center gap-2">
        {(Object.keys(modes) as Mode[]).map((key) => (
          <button
            key={key}
            disabled={phase === "running" || phase === "loading"}
            onClick={() => {
              setMode(key);
              setTimeLeft(modes[key].seconds);
            }}
            className={`min-w-32 border px-3 py-2 text-xs uppercase tracking-widest transition ${
              mode === key ? "border-paper bg-paper/15 text-paper shadow-neon" : "border-paper/25 bg-black/60 text-paper/55 hover:border-paper/70"
            } disabled:opacity-45`}
          >
            {modes[key].label} {modes[key].target}
          </button>
        ))}
        <BetControls bet={bet} setBet={setBet} disabled={phase === "running" || phase === "loading"} />
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
              <div className="text-xl text-paper">{score}/{settings.target}</div>
              <div className="text-[9px] uppercase tracking-widest text-paper/45">Score</div>
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
                className={`group min-h-24 border bg-black/70 px-3 py-4 text-center transition hover:-translate-y-0.5 disabled:opacity-40 ${
                  activeTrait === bin ? "border-mint/80" : "border-paper/30 hover:border-paper/70"
                }`}
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
              <Stat label="Mistakes" value={mistakes} />
              <Stat label="Queued" value={queue.length} />
              <Stat label="Payout" value={`${settings.payout}x`} />
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

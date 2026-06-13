"use client";

import { Home, RefreshCw, Trophy } from "lucide-react";
import { useArcadeStore, type GameId } from "@/stores/arcadeStore";
import type { LeaderboardGame, LeaderboardMode } from "@/services/LeaderboardService";

type GameResultPanelProps = {
  visible: boolean;
  title: string;
  result: "win" | "loss" | "draw" | "complete";
  finalScore: string;
  chips?: string;
  bestMoment: string;
  leaderboard?: {
    game: LeaderboardGame;
    mode: LeaderboardMode;
    label: string;
  };
  playAgainLabel?: string;
  onPlayAgain: () => void;
};

export function GameResultPanel({
  visible,
  title,
  result,
  finalScore,
  chips,
  bestMoment,
  leaderboard,
  playAgainLabel = "Play Again",
  onPlayAgain
}: GameResultPanelProps) {
  const setActiveGame = useArcadeStore((state) => state.setActiveGame);
  const setLeaderboardOpen = useArcadeStore((state) => state.setLeaderboardOpen);

  if (!visible) return null;

  const resultClass =
    result === "win" ? "text-mint" : result === "loss" ? "text-magenta" : result === "draw" ? "text-paper" : "text-pixel";
  const resultLabel = result === "win" ? "Victory" : result === "loss" ? "Defeat" : result === "draw" ? "Draw" : "Complete";

  function openLeaderboard() {
    if (!leaderboard) return;
    setLeaderboardOpen(true);
    window.dispatchEvent(new CustomEvent("normie:select-leaderboard", { detail: { game: leaderboard.game, mode: leaderboard.mode } }));
  }

  return (
    <section className="mb-4 border border-paper/35 bg-black/85 p-4 shadow-neon">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-paper/15 pb-3">
        <div>
          <div className="terminal-hash text-[10px] uppercase tracking-[0.25em] text-pixel/65">Game Result</div>
          <div className={`mt-1 font-display text-3xl uppercase tracking-[0.18em] ${resultClass}`}>{resultLabel}</div>
        </div>
        <div className="text-right">
          <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/55">{title}</div>
          <div className="mt-1 font-display text-2xl text-paper">{finalScore}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ResultBlock label="Best Moment" value={bestMoment} />
        <ResultBlock label="Chips" value={chips ?? "No chip change"} />
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {leaderboard ? (
          <button onClick={openLeaderboard} className="inline-flex items-center gap-2 border border-mint/55 bg-mint/10 px-4 py-2 text-xs uppercase tracking-widest text-mint transition hover:bg-mint/15">
            <Trophy size={15} /> {leaderboard.label}
          </button>
        ) : null}
        <button onClick={onPlayAgain} className="inline-flex items-center gap-2 border border-paper/60 bg-paper/10 px-4 py-2 text-xs uppercase tracking-widest text-paper transition hover:bg-paper/15">
          <RefreshCw size={15} /> {playAgainLabel}
        </button>
        <button onClick={() => setActiveGame("lobby" as GameId)} className="inline-flex items-center gap-2 border border-paper/35 bg-black/70 px-4 py-2 text-xs uppercase tracking-widest text-paper/75 transition hover:border-paper hover:text-paper">
          <Home size={15} /> Return to City
        </button>
      </div>
    </section>
  );
}

function ResultBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-paper/15 bg-black/55 p-3">
      <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">{label}</div>
      <div className="mt-1 text-sm leading-relaxed text-paper">{value}</div>
    </div>
  );
}

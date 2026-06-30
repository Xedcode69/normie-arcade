"use client";

import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { NormieImage } from "@/components/normies/NormieImage";
import { fetchLeaderboard, type LeaderboardEntry, type LeaderboardGame, type LeaderboardMode } from "@/services/LeaderboardService";
import { useArcadeStore } from "@/stores/arcadeStore";

const boards: Array<{ label: string; game: LeaderboardGame; mode: LeaderboardMode }> = [
  { label: "Roulette", game: "ROULETTE", mode: "SOLO" },
  { label: "Up/Down", game: "UP_DOWN", mode: "SOLO" },
  { label: "RPS Solo", game: "RPS", mode: "SOLO" },
  { label: "RPS PvP", game: "RPS", mode: "PVP" },
  { label: "Poker PvP", game: "POKER", mode: "PVP" },
  { label: "TCG PvP", game: "TCG", mode: "PVP" },
  { label: "Sort", game: "SORT_SPRINT", mode: "SKILL" },
  { label: "Pixel", game: "PIXEL_DETECTIVE", mode: "SKILL" },
  { label: "Whack-A", game: "WHACK_RUSH", mode: "SKILL" },
  { label: "Shells", game: "NORMIE_SHELLS", mode: "SKILL" }
];

export function Leaderboard() {
  const open = useArcadeStore((state) => state.leaderboardOpen);
  const setOpen = useArcadeStore((state) => state.setLeaderboardOpen);
  const [selected, setSelected] = useState(boards[0]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    function selectBoard(event: Event) {
      const detail = (event as CustomEvent<{ game?: LeaderboardGame; mode?: LeaderboardMode }>).detail;
      const board = boards.find((item) => item.game === detail?.game && item.mode === detail?.mode);
      if (board) setSelected(board);
    }

    window.addEventListener("normie:select-leaderboard", selectBoard);
    return () => window.removeEventListener("normie:select-leaderboard", selectBoard);
  }, []);

  useEffect(() => {
    if (!open) return;

    let canceled = false;
    setLoading(true);
    setError(false);

    fetchLeaderboard(selected.game, selected.mode, 10)
      .then((result) => {
        if (!canceled) setEntries(result.entries);
      })
      .catch(() => {
        if (!canceled) {
          setEntries([]);
          setError(true);
        }
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [open, selected]);

  return (
    <aside className="pointer-events-auto fixed right-3 top-44 z-[130] md:right-5">
      <button
        aria-label="Toggle leaderboard"
        onClick={() => setOpen(!open)}
        className="ml-auto grid h-11 w-11 place-items-center hud-panel text-paper transition hover:scale-105"
      >
        <Trophy size={17} />
      </button>
      {open ? (
        <div className="mt-2 w-[min(92vw,24rem)] hud-panel p-3">
          <div className="terminal-hash mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-paper">
            <Trophy size={15} /> Leaderboard
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {boards.map((board) => {
              const active = board.game === selected.game && board.mode === selected.mode;
              return (
                <button
                  key={`${board.game}-${board.mode}`}
                  onClick={() => setSelected(board)}
                  className={`border px-2 py-2 text-[10px] uppercase tracking-widest transition ${
                    active ? "border-mint bg-mint/10 text-mint" : "border-paper/20 bg-black/55 text-paper/55 hover:border-paper/60"
                  }`}
                >
                  {board.label}
                </button>
              );
            })}
          </div>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 5 }, (_, index) => <div key={index} className="h-14 animate-pulse bg-white/10" />)
            ) : error ? (
              <div className="border border-paper/15 bg-black/50 px-3 py-4 text-center text-sm text-paper/55">
                Leaderboard unavailable.
              </div>
            ) : entries.length ? (
              entries.map((entry) => <LeaderboardRow key={`${entry.game}-${entry.mode}-${entry.rank}-${entry.player}`} entry={entry} />)
            ) : (
              <div className="border border-paper/15 bg-black/50 px-3 py-4 text-center text-sm text-paper/55">
                No ranked runs yet.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const skill = entry.mode === "SKILL";
  const tcg = entry.game === "TCG";

  return (
    <div className="pixel-card grid grid-cols-[1.5rem_2.25rem_minmax(0,1fr)_4.75rem] items-center gap-2 p-2">
      <div className="text-xs text-pixel/70">#{entry.rank}</div>
      {entry.avatarUrl ? (
        <NormieImage src={entry.avatarUrl} alt={`${entry.player} avatar`} className="h-9 w-9 bg-paper object-contain" />
      ) : (
        <div className="grid h-9 w-9 place-items-center border border-paper/20 bg-black/60 text-[9px] text-paper/45">0xN</div>
      )}
      <div className="min-w-0">
        <div className="truncate text-xs text-paper">{entry.player}</div>
        <div className="text-[10px] text-pixel/60">
          {skill ? `combo x${entry.bestCombo}` : tcg ? `best score ${entry.bestScore}` : `${entry.totalWins}W / ${entry.totalPlays}P`}
        </div>
      </div>
      <div className={`text-right text-sm ${skill || entry.netChips >= 0 ? "text-mint" : "text-magenta"}`}>
        {skill ? entry.bestScore : tcg ? `${entry.totalWins}W` : `${entry.netChips >= 0 ? "+" : ""}${entry.netChips}`}
      </div>
    </div>
  );
}

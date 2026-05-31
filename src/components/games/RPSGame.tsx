"use client";

import { motion } from "framer-motion";
import { Copy, Search, Swords, Users, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { rpsWinner } from "@/lib/gameMath";
import { useRpsPvp } from "@/hooks/useRpsPvp";
import { createRoomCode, normalizeRoomCode } from "@/lib/rpsPvp";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useChipStore } from "@/stores/chipStore";
import type { RPSType } from "@/types/normie";
import { RPS_TYPES } from "@/types/normie";
import { playTone } from "@/lib/audio";
import { BetControls } from "./BetControls";

type Score = { player: number; npc: number };
type FighterPick = { type: RPSType };
type MatchMode = "solo" | "pvp";

const typeImages: Record<RPSType, string> = {
  Human: "/human.png",
  Cat: "/cat.png",
  Alien: "/alien.png"
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function RPSGame() {
  const [mode, setMode] = useState<MatchMode>("solo");
  const [bet, setBet] = useState(150);
  const [score, setScore] = useState<Score>({ player: 0, npc: 0 });
  const [playerFighter, setPlayerFighter] = useState<FighterPick | null>(null);
  const [npcFighter, setNpcFighter] = useState<FighterPick | null>(null);
  const [message, setMessage] = useState("Best of 3. Human beats Cat, Cat beats Alien, Alien beats Human.");
  const [roundResult, setRoundResult] = useState("Choose a type to start the arena match.");
  const [locked, setLocked] = useState(false);
  const wager = useChipStore((state) => state.wager);
  const win = useChipStore((state) => state.win);
  const lose = useChipStore((state) => state.lose);
  const notify = useArcadeStore((state) => state.notify);

  async function playRound(playerType: RPSType) {
    if (locked) return;
    const roundStart = score.player === 0 && score.npc === 0;
    if (roundStart && !wager(bet)) {
      notify({ kind: "loss", title: "Table rejected", body: "You need more chips for that match." });
      return;
    }

    setLocked(true);
    setMessage("Arena gates opening...");
    setRoundResult("Round in progress...");
    await wait(280);
    const npcType = RPS_TYPES[Math.floor(Math.random() * RPS_TYPES.length)];
    setPlayerFighter({ type: playerType });
    setNpcFighter({ type: npcType });

    const result = rpsWinner(playerType, npcType);
    const nextScore = { ...score };
    if (result === "player") nextScore.player += 1;
    if (result === "npc") nextScore.npc += 1;
    setScore(nextScore);

    if (result === "draw") {
      setMessage(`${playerType} mirrors ${npcType}. Draw round.`);
      setRoundResult(`DRAW - ${playerType} mirrored ${npcType}. Score ${nextScore.player}-${nextScore.npc}.`);
      playTone(420, 0.15);
    } else {
      setMessage(`${playerType} versus ${npcType}. ${result === "player" ? "You take the round." : "NPC takes the round."}`);
      setRoundResult(`${result === "player" ? "ROUND WIN" : "ROUND LOSS"} - ${playerType} vs ${npcType}. Score ${nextScore.player}-${nextScore.npc}.`);
      playTone(result === "player" ? 680 : 220, 0.18, "triangle");
    }

    if (nextScore.player >= 2 || nextScore.npc >= 2) {
      const won = nextScore.player > nextScore.npc;
      if (won) {
        win(bet * 2.4);
        setRoundResult(`MATCH WIN - final score ${nextScore.player}-${nextScore.npc}. 2.4x payout awarded.`);
      } else {
        lose();
        setRoundResult(`MATCH LOSS - final score ${nextScore.player}-${nextScore.npc}. The dealer keeps the wager.`);
      }
      setTimeout(() => setScore({ player: 0, npc: 0 }), 900);
    }

    setLocked(false);
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col justify-start px-4 pt-1">
      <div className="shrink-0 text-center">
        <h2 className="font-display text-lg uppercase tracking-[0.24em] text-paper">Normie Type RPS</h2>
        <p className="terminal-hash mx-auto mt-3 max-w-4xl truncate text-xs text-pixel/70">
          {mode === "solo" ? message : "PvP quick match. First challenger to 2 round wins takes the arena."}
        </p>
      </div>
      <div className="mt-6 flex shrink-0 justify-center gap-2">
        {(["solo", "pvp"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`min-w-28 border px-3 py-2 text-xs uppercase tracking-widest transition ${
              mode === value ? "border-paper bg-paper/15 text-paper shadow-neon" : "border-paper/25 bg-black/60 text-paper/55 hover:border-paper/70"
            }`}
          >
            {value === "solo" ? "Solo Dealer" : "PvP 1v1"}
          </button>
        ))}
      </div>
      {mode === "pvp" ? <RPSPvP bet={bet} setBet={setBet} /> : (
        <RPSSolo
          bet={bet}
          setBet={setBet}
          score={score}
          playerFighter={playerFighter}
          npcFighter={npcFighter}
          locked={locked}
          roundResult={roundResult}
          playRound={playRound}
        />
      )}
    </div>
  );
}

function RPSSolo({
  bet,
  setBet,
  score,
  playerFighter,
  npcFighter,
  locked,
  roundResult,
  playRound
}: {
  bet: number;
  setBet: (bet: number) => void;
  score: Score;
  playerFighter: FighterPick | null;
  npcFighter: FighterPick | null;
  locked: boolean;
  roundResult: string;
  playRound: (type: RPSType) => void;
}) {
  return (
    <>
      <div className="mt-8 grid shrink-0 grid-cols-1 justify-center gap-4 md:grid-cols-[minmax(0,22rem)_minmax(0,22rem)]">
        <Fighter label="You" fighter={playerFighter} />
        <Fighter label="NPC" fighter={npcFighter} />
      </div>
      <div className="mt-7 flex shrink-0 flex-wrap items-center justify-center gap-2">
        {RPS_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => playRound(type)}
            disabled={locked}
            className="inline-flex min-w-32 items-center justify-center gap-2 border border-paper/60 bg-paper/10 px-4 py-2 text-sm uppercase tracking-widest text-paper transition hover:bg-paper/15 disabled:opacity-50"
          >
            <Swords size={15} /> {type}
          </button>
        ))}
        <BetControls bet={bet} setBet={setBet} />
      </div>
      <div className="mt-5 flex shrink-0 justify-center">
        <div className="pixel-card px-5 py-2 text-sm text-paper">
          Score {score.player} - {score.npc}
        </div>
      </div>
      <div className="mx-auto mt-4 w-full max-w-4xl shrink-0 border-t border-paper/20 pt-4 text-center">
        <div className="mx-auto min-w-0 max-w-3xl text-center">
          <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Round Result</div>
          <div className="truncate text-sm text-paper">{roundResult}</div>
        </div>
      </div>
    </>
  );
}

function RPSPvP({ bet, setBet }: { bet: number; setBet: (bet: number) => void }) {
  const [roomCode, setRoomCode] = useState(() => {
    if (typeof window === "undefined") return "QUICKPLAY";
    return normalizeRoomCode(new URLSearchParams(window.location.search).get("rpsRoom") ?? "") || "QUICKPLAY";
  });
  const { connected, connect, disconnect, error, playerId, reset, state, submitPick } = useRpsPvp(`rps-${roomCode.toLowerCase()}`);
  const [entryPaid, setEntryPaid] = useState(false);
  const wager = useChipStore((store) => store.wager);
  const refund = useChipStore((store) => store.refund);
  const win = useChipStore((store) => store.win);
  const lose = useChipStore((store) => store.lose);
  const notify = useArcadeStore((store) => store.notify);
  const you = state.players.find((player) => player.id === playerId);
  const opponent = state.players.find((player) => player.id !== playerId);
  const waitingForOpponent = connected && state.phase === "waiting" && !opponent?.connected;
  const opponentDisconnected = Boolean(opponent && !opponent.connected);
  const reveal = state.reveal;
  const playerSeat = you?.seat ?? 0;
  const playerPick = reveal ? (playerSeat === 0 ? reveal.playerA : reveal.playerB) : undefined;
  const opponentPick = reveal ? (playerSeat === 0 ? reveal.playerB : reveal.playerA) : undefined;
  const phaseLabel = getPvpPhaseLabel({
    connected,
    error,
    opponentDisconnected,
    waitingForOpponent,
    youLocked: Boolean(you?.pick),
    opponentLocked: Boolean(opponent?.pick),
    phase: state.phase,
    hasOpponent: Boolean(opponent?.connected)
  });
  const roundResult =
    error ??
    (opponentDisconnected
      ? `${opponent?.name ?? "Opponent"} disconnected. They can rejoin this room code.`
      : state.phase === "finished"
      ? state.winnerId === playerId
        ? `MATCH WIN - final score ${you?.score ?? 0}-${opponent?.score ?? 0}.`
        : `MATCH LOSS - final score ${you?.score ?? 0}-${opponent?.score ?? 0}.`
      : state.message);

  function inviteUrl() {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("rpsRoom", roomCode);
    return url.toString();
  }

  function joinMatch() {
    if (!entryPaid) {
      if (!wager(bet)) {
        notify({ kind: "loss", title: "PvP entry rejected", body: "You need more chips for that match." });
        return;
      }
      setEntryPaid(true);
    }
    connect();
  }

  function cancelMatchmaking() {
    disconnect();
    if (entryPaid && waitingForOpponent) {
      refund(bet);
      notify({ kind: "info", title: "Matchmaking Canceled", body: `${bet} chips returned.` });
      setEntryPaid(false);
    }
  }

  async function copyInvite() {
    const link = inviteUrl();
    if (!link) return;

    await navigator.clipboard?.writeText(link);
    notify({ kind: "info", title: "Invite Copied", body: `Room ${roomCode} link copied.` });
  }

  function createRoom() {
    if (connected) return;
    setRoomCode(createRoomCode());
  }

  function handleReset() {
    if (state.phase === "finished") {
      if (state.winnerId === playerId) {
        win(bet * 2);
      } else {
        lose();
      }
      setEntryPaid(false);
    }
    reset();
  }

  return (
    <>
      <div className="mx-auto mt-6 grid w-full max-w-4xl shrink-0 gap-3 md:grid-cols-[1fr_auto_auto]">
        <label className="pixel-card flex min-w-0 items-center gap-3 px-3 py-2">
          <span className="terminal-hash shrink-0 text-[10px] uppercase tracking-[0.22em] text-pixel/60">Room</span>
          <input
            value={roomCode}
            disabled={connected}
            onChange={(event) => setRoomCode(normalizeRoomCode(event.target.value) || "QUICKPLAY")}
            className="min-w-0 flex-1 bg-transparent text-center font-display text-sm uppercase tracking-[0.22em] text-paper outline-none disabled:text-paper/60"
            aria-label="RPS room code"
          />
        </label>
        <button
          onClick={createRoom}
          disabled={connected}
          className="inline-flex items-center justify-center gap-2 border border-paper/40 bg-black/70 px-4 py-2 text-xs uppercase tracking-widest text-paper/75 transition hover:border-paper hover:text-paper disabled:opacity-40"
        >
          <Users size={15} /> New Room
        </button>
        <button
          onClick={copyInvite}
          className="inline-flex items-center justify-center gap-2 border border-paper/40 bg-black/70 px-4 py-2 text-xs uppercase tracking-widest text-paper/75 transition hover:border-paper hover:text-paper"
        >
          <Copy size={15} /> Copy Link
        </button>
      </div>
      <div className="mx-auto mt-3 flex w-full max-w-4xl shrink-0 items-center justify-center border border-paper/25 bg-black/45 px-4 py-2 text-center">
        <span className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">{phaseLabel}</span>
      </div>
      <div className="mt-8 grid shrink-0 grid-cols-1 justify-center gap-4 md:grid-cols-[minmax(0,22rem)_minmax(0,22rem)]">
        <Fighter label={you?.name ?? "You"} fighter={playerPick ? { type: playerPick } : null} locked={Boolean(you?.pick)} status={connected ? "Connected" : "Offline"} />
        <Fighter
          label={opponent?.name ?? "Opponent"}
          fighter={opponentPick ? { type: opponentPick } : null}
          locked={Boolean(opponent?.pick)}
          status={opponentDisconnected ? "Disconnected" : opponent?.connected ? "Connected" : "Searching"}
        />
      </div>
      <div className="mt-7 flex shrink-0 flex-wrap items-center justify-center gap-2">
        {!connected ? (
          <button
            onClick={joinMatch}
            className="inline-flex min-w-36 items-center justify-center gap-2 border border-paper/70 bg-paper/10 px-4 py-2 text-sm uppercase tracking-widest text-paper shadow-neon transition hover:bg-paper/15"
          >
            <Search size={15} /> Join Room
          </button>
        ) : waitingForOpponent ? (
          <button
            onClick={cancelMatchmaking}
            className="inline-flex min-w-44 items-center justify-center gap-2 border border-paper/50 bg-black/70 px-4 py-2 text-sm uppercase tracking-widest text-paper/80 transition hover:border-paper hover:text-paper"
          >
            <X size={15} /> Cancel Matchmaking
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="inline-flex min-w-32 items-center justify-center gap-2 border border-paper/40 bg-black/70 px-4 py-2 text-sm uppercase tracking-widest text-paper/70 transition hover:border-paper hover:text-paper"
          >
            Leave
          </button>
        )}
        {RPS_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => submitPick(type)}
            disabled={!connected || state.phase !== "playing" || Boolean(you?.pick) || state.players.length < 2}
            className="inline-flex min-w-32 items-center justify-center gap-2 border border-paper/60 bg-paper/10 px-4 py-2 text-sm uppercase tracking-widest text-paper transition hover:bg-paper/15 disabled:opacity-50"
          >
            <Swords size={15} /> {type}
          </button>
        ))}
        <BetControls bet={bet} setBet={setBet} />
      </div>
      <div className="mt-5 flex shrink-0 flex-wrap justify-center gap-3">
        <div className="pixel-card px-5 py-2 text-sm text-paper">
          Score {you?.score ?? 0} - {opponent?.score ?? 0}
        </div>
        <div className="pixel-card px-5 py-2 text-sm uppercase tracking-widest text-paper/80">
          {connected ? `Round ${state.round}` : "Offline"}
        </div>
        {state.phase === "finished" ? (
          <button
            onClick={handleReset}
            className="border border-paper/60 bg-paper/10 px-5 py-2 text-sm uppercase tracking-widest text-paper transition hover:bg-paper/15"
          >
            Rematch
          </button>
        ) : null}
      </div>
      <div className="mx-auto mt-4 w-full max-w-4xl shrink-0 border-t border-paper/20 pt-4 text-center">
        <div className="mx-auto min-w-0 max-w-3xl text-center">
          <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">PvP Result</div>
          <div className="truncate text-sm text-paper">{roundResult}</div>
        </div>
      </div>
    </>
  );
}

function getPvpPhaseLabel({
  connected,
  error,
  opponentDisconnected,
  waitingForOpponent,
  youLocked,
  opponentLocked,
  phase,
  hasOpponent
}: {
  connected: boolean;
  error: string | null;
  opponentDisconnected: boolean;
  waitingForOpponent: boolean;
  youLocked: boolean;
  opponentLocked: boolean;
  phase: "waiting" | "playing" | "revealed" | "finished";
  hasOpponent: boolean;
}) {
  if (error) return "Connection Error";
  if (!connected) return "Enter or create a room, then join";
  if (opponentDisconnected) return "Opponent disconnected - waiting for reconnect";
  if (waitingForOpponent) return "Searching for opponent";
  if (phase === "revealed") return "Reveal";
  if (phase === "finished") return "Match complete";
  if (phase === "playing" && hasOpponent && !youLocked) return "Opponent joined - choose move";
  if (phase === "playing" && youLocked && !opponentLocked) return "Waiting for opponent";
  if (phase === "playing" && youLocked && opponentLocked) return "Both moves locked - reveal incoming";
  return "Connecting to arena";
}

function Fighter({
  label,
  fighter,
  locked = false,
  status
}: {
  label: string;
  fighter: FighterPick | null;
  locked?: boolean;
  status?: string;
}) {
  return (
    <motion.div layout className="pixel-card p-3 text-center">
      <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-white/50">
        {label}
        {status ? <span className="border border-paper/20 px-1.5 py-0.5 text-[9px] text-pixel/60">{status}</span> : null}
      </div>
      {fighter ? (
        <Image
          src={typeImages[fighter.type]}
          alt={`${fighter.type} fighter`}
          width={96}
          height={96}
          className="mx-auto mt-2 h-24 w-24 object-contain"
        />
      ) : (
        <div className="mx-auto mt-2 h-24 w-24 animate-pulse bg-white/10" />
      )}
      <div className="mt-2 font-display text-base text-white">{fighter?.type ?? (locked ? "Locked" : "Awaiting")}</div>
    </motion.div>
  );
}

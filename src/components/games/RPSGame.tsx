"use client";

import { motion } from "framer-motion";
import { Copy, Home, Search, Swords, Users, X } from "lucide-react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef, useState } from "react";
import { rpsWinner } from "@/lib/gameMath";
import { useRpsPvp } from "@/hooks/useRpsPvp";
import { createRoomCode, normalizeRoomCode } from "@/lib/rpsPvp";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useChipStore } from "@/stores/chipStore";
import { useAccountStore } from "@/stores/accountStore";
import type { RPSType } from "@/types/normie";
import { RPS_TYPES } from "@/types/normie";
import { playTone } from "@/lib/audio";
import { BetControls } from "./BetControls";

type Score = { player: number; npc: number };
type FighterPick = { type: RPSType };
type MatchMode = "solo" | "pvp";
type RoomMode = "quick" | "create" | "join";
const RPS_RECONNECT_KEY = "normie-rps-active-room";

const typeImages: Record<RPSType, string> = {
  Human: "/human.png",
  Cat: "/cat.png",
  Alien: "/alien.png"
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function friendlyPvpError(error: string | null) {
  if (!error) return null;
  if (error.toLowerCase().includes("full")) return error;
  if (error.toLowerCase().includes("insufficient")) return "You do not have enough chips reserved for this PvP wager.";
  if (error.toLowerCase().includes("connect")) return "The PvP room is not reachable. Make sure PartyKit is running, then try again.";
  return error;
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
    const urlRoom = normalizeRoomCode(new URLSearchParams(window.location.search).get("rpsRoom") ?? "");
    if (urlRoom) return urlRoom;
    const stored = window.sessionStorage.getItem(RPS_RECONNECT_KEY);
    if (!stored) return "QUICKPLAY";
    try {
      const parsed = JSON.parse(stored) as { roomCode?: string };
      return normalizeRoomCode(parsed.roomCode ?? "") || "QUICKPLAY";
    } catch {
      return "QUICKPLAY";
    }
  });
  const [roomMode, setRoomMode] = useState<RoomMode>(() => (roomCode === "QUICKPLAY" ? "quick" : "join"));
  const [joinCode, setJoinCode] = useState(() => (roomCode === "QUICKPLAY" ? "" : roomCode));
  const { connected, connect, clearError, disconnect, error, playerId, reset, state, submitPick } = useRpsPvp(`rps-${roomCode.toLowerCase()}`);
  const { ready, authenticated, getAccessToken, login } = usePrivy();
  const holderProfile = useAccountStore((store) => ({
    username: store.username,
    displayName: store.displayName,
    isNormieHolder: store.isNormieHolder,
    selectedNormieId: store.selectedNormieId,
    selectedNormieImage: store.selectedNormieImage
  }));
  const setBalance = useChipStore((store) => store.setBalance);
  const notify = useArcadeStore((store) => store.notify);
  const setActiveGame = useArcadeStore((store) => store.setActiveGame);
  const you = state.players.find((player) => player.id === playerId);
  const opponent = state.players.find((player) => player.id !== playerId);
  const waitingForOpponent = connected && state.phase === "waiting" && !opponent?.connected;
  const opponentDisconnected = Boolean(opponent && !opponent.connected);
  const reveal = state.reveal;
  const playerSeat = you?.seat ?? 0;
  const playerPick = reveal ? (playerSeat === 0 ? reveal.playerA : reveal.playerB) : undefined;
  const opponentPick = reveal ? (playerSeat === 0 ? reveal.playerB : reveal.playerA) : undefined;
  const bothLocked = connected && state.phase === "playing" && Boolean(you?.pick) && Boolean(opponent?.pick);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [effect, setEffect] = useState<"win" | "loss" | "draw" | null>(null);
  const [seenReveal, setSeenReveal] = useState<string | null>(null);
  const previousOpponentConnected = useRef(false);
  const previousYouLocked = useRef(false);
  const previousOpponentLocked = useRef(false);
  const previousPhase = useRef(state.phase);
  const reconnectAttempted = useRef(false);
  const friendlyError = friendlyPvpError(error);
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
    friendlyError ??
    you?.accountError ??
    (opponentDisconnected
      ? `${opponent?.name ?? "Opponent"} disconnected. They can rejoin this room code.`
      : state.phase === "finished"
      ? state.winnerId === playerId
        ? `MATCH WIN - final score ${you?.score ?? 0}-${opponent?.score ?? 0}.`
        : `MATCH LOSS - final score ${you?.score ?? 0}-${opponent?.score ?? 0}.`
      : state.message);
  const banner = getRoundBanner({
    connected,
    phase: state.phase,
    round: state.round,
    bothLocked,
    countdown,
    reveal,
    playerSeat,
    playerScore: you?.score ?? 0,
    opponentScore: opponent?.score ?? 0,
    winnerId: state.winnerId,
    playerId
  });

  useEffect(() => {
    const opponentConnected = Boolean(opponent?.connected);
    if (connected && opponentConnected && !previousOpponentConnected.current) {
      playTone(620, 0.12, "triangle");
      window.setTimeout(() => playTone(840, 0.1, "triangle"), 90);
    }
    previousOpponentConnected.current = opponentConnected;
  }, [connected, opponent?.connected]);

  useEffect(() => {
    const youLocked = Boolean(you?.pick);
    const opponentLocked = Boolean(opponent?.pick);

    if (youLocked && !previousYouLocked.current) {
      playTone(520, 0.08, "square");
    }
    if (opponentLocked && !previousOpponentLocked.current) {
      playTone(470, 0.08, "square");
    }

    previousYouLocked.current = youLocked;
    previousOpponentLocked.current = opponentLocked;
  }, [opponent?.pick, you?.pick]);

  useEffect(() => {
    if (state.phase === "finished" && previousPhase.current !== "finished") {
      playTone(state.winnerId === playerId ? 880 : 180, 0.24, state.winnerId === playerId ? "triangle" : "sawtooth");
      window.setTimeout(() => playTone(state.winnerId === playerId ? 1120 : 120, 0.18, "triangle"), 130);
    }
    previousPhase.current = state.phase;
  }, [playerId, state.phase, state.winnerId]);

  useEffect(() => {
    if (!bothLocked) {
      setCountdown(null);
      return;
    }

    setCountdown("3");
    playTone(360, 0.08, "square");
    const sequence = ["2", "1", "Reveal"];
    let index = 0;
    const timer = window.setInterval(() => {
      setCountdown(sequence[index] ?? null);
      playTone(index === 2 ? 720 : 420 + index * 80, 0.08, "square");
      if (index === 2) {
        window.setTimeout(() => playTone(980, 0.18, "triangle"), 120);
      }
      index += 1;
      if (index > sequence.length) {
        window.clearInterval(timer);
      }
    }, 750);

    return () => window.clearInterval(timer);
  }, [bothLocked]);

  useEffect(() => {
    if (!reveal) return;
    const key = `${state.round}-${reveal.playerA}-${reveal.playerB}-${reveal.winner}`;
    if (seenReveal === key) return;

    setSeenReveal(key);
    const playerWon =
      reveal.winner !== "draw" && ((playerSeat === 0 && reveal.winner === "playerA") || (playerSeat === 1 && reveal.winner === "playerB"));
    const nextEffect = reveal.winner === "draw" ? "draw" : playerWon ? "win" : "loss";
    setEffect(nextEffect);
    playTone(nextEffect === "win" ? 740 : nextEffect === "loss" ? 190 : 430, 0.2, nextEffect === "loss" ? "square" : "triangle");
    const timer = window.setTimeout(() => setEffect(null), 1400);
    return () => window.clearTimeout(timer);
  }, [playerSeat, reveal, seenReveal, state.round]);

  useEffect(() => {
    if (typeof window === "undefined" || reconnectAttempted.current || connected || !ready || !authenticated) return;
    const stored = window.sessionStorage.getItem(RPS_RECONNECT_KEY);
    if (!stored) return;

    reconnectAttempted.current = true;
    try {
      const parsed = JSON.parse(stored) as { roomCode?: string; bet?: number; roomMode?: RoomMode };
      const storedRoom = normalizeRoomCode(parsed.roomCode ?? "") || "QUICKPLAY";
      setRoomCode(storedRoom);
      setJoinCode(storedRoom === "QUICKPLAY" ? "" : storedRoom);
      setRoomMode(parsed.roomMode ?? (storedRoom === "QUICKPLAY" ? "quick" : "join"));
      if (typeof parsed.bet === "number") {
        setBet(parsed.bet);
      }

      getAccessToken().then((token) => {
        if (!token) return;
        connect({
          privyToken: token,
          bet: typeof parsed.bet === "number" ? parsed.bet : bet,
          name: holderProfile.displayName || holderProfile.username,
          isNormieHolder: holderProfile.isNormieHolder,
          selectedNormieId: holderProfile.selectedNormieId ?? null,
          avatarUrl: holderProfile.selectedNormieImage ?? null
        });
        notify({ kind: "info", title: "Reconnected", body: `Rejoining ${storedRoom === "QUICKPLAY" ? "quick match" : `room ${storedRoom}`}.` });
      });
    } catch {
      window.sessionStorage.removeItem(RPS_RECONNECT_KEY);
    }
  }, [authenticated, bet, connect, connected, getAccessToken, holderProfile, notify, ready, setBet]);

  useEffect(() => {
    if (error?.toLowerCase().includes("full")) {
      window.sessionStorage.removeItem(RPS_RECONNECT_KEY);
    }
  }, [error]);

  function inviteUrl() {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    if (roomCode === "QUICKPLAY") {
      url.searchParams.delete("rpsRoom");
    } else {
      url.searchParams.set("rpsRoom", roomCode);
    }
    return url.toString();
  }

  useEffect(() => {
    if (typeof you?.serverBalance === "number") {
      setBalance(you.serverBalance);
    }
  }, [setBalance, you?.serverBalance]);

  async function joinMatch() {
    if (!authenticated) {
      notify({ kind: "info", title: "Login Required", body: "Connect your account before entering PvP." });
      login();
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      notify({ kind: "loss", title: "PvP rejected", body: "Could not read your Privy session token." });
      return;
    }

    connect({
      privyToken: token,
      bet,
      name: holderProfile.displayName || holderProfile.username,
      isNormieHolder: holderProfile.isNormieHolder,
      selectedNormieId: holderProfile.selectedNormieId ?? null,
      avatarUrl: holderProfile.selectedNormieImage ?? null
    });

    window.sessionStorage.setItem(
      RPS_RECONNECT_KEY,
      JSON.stringify({
        roomCode,
        roomMode,
        bet
      })
    );
  }

  function selectRoomMode(mode: RoomMode) {
    if (connected) return;
    clearError();
    setRoomMode(mode);

    if (mode === "quick") {
      setRoomCode("QUICKPLAY");
      return;
    }

    if (mode === "create") {
      const nextCode = createRoomCode();
      setRoomCode(nextCode);
      setJoinCode(nextCode);
      return;
    }

    setRoomCode(normalizeRoomCode(joinCode) || "QUICKPLAY");
  }

  function cancelMatchmaking() {
    window.sessionStorage.removeItem(RPS_RECONNECT_KEY);
    disconnect();
    notify({ kind: "info", title: "Matchmaking Canceled", body: "The server is refunding your reserved PvP wager." });
  }

  async function copyInvite() {
    const link = inviteUrl();
    if (!link) return;

    await navigator.clipboard?.writeText(link);
    notify({ kind: "info", title: "Invite Copied", body: `Room ${roomCode} link copied.` });
  }

  function createPrivateRoom() {
    if (connected) return;
    clearError();
    const nextCode = createRoomCode();
    setRoomMode("create");
    setRoomCode(nextCode);
    setJoinCode(nextCode);
  }

  function updateJoinCode(value: string) {
    clearError();
    const nextCode = normalizeRoomCode(value);
    setJoinCode(nextCode);
    if (!connected && roomMode === "join") {
      setRoomCode(nextCode || "QUICKPLAY");
    }
  }

  function handleReset() {
    reset();
  }

  function leaveMatch() {
    window.sessionStorage.removeItem(RPS_RECONNECT_KEY);
    disconnect();
  }

  function returnToLobby() {
    window.sessionStorage.removeItem(RPS_RECONNECT_KEY);
    disconnect();
    setActiveGame("lobby");
  }

  return (
    <div className="relative">
      <VisualPulse effect={effect} />
      <ChipBurst active={effect === "win" || (state.phase === "finished" && state.winnerId === playerId)} />
      <div className="mx-auto mt-6 w-full max-w-4xl shrink-0">
        <div className="flex flex-wrap justify-center gap-2">
          {(["quick", "create", "join"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => selectRoomMode(mode)}
              disabled={connected}
              className={`min-w-32 border px-4 py-2 text-xs uppercase tracking-widest transition disabled:opacity-50 ${
                roomMode === mode ? "border-paper bg-paper/15 text-paper shadow-neon" : "border-paper/30 bg-black/70 text-paper/60 hover:border-paper/70"
              }`}
            >
              {mode === "quick" ? "Quick Match" : mode === "create" ? "Create Room" : "Join Room"}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="pixel-card flex min-w-0 items-center gap-3 px-3 py-2">
            <span className="terminal-hash shrink-0 text-[10px] uppercase tracking-[0.22em] text-pixel/60">
              {roomMode === "quick" ? "Match" : "Room"}
            </span>
            {roomMode === "join" && !connected ? (
              <input
                value={joinCode}
                onChange={(event) => updateJoinCode(event.target.value)}
                placeholder="ENTER CODE"
                className="min-w-0 flex-1 bg-transparent text-center font-display text-sm uppercase tracking-[0.22em] text-paper outline-none placeholder:text-paper/25"
                aria-label="RPS room code"
              />
            ) : (
              <div className="min-w-0 flex-1 truncate text-center font-display text-sm uppercase tracking-[0.22em] text-paper/85">
                {roomCode === "QUICKPLAY" ? "Quickplay" : roomCode}
              </div>
            )}
          </div>

          {roomMode === "create" && !connected ? (
            <button
              onClick={createPrivateRoom}
              className="inline-flex items-center justify-center gap-2 border border-paper/40 bg-black/70 px-4 py-2 text-xs uppercase tracking-widest text-paper/75 transition hover:border-paper hover:text-paper"
            >
              <Users size={15} /> Regenerate
            </button>
          ) : roomMode === "join" && !connected ? (
            <button
              onClick={() => setRoomCode(normalizeRoomCode(joinCode) || "QUICKPLAY")}
              disabled={!joinCode}
              className="inline-flex items-center justify-center gap-2 border border-paper/40 bg-black/70 px-4 py-2 text-xs uppercase tracking-widest text-paper/75 transition hover:border-paper hover:text-paper disabled:opacity-40"
            >
              Use Code
            </button>
          ) : (
            <div className="hidden md:block" />
          )}

          <button
            onClick={copyInvite}
            disabled={roomMode === "join" && !joinCode && !connected}
            className="inline-flex items-center justify-center gap-2 border border-paper/40 bg-black/70 px-4 py-2 text-xs uppercase tracking-widest text-paper/75 transition hover:border-paper hover:text-paper disabled:opacity-40"
          >
            <Copy size={15} /> Copy Invite
          </button>
        </div>
      </div>
      <div className="mx-auto mt-3 flex w-full max-w-4xl shrink-0 items-center justify-center border border-paper/25 bg-black/45 px-4 py-2 text-center">
        <span className={`terminal-hash text-[10px] uppercase tracking-[0.22em] ${friendlyError ? "text-magenta" : "text-pixel/60"}`}>{phaseLabel}</span>
      </div>
      <RoundBanner text={banner} effect={effect} />
      <VersusArena
        left={
          <Fighter
            label={you?.name ?? "You"}
            fighter={playerPick ? { type: playerPick } : null}
            locked={Boolean(you?.pick)}
            status={connected ? "Connected" : "Offline"}
            hiddenPick={Boolean(you?.pick) && !playerPick}
            isNormieHolder={you?.isNormieHolder}
            selectedNormieId={you?.selectedNormieId}
            avatarUrl={you?.avatarUrl}
          />
        }
        right={
          <Fighter
            label={opponent?.name ?? "Opponent"}
            fighter={opponentPick ? { type: opponentPick } : null}
            locked={Boolean(opponent?.pick)}
            status={opponentDisconnected ? "Disconnected" : opponent?.connected ? "Connected" : "Searching"}
            hiddenPick={Boolean(opponent?.pick) && !opponentPick}
            isNormieHolder={opponent?.isNormieHolder}
            selectedNormieId={opponent?.selectedNormieId}
            avatarUrl={opponent?.avatarUrl}
          />
        }
        active={state.phase === "revealed" || state.phase === "finished"}
        countdown={countdown}
      />
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
            onClick={leaveMatch}
            className="inline-flex min-w-32 items-center justify-center gap-2 border border-paper/40 bg-black/70 px-4 py-2 text-sm uppercase tracking-widest text-paper/70 transition hover:border-paper hover:text-paper"
          >
            Leave
          </button>
        )}
        {RPS_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => submitPick(type)}
            disabled={!connected || state.phase !== "playing" || Boolean(you?.pick) || state.players.length < 2 || Boolean(you?.accountError)}
            className="inline-flex min-w-32 items-center justify-center gap-2 border border-paper/60 bg-paper/10 px-4 py-2 text-sm uppercase tracking-widest text-paper transition hover:bg-paper/15 disabled:opacity-50"
          >
            <Swords size={15} /> {type}
          </button>
        ))}
        <BetControls bet={bet} setBet={setBet} disabled={connected} />
      </div>
      <div className="mt-5 flex shrink-0 flex-wrap justify-center gap-3">
        <div className="pixel-card px-5 py-2 text-sm text-paper">
          Score {you?.score ?? 0} - {opponent?.score ?? 0}
        </div>
        <div className="pixel-card px-5 py-2 text-sm uppercase tracking-widest text-paper/80">
          {connected ? `Round ${state.round}` : "Offline"}
        </div>
        {typeof you?.serverBalance === "number" ? (
          <div className="pixel-card px-5 py-2 text-sm text-paper">Server chips {you.serverBalance}</div>
        ) : null}
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
      <PvPMatchSummary
        visible={state.phase === "finished"}
        you={you}
        opponent={opponent}
        playerSeat={playerSeat}
        winnerId={state.winnerId}
        history={state.history}
        fallbackBet={bet}
        onRematch={handleReset}
        onReturnToLobby={returnToLobby}
      />
    </div>
  );
}

function PvPMatchSummary({
  visible,
  you,
  opponent,
  playerSeat,
  winnerId,
  history,
  fallbackBet,
  onRematch,
  onReturnToLobby
}: {
  visible: boolean;
  you: { id: string; name: string; score: number; bet?: number } | undefined;
  opponent: { id: string; name: string; score: number; bet?: number } | undefined;
  playerSeat: 0 | 1;
  winnerId?: string;
  history: Array<{
    round: number;
    playerA: RPSType;
    playerB: RPSType;
    winner: "playerA" | "playerB" | "draw";
    scoreA: number;
    scoreB: number;
  }>;
  fallbackBet: number;
  onRematch: () => void;
  onReturnToLobby: () => void;
}) {
  if (!visible) return null;

  const won = winnerId === you?.id;
  const wager = you?.bet ?? fallbackBet;
  const chipDelta = won ? wager : -wager;
  const finalScore = `${you?.score ?? 0} - ${opponent?.score ?? 0}`;

  function moveFor(entry: (typeof history)[number], seat: 0 | 1) {
    return seat === 0 ? entry.playerA : entry.playerB;
  }

  function resultFor(entry: (typeof history)[number]) {
    if (entry.winner === "draw") return "Draw";
    const playerWon = (playerSeat === 0 && entry.winner === "playerA") || (playerSeat === 1 && entry.winner === "playerB");
    return playerWon ? "Win" : "Loss";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mt-5 w-full max-w-4xl border border-paper/55 bg-black/85 p-4 shadow-neon"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="terminal-hash text-[10px] uppercase tracking-[0.24em] text-pixel/60">Match Summary</div>
          <h3 className="mt-1 font-display text-lg uppercase tracking-[0.18em] text-paper">{won ? "Victory" : "Defeat"}</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right">
          <div className="border border-paper/25 px-3 py-2">
            <div className="terminal-hash text-[9px] uppercase tracking-widest text-pixel/55">Final Score</div>
            <div className="text-lg text-paper">{finalScore}</div>
          </div>
          <div className="border border-paper/25 px-3 py-2">
            <div className="terminal-hash text-[9px] uppercase tracking-widest text-pixel/55">Chips</div>
            <div className={`text-lg ${chipDelta >= 0 ? "text-mint" : "text-magenta"}`}>
              {chipDelta >= 0 ? "+" : ""}
              {chipDelta}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {history.map((entry) => (
          <div
            key={`${entry.round}-${entry.playerA}-${entry.playerB}`}
            className="grid grid-cols-[4.5rem_1fr_5rem] items-center gap-3 border border-paper/20 bg-black/55 px-3 py-2 text-xs text-paper/75"
          >
            <span className="terminal-hash uppercase tracking-widest text-pixel/55">Round {entry.round}</span>
            <span className="truncate text-center">
              {moveFor(entry, playerSeat)} vs {moveFor(entry, playerSeat === 0 ? 1 : 0)}
            </span>
            <span className={`text-right uppercase ${resultFor(entry) === "Win" ? "text-mint" : resultFor(entry) === "Loss" ? "text-magenta" : "text-paper/55"}`}>
              {resultFor(entry)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          onClick={onRematch}
          className="inline-flex items-center justify-center gap-2 border border-paper/60 bg-paper/10 px-5 py-2 text-sm uppercase tracking-widest text-paper transition hover:bg-paper/15"
        >
          <Swords size={15} /> Rematch
        </button>
        <button
          onClick={onReturnToLobby}
          className="inline-flex items-center justify-center gap-2 border border-paper/40 bg-black/70 px-5 py-2 text-sm uppercase tracking-widest text-paper/75 transition hover:border-paper hover:text-paper"
        >
          <Home size={15} /> Return to Lobby
        </button>
      </div>
    </motion.div>
  );
}
function getRoundBanner({
  connected,
  phase,
  round,
  bothLocked,
  countdown,
  reveal,
  playerSeat,
  playerScore,
  opponentScore,
  winnerId,
  playerId
}: {
  connected: boolean;
  phase: "waiting" | "playing" | "revealed" | "finished";
  round: number;
  bothLocked: boolean;
  countdown: string | null;
  reveal: { winner: "playerA" | "playerB" | "draw" } | undefined;
  playerSeat: 0 | 1;
  playerScore: number;
  opponentScore: number;
  winnerId?: string;
  playerId: string | null;
}) {
  if (!connected) return "RPS Arena";
  if (phase === "waiting") return "Searching";
  if (bothLocked) return countdown ? `${countdown}` : "Moves Locked";
  if (phase === "finished") return winnerId === playerId ? "Match Win" : "Match Loss";
  if (phase === "revealed" && reveal) {
    if (reveal.winner === "draw") return "Draw Round";
    const playerWon = (playerSeat === 0 && reveal.winner === "playerA") || (playerSeat === 1 && reveal.winner === "playerB");
    return playerWon ? "Round Win" : "Round Loss";
  }
  if (playerScore === 1 || opponentScore === 1) return "Match Point";
  return `Round ${round}`;
}

function RoundBanner({ text, effect }: { text: string; effect: "win" | "loss" | "draw" | null }) {
  return (
    <motion.div
      key={text}
      initial={{ y: -8, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      className={`mx-auto mt-5 w-fit border px-6 py-2 text-center font-display text-sm uppercase tracking-[0.28em] shadow-neon ${
        effect === "win"
          ? "border-mint text-mint"
          : effect === "loss"
          ? "border-magenta text-magenta"
          : "border-paper/60 text-paper"
      }`}
    >
      {text}
    </motion.div>
  );
}

function VersusArena({
  left,
  right,
  active,
  countdown
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  active: boolean;
  countdown: string | null;
}) {
  return (
    <div className="relative mx-auto mt-6 grid w-full max-w-5xl shrink-0 grid-cols-1 items-center justify-center gap-4 overflow-hidden border border-paper/25 bg-black/45 p-4 shadow-[inset_0_0_42px_rgba(244,241,232,0.05)] md:grid-cols-[minmax(0,22rem)_6rem_minmax(0,22rem)]">
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(244,241,232,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(244,241,232,0.06)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-paper/35 to-transparent" />
      <motion.div animate={{ x: active ? 22 : 0, scale: active ? 1.04 : 1 }} transition={{ type: "spring", stiffness: 180, damping: 18 }}>
        {left}
      </motion.div>
      <div className="relative z-10 grid min-h-24 place-items-center">
        <div className="absolute h-24 w-24 rounded-full border border-paper/25 bg-black/70 shadow-[0_0_36px_rgba(244,241,232,0.14)]" />
        <div className="absolute h-14 w-14 rounded-full border border-mint/25 shadow-[0_0_28px_rgba(39,246,231,0.18)]" />
        <motion.div
          key={countdown ?? "vs"}
          initial={{ scale: 0.72, opacity: 0, rotateX: -22 }}
          animate={{ scale: 1, opacity: 1, rotateX: 0 }}
          className="relative font-display text-lg uppercase tracking-[0.2em] text-paper neon-text"
        >
          {countdown ?? "VS"}
        </motion.div>
      </div>
      <motion.div animate={{ x: active ? -22 : 0, scale: active ? 1.04 : 1 }} transition={{ type: "spring", stiffness: 180, damping: 18 }}>
        {right}
      </motion.div>
    </div>
  );
}

function VisualPulse({ effect }: { effect: "win" | "loss" | "draw" | null }) {
  if (!effect) return null;

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.22, 0] }}
      transition={{ duration: 0.95 }}
      className={`pointer-events-none absolute inset-x-[-1rem] top-20 z-0 h-80 border ${
        effect === "win" ? "border-mint bg-mint/15" : effect === "loss" ? "border-magenta bg-magenta/15" : "border-paper/40 bg-paper/10"
      }`}
    />
  );
}

function ChipBurst({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute left-1/2 top-52 z-20 h-1 w-1">
      {Array.from({ length: 14 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 14;
        const distance = 72 + (index % 4) * 12;
        return (
          <motion.span
            key={index}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
            animate={{ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, opacity: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="absolute h-3 w-3 rounded-full border border-paper bg-black shadow-neon"
          />
        );
      })}
    </div>
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
  status,
  hiddenPick = false,
  isNormieHolder = false,
  selectedNormieId,
  avatarUrl
}: {
  label: string;
  fighter: FighterPick | null;
  locked?: boolean;
  status?: string;
  hiddenPick?: boolean;
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
}) {
  return (
    <motion.div layout className="relative z-10 border border-paper/55 bg-black/75 p-3 text-center shadow-[inset_0_0_28px_rgba(244,241,232,0.06)]">
      <div className="pointer-events-none absolute inset-x-3 top-10 h-px bg-gradient-to-r from-transparent via-paper/35 to-transparent" />
      <div className="flex min-h-8 flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-widest text-white/50">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={selectedNormieId !== null && selectedNormieId !== undefined ? `Normie #${selectedNormieId}` : "Normie avatar"}
            width={28}
            height={28}
            className="h-7 w-7 border border-paper/40 bg-paper object-contain"
            unoptimized
          />
        ) : null}
        <span>{label}</span>
        {isNormieHolder ? (
          <span className="border border-mint/60 px-1.5 py-0.5 text-[9px] text-mint">
            0xN{selectedNormieId !== null && selectedNormieId !== undefined ? ` #${selectedNormieId}` : ""}
          </span>
        ) : null}
        {status ? <span className="border border-paper/20 px-1.5 py-0.5 text-[9px] text-pixel/60">{status}</span> : null}
      </div>
      <div className="relative mx-auto mt-4 grid h-36 w-36 place-items-center">
        <div className="absolute inset-0 rotate-45 border border-paper/15 bg-paper/5" />
        <div className="absolute h-28 w-28 rounded-full border border-paper/20 bg-black/70" />
        {fighter ? (
          <motion.div
            initial={{ y: 12, opacity: 0, scale: 0.86 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            className="relative grid h-28 w-28 place-items-center rounded-full border border-paper/50 bg-paper shadow-[0_0_24px_rgba(244,241,232,0.18)]"
          >
            <Image
              src={typeImages[fighter.type]}
              alt={`${fighter.type} fighter`}
              width={104}
              height={104}
              className="h-24 w-24 object-contain drop-shadow-[0_0_12px_rgba(0,0,0,0.5)]"
            />
          </motion.div>
        ) : hiddenPick ? (
          <LockedFighterBack />
        ) : (
          <div className="relative grid h-28 w-28 place-items-center border border-paper/25 bg-black/80">
            <div className="h-16 w-16 animate-pulse border border-paper/15 bg-paper/10" />
          </div>
        )}
      </div>
      <div className="mt-2 font-display text-base text-white">{fighter?.type ?? (locked ? "Locked" : "Awaiting")}</div>
    </motion.div>
  );
}

function LockedFighterBack() {
  return (
    <motion.div
      animate={{
        boxShadow: ["0 0 0 rgba(244,241,232,0)", "0 0 28px rgba(244,241,232,0.34)", "0 0 0 rgba(244,241,232,0)"],
        rotateY: [0, 4, -4, 0]
      }}
      transition={{ duration: 1.4, repeat: Infinity }}
      className="relative grid h-28 w-24 place-items-center overflow-hidden border border-paper/60 bg-black/90"
    >
      <div className="absolute inset-2 border border-paper/20" />
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(244,241,232,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(244,241,232,0.08)_1px,transparent_1px)] [background-size:10px_10px]" />
      <div className="relative grid h-14 w-14 place-items-center rounded-full border border-mint/40 text-mint shadow-[0_0_20px_rgba(39,246,231,0.2)]">
        <Swords size={20} />
      </div>
      <span className="relative terminal-hash text-[9px] uppercase tracking-[0.22em] text-paper/70">Locked</span>
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Copy, Dices, LogOut, RotateCcw, Search, Users } from "lucide-react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useRef, useState } from "react";
import { CenteredNormieImage } from "@/components/normies/CenteredNormieImage";
import { playTone } from "@/lib/audio";
import { createPokerRoomCode, normalizePokerRoomCode } from "@/lib/pokerPvp";
import { usePokerPvp } from "@/hooks/usePokerPvp";
import { NormieAPIService } from "@/services/NormieAPIService";
import { useAccountStore } from "@/stores/accountStore";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useChipStore } from "@/stores/chipStore";
import type { Normie } from "@/types/normie";
import { BetControls } from "./BetControls";

type PokerHand = {
  name: string;
  multiplier: number;
  summary: string;
};
type PokerMode = "solo" | "pvp";
type PokerRoomMode = "create" | "join";
const POKER_RECONNECT_KEY = "normie-poker-active-room";

const handRanks = {
  none: { name: "No DNA Hand", multiplier: 0 },
  pair: { name: "Expression Pair", multiplier: 2 },
  eyeTrips: { name: "Eye Trips", multiplier: 4 },
  flush: { name: "Age/Gender Flush", multiplier: 7 },
  accessoryFullHouse: { name: "Accessory Full House", multiplier: 12 },
  perfectDna: { name: "Perfect DNA", multiplier: 20 }
} as const;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function countValues(values: Array<string | undefined>) {
  return values.reduce<Record<string, number>>((counts, value) => {
    const key = value ?? "Unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function hasCount(counts: Record<string, number>, target: number) {
  return Object.values(counts).some((count) => count >= target);
}

function matchingValue(counts: Record<string, number>, target: number) {
  return Object.entries(counts).find(([, count]) => count >= target)?.[0] ?? "Unknown";
}

function allSame(values: Array<string | undefined>) {
  const known = values.map((value) => value ?? "Unknown");
  return known.every((value) => value === known[0]);
}

function evaluateHand(cards: Normie[]): PokerHand {
  const expressions = cards.map((card) => card.traits.Expression);
  const eyes = cards.map((card) => card.traits.Eyes);
  const accessories = cards.map((card) => card.traits.Accessory);
  const facialFeatures = cards.map((card) => card.traits["Facial Feature"]);
  const genders = cards.map((card) => card.traits.Gender);
  const ages = cards.map((card) => card.traits.Age);
  const expressionCounts = countValues(expressions);
  const eyeCounts = countValues(eyes);
  const accessoryCounts = countValues(accessories);
  const facialFeatureCounts = countValues(facialFeatures);
  const eyePerfect = hasCount(eyeCounts, 4);
  const accessoryPerfect = hasCount(accessoryCounts, 4);
  const facialFeaturePerfect = hasCount(facialFeatureCounts, 4);
  const accessoryTriple = hasCount(accessoryCounts, 3);
  const eyeTriple = hasCount(eyeCounts, 3);
  const expressionPair = hasCount(expressionCounts, 2);
  const genderFlush = allSame(genders);
  const ageFlush = allSame(ages);

  if (eyePerfect || accessoryPerfect || facialFeaturePerfect) {
    return {
      ...handRanks.perfectDna,
      summary: `Four or more cards match ${
        eyePerfect
          ? `Eyes ${matchingValue(eyeCounts, 4)}`
          : accessoryPerfect
          ? `Accessory ${matchingValue(accessoryCounts, 4)}`
          : `Facial Feature ${matchingValue(facialFeatureCounts, 4)}`
      }.`
    };
  }

  if (expressionPair && accessoryTriple) {
    return {
      ...handRanks.accessoryFullHouse,
      summary: `Expression pair plus Accessory triple. Expressions: ${expressions.join(" / ")}. Accessories: ${accessories.join(" / ")}.`
    };
  }

  if (genderFlush || ageFlush) {
    return {
      ...handRanks.flush,
      summary: `All cards share ${genderFlush ? `Gender ${genders[0] ?? "Unknown"}` : `Age ${ages[0] ?? "Unknown"}`}.`
    };
  }

  if (eyeTriple) {
    return {
      ...handRanks.eyeTrips,
      summary: `Three or more cards share Eyes ${matchingValue(eyeCounts, 3)}. Eyes: ${eyes.join(" / ")}.`
    };
  }

  if (expressionPair) {
    return {
      ...handRanks.pair,
      summary: `Two or more cards share an Expression. Expressions: ${expressions.join(" / ")}.`
    };
  }

  return {
    ...handRanks.none,
    summary: `No scoring DNA combination. Expressions: ${expressions.join(" / ")}.`
  };
}

export function PokerGame() {
  const [mode, setMode] = useState<PokerMode>("solo");
  const [bet, setBet] = useState(100);
  const [cards, setCards] = useState<Array<Normie | null>>(Array.from({ length: 5 }, () => null));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("Deal five API Normies and score trait combinations.");
  const [roundResult, setRoundResult] = useState("Ready for a DNA Poker hand.");
  const wager = useChipStore((state) => state.wager);
  const win = useChipStore((state) => state.win);
  const lose = useChipStore((state) => state.lose);
  const notify = useArcadeStore((state) => state.notify);
  const hasCards = cards.some(Boolean);

  async function deal() {
    if (!wager(bet)) {
      notify({ kind: "loss", title: "Not enough chips", body: "Lower the DNA Poker bet." });
      return;
    }

    setLoading(true);
    setCards(Array.from({ length: 5 }, () => null));
    setResult("Shuffling on-chain DNA traits...");
    setRoundResult("Dealing five Normies...");
    playTone(340, 0.12, "sawtooth");

    const hand = await NormieAPIService.getRandomNormies(5);

    for (let index = 0; index < hand.length; index += 1) {
      await wait(220);
      setCards((current) => current.map((card, cardIndex) => (cardIndex === index ? hand[index] : card)));
      playTone(420 + index * 42, 0.08, "triangle");
    }

    const evaluated = evaluateHand(hand);

    if (evaluated.multiplier > 0) {
      const payout = bet * evaluated.multiplier;
      win(payout);
      setResult(`${evaluated.name}. Paid ${payout} chips.`);
      setRoundResult(`WIN - ${evaluated.name} (${evaluated.multiplier}x). ${evaluated.summary}`);
      playTone(720, 0.22, "triangle");
    } else {
      lose();
      setResult("No scoring DNA hand.");
      setRoundResult(`LOSE - ${evaluated.summary}`);
      playTone(180, 0.2, "square");
    }

    setLoading(false);
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-4">
      <div className="shrink-0 text-center">
        <h2 className="font-display text-lg uppercase tracking-[0.24em] text-paper">Normie DNA Poker</h2>
        <p className="terminal-hash mx-auto mt-3 max-w-4xl truncate text-xs text-pixel/70">{result}</p>
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
            {value === "solo" ? "Solo Deal" : "PvP Table"}
          </button>
        ))}
      </div>

      {mode === "pvp" ? <PokerPvP /> : (
        <>
      <div className="mt-8 flex shrink-0 flex-wrap items-center justify-center gap-2">
        <div className="border border-paper/35 bg-black/70 px-3 py-2 text-xs uppercase tracking-widest text-paper/70">
          Pair 2x
        </div>
        <div className="border border-paper/35 bg-black/70 px-3 py-2 text-xs uppercase tracking-widest text-paper/70">
          Eye Trips 4x
        </div>
        <div className="border border-paper/35 bg-black/70 px-3 py-2 text-xs uppercase tracking-widest text-paper/70">
          Age/Gender Flush 7x
        </div>
        <div className="border border-paper/35 bg-black/70 px-3 py-2 text-xs uppercase tracking-widest text-paper/70">
          Accessory Full House 12x
        </div>
        <div className="border border-paper/60 bg-paper/10 px-3 py-2 text-xs uppercase tracking-widest text-paper shadow-neon">
          Perfect DNA 20x
        </div>
        <BetControls bet={bet} setBet={setBet} />
      </div>

      <div className="mt-6 grid shrink-0 grid-cols-1 justify-center gap-3 overflow-hidden sm:grid-cols-5">
        {cards.map((card, index) => (
          <PokerCard key={card ? card.id : `poker-slot-${index}`} normie={card} index={index} loading={loading && !card} />
        ))}
      </div>

      <div className="mt-5 flex shrink-0 justify-center">
        <button
          onClick={deal}
          disabled={loading}
          className="inline-flex min-w-36 items-center justify-center gap-2 border border-paper/70 bg-paper/10 px-5 py-3 text-xs uppercase tracking-widest text-paper shadow-neon transition hover:bg-paper/15 disabled:opacity-50"
        >
          {hasCards ? <RotateCcw size={16} /> : <Dices size={16} />}
          {hasCards ? "Redeal" : "Deal"}
        </button>
      </div>

      <div className="mx-auto mt-4 w-full max-w-5xl shrink-0 border-t border-paper/20 pt-3 text-center">
        <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Round Result</div>
        <div className="truncate text-sm text-paper">{roundResult}</div>
      </div>
        </>
      )}
    </div>
  );
}

function PokerPvP() {
  const [ante, setAnte] = useState(100);
  const [roomCode, setRoomCode] = useState(() => {
    if (typeof window === "undefined") return createPokerRoomCode();
    const urlRoom = normalizePokerRoomCode(new URLSearchParams(window.location.search).get("pokerRoom") ?? "");
    if (urlRoom) return urlRoom;
    const stored = window.sessionStorage.getItem(POKER_RECONNECT_KEY);
    if (!stored) return createPokerRoomCode();
    try {
      const parsed = JSON.parse(stored) as { roomCode?: string };
      return normalizePokerRoomCode(parsed.roomCode ?? "") || createPokerRoomCode();
    } catch {
      return createPokerRoomCode();
    }
  });
  const [joinCode, setJoinCode] = useState("");
  const [roomMode, setRoomMode] = useState<PokerRoomMode>(() => {
    if (typeof window === "undefined") return "create";
    return normalizePokerRoomCode(new URLSearchParams(window.location.search).get("pokerRoom") ?? "") ? "join" : "create";
  });
  const { connected, connect, clearError, disconnect, error, nextHand, playerId, state, submitAction, toggleReady } = usePokerPvp(`poker-${roomCode.toLowerCase()}`);
  const { ready, authenticated, getAccessToken, login } = usePrivy();
  const username = useAccountStore((store) => store.username);
  const displayName = useAccountStore((store) => store.displayName);
  const isNormieHolder = useAccountStore((store) => store.isNormieHolder);
  const selectedNormieId = useAccountStore((store) => store.selectedNormieId);
  const selectedNormieImage = useAccountStore((store) => store.selectedNormieImage);
  const notify = useArcadeStore((store) => store.notify);
  const setBalance = useChipStore((store) => store.setBalance);
  const you = state.players.find((player) => player.id === playerId);
  const privateHand = state.privateHand ?? [];
  const streetLabel = state.street ? state.street.toUpperCase() : "WAITING";
  const readyCount = state.players.filter((player) => player.connected && player.ready).length;
  const connectedCount = state.players.filter((player) => player.connected).length;
  const streetCommitted = you?.streetCommitted ?? 0;
  const serverBalance = you?.serverBalance ?? 0;
  const callAmount = Math.max(0, state.currentBet - streetCommitted);
  const minRaiseTo = state.currentBet + state.minRaise;
  const maxRaiseTo = streetCommitted + serverBalance;
  const isYourTurn = connected && state.phase === "betting" && state.turnPlayerId === playerId;
  const reconnectAttempted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || reconnectAttempted.current || connected || !ready || !authenticated) return;
    const stored = window.sessionStorage.getItem(POKER_RECONNECT_KEY);
    if (!stored) return;

    reconnectAttempted.current = true;
    try {
      const parsed = JSON.parse(stored) as { roomCode?: string; ante?: number; roomMode?: PokerRoomMode };
      const storedRoom = normalizePokerRoomCode(parsed.roomCode ?? "");
      if (!storedRoom) return;

      setRoomCode(storedRoom);
      setJoinCode(storedRoom);
      setRoomMode(parsed.roomMode ?? "join");
      if (typeof parsed.ante === "number") {
        setAnte(parsed.ante);
      }

      getAccessToken().then((token) => {
        if (!token) return;
        connect({
          privyToken: token,
          ante: typeof parsed.ante === "number" ? parsed.ante : ante,
          name: displayName || username,
          isNormieHolder,
          selectedNormieId: selectedNormieId ?? null,
          avatarUrl: selectedNormieImage ?? null
        });
        notify({ kind: "info", title: "Poker Reconnected", body: `Rejoining room ${storedRoom}.` });
      });
    } catch {
      window.sessionStorage.removeItem(POKER_RECONNECT_KEY);
    }
  }, [ante, authenticated, connect, connected, displayName, getAccessToken, isNormieHolder, notify, ready, selectedNormieId, selectedNormieImage, username]);

  useEffect(() => {
    if (error?.toLowerCase().includes("full")) {
      window.sessionStorage.removeItem(POKER_RECONNECT_KEY);
    }
  }, [error]);

  function inviteUrl() {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("pokerRoom", roomCode);
    return url.toString();
  }

  function createRoom() {
    if (connected) return;
    clearError();
    const nextCode = createPokerRoomCode();
    setRoomMode("create");
    setRoomCode(nextCode);
    setJoinCode(nextCode);
  }

  function useJoinCode() {
    if (connected) return;
    clearError();
    const nextCode = normalizePokerRoomCode(joinCode);
    if (!nextCode) return;
    setRoomMode("join");
    setRoomCode(nextCode);
  }

  async function joinTable() {
    if (!authenticated) {
      notify({ kind: "info", title: "Login Required", body: "Connect your account before joining the PvP poker table." });
      login();
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      notify({ kind: "loss", title: "Poker rejected", body: "Could not read your Privy session token." });
      return;
    }

    connect({
      privyToken: token,
      ante,
      name: displayName || username,
      isNormieHolder,
      selectedNormieId: selectedNormieId ?? null,
      avatarUrl: selectedNormieImage ?? null
    });

    window.sessionStorage.setItem(
      POKER_RECONNECT_KEY,
      JSON.stringify({
        roomCode,
        roomMode,
        ante
      })
    );
  }

  function leaveTable() {
    window.sessionStorage.removeItem(POKER_RECONNECT_KEY);
    disconnect();
  }

  useEffect(() => {
    if (typeof you?.serverBalance === "number") {
      setBalance(you.serverBalance);
    }
  }, [setBalance, you?.serverBalance]);

  async function copyInvite() {
    await navigator.clipboard?.writeText(inviteUrl());
    notify({ kind: "info", title: "Poker Invite Copied", body: `Room ${roomCode} link copied.` });
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-6xl">
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={createRoom}
          disabled={connected}
          className={`min-w-32 border px-4 py-2 text-xs uppercase tracking-widest transition disabled:opacity-50 ${
            roomMode === "create" ? "border-paper bg-paper/15 text-paper shadow-neon" : "border-paper/30 bg-black/70 text-paper/60"
          }`}
        >
          Create Room
        </button>
        <button
          onClick={() => {
            clearError();
            setRoomMode("join");
          }}
          disabled={connected}
          className={`min-w-32 border px-4 py-2 text-xs uppercase tracking-widest transition disabled:opacity-50 ${
            roomMode === "join" ? "border-paper bg-paper/15 text-paper shadow-neon" : "border-paper/30 bg-black/70 text-paper/60"
          }`}
        >
          Join Room
        </button>
      </div>

      <div className="mx-auto mt-3 grid max-w-4xl gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="pixel-card flex min-w-0 items-center gap-3 px-3 py-2">
          <span className="terminal-hash shrink-0 text-[10px] uppercase tracking-[0.22em] text-pixel/60">Room</span>
          {roomMode === "join" && !connected ? (
            <input
              value={joinCode}
              onChange={(event) => {
                clearError();
                setJoinCode(normalizePokerRoomCode(event.target.value));
              }}
              placeholder="ENTER CODE"
              className="min-w-0 flex-1 bg-transparent text-center font-display text-sm uppercase tracking-[0.22em] text-paper outline-none placeholder:text-paper/25"
            />
          ) : (
            <div className="min-w-0 flex-1 truncate text-center font-display text-sm uppercase tracking-[0.22em] text-paper/85">{roomCode}</div>
          )}
        </div>
        {roomMode === "join" && !connected ? (
          <button
            onClick={useJoinCode}
            disabled={!joinCode}
            className="inline-flex items-center justify-center gap-2 border border-paper/40 bg-black/70 px-4 py-2 text-xs uppercase tracking-widest text-paper/75 transition hover:border-paper hover:text-paper disabled:opacity-40"
          >
            Use Code
          </button>
        ) : (
          <button
            onClick={createRoom}
            disabled={connected}
            className="inline-flex items-center justify-center gap-2 border border-paper/40 bg-black/70 px-4 py-2 text-xs uppercase tracking-widest text-paper/75 transition hover:border-paper hover:text-paper disabled:opacity-40"
          >
            <Users size={15} /> New Room
          </button>
        )}
        <button
          onClick={copyInvite}
          className="inline-flex items-center justify-center gap-2 border border-paper/40 bg-black/70 px-4 py-2 text-xs uppercase tracking-widest text-paper/75 transition hover:border-paper hover:text-paper"
        >
          <Copy size={15} /> Copy Invite
        </button>
      </div>

      <div className="mx-auto mt-4 flex max-w-4xl items-center justify-center border border-paper/25 bg-black/45 px-4 py-2 text-center">
        <span className={`terminal-hash text-[10px] uppercase tracking-[0.22em] ${error ? "text-magenta" : "text-pixel/60"}`}>
          {error ??
            you?.accountError ??
            `${state.message} ${
              state.phase === "dealt" || state.phase === "betting" ? `Hand ${state.handId ?? "active"}.` : `${readyCount}/${Math.max(connectedCount, 2)} ready.`
            }`}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <div className="pixel-card px-4 py-2 text-sm text-paper">Pot {state.pot} chips</div>
        {state.phase === "betting" ? <div className="pixel-card px-4 py-2 text-sm text-paper">{streetLabel} bet {state.currentBet}</div> : null}
        {typeof you?.serverBalance === "number" ? <div className="pixel-card px-4 py-2 text-sm text-paper">Server chips {you.serverBalance}</div> : null}
        <BetControls bet={ante} setBet={setAnte} disabled={connected} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-5">
        {Array.from({ length: state.maxPlayers }, (_, seat) => {
          const player = state.players.find((item) => item.seat === seat);
          return <PokerSeat key={seat} seat={seat} player={player} isYou={player?.id === playerId} />;
        })}
      </div>

      {state.phase === "dealt" || state.phase === "betting" || state.phase === "showdown" ? (
        <div className="mx-auto mt-6 w-full max-w-5xl border border-paper/35 bg-black/65 p-4">
          <div className="text-center">
            <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Community Board</div>
            <div className="mt-1 text-sm text-paper">
              {state.communityCards.length ? `${state.communityCards.length} shared Normies revealed.` : "Preflop. Shared Normies are still hidden."}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }, (_, index) => (
              <PrivatePokerCard key={`${state.handId ?? "board"}-board-${index}`} normieId={state.communityCards[index]} index={index} label={`Board ${index + 1}`} />
            ))}
          </div>
        </div>
      ) : null}

      {state.phase === "dealt" || state.phase === "betting" ? (
        <div className="mx-auto mt-6 w-full max-w-5xl border border-paper/35 bg-black/65 p-4">
          <div className="text-center">
            <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Private Hole Normies</div>
            <div className="mt-1 text-sm text-paper">
              {privateHand.length ? "Only your client receives these two private Normie IDs." : "Waiting for your private hand packet..."}
            </div>
          </div>
          <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-3">
            {Array.from({ length: 2 }, (_, index) => (
              <PrivatePokerCard key={`${state.handId ?? "hand"}-${index}`} normieId={privateHand[index]} index={index} />
            ))}
          </div>
        </div>
      ) : null}

      {state.phase === "betting" ? (
        <PokerBettingControls
          availableChips={serverBalance}
          callAmount={callAmount}
          currentBet={state.currentBet}
          disabled={!isYourTurn}
          isYourTurn={isYourTurn}
          maxRaiseTo={maxRaiseTo}
          minRaise={state.minRaise}
          minRaiseTo={minRaiseTo}
          onAction={submitAction}
        />
      ) : null}

      {state.phase === "showdown" && state.showdown ? (
        <PokerShowdownPanel showdown={state.showdown} playerId={playerId} onNextHand={nextHand} />
      ) : null}

      <PokerHandHistory history={state.history} playerId={playerId} />

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {!connected ? (
          <button
            onClick={joinTable}
            className="inline-flex min-w-36 items-center justify-center gap-2 border border-paper/70 bg-paper/10 px-5 py-3 text-xs uppercase tracking-widest text-paper shadow-neon transition hover:bg-paper/15"
          >
            <Search size={16} /> Join Table
          </button>
        ) : (
          <>
            <button
              onClick={toggleReady}
              disabled={state.phase === "dealt" || state.phase === "betting" || state.phase === "showdown"}
              className={`inline-flex min-w-36 items-center justify-center gap-2 border px-5 py-3 text-xs uppercase tracking-widest transition ${
                you?.ready ? "border-mint bg-mint/10 text-mint" : "border-paper/70 bg-paper/10 text-paper shadow-neon hover:bg-paper/15"
              } disabled:opacity-50`}
            >
              <CheckCircle2 size={16} />{" "}
              {state.phase === "showdown"
                ? "Showdown"
                : state.phase === "betting"
                ? "Betting"
                : state.phase === "dealt"
                ? "Hand Dealt"
                : you?.ready
                ? "Ready"
                : "Set Ready"}
            </button>
            <button
              onClick={leaveTable}
              className="inline-flex min-w-32 items-center justify-center gap-2 border border-paper/40 bg-black/70 px-5 py-3 text-xs uppercase tracking-widest text-paper/70 transition hover:border-paper hover:text-paper"
            >
              <LogOut size={16} /> Leave
            </button>
          </>
        )}
      </div>

      <div className="mx-auto mt-5 w-full max-w-4xl border-t border-paper/20 pt-3 text-center">
        <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Poker PvP</div>
        <div className="text-sm text-paper">
          {state.phase === "showdown"
            ? "Showdown complete. Ante/pot settlement is handled server-side."
            : state.phase === "betting"
            ? isYourTurn
              ? `${streetLabel}. Your turn. ${callAmount > 0 ? `Call ${callAmount}, raise, or fold.` : "Check, raise, or fold."}`
              : `${streetLabel}. Waiting for the active player to act.`
            : state.phase === "dealt"
            ? "Private hands are dealt."
            : "Set at least two players ready. Each player antes before the server deals."}
        </div>
      </div>
    </div>
  );
}

function PokerBettingControls({
  availableChips,
  callAmount,
  currentBet,
  disabled,
  isYourTurn,
  maxRaiseTo,
  minRaise,
  minRaiseTo,
  onAction
}: {
  availableChips: number;
  callAmount: number;
  currentBet: number;
  disabled: boolean;
  isYourTurn: boolean;
  maxRaiseTo: number;
  minRaise: number;
  minRaiseTo: number;
  onAction: (action: "check" | "call" | "raise" | "fold", raiseTo?: number) => void;
}) {
  const [raiseInput, setRaiseInput] = useState(minRaiseTo);
  const canCall = !disabled && callAmount > 0 && availableChips >= callAmount;
  const canRaise = !disabled && maxRaiseTo >= minRaiseTo;
  const normalizedRaise = Math.min(maxRaiseTo, Math.max(minRaiseTo, Math.round(raiseInput || minRaiseTo)));

  useEffect(() => {
    setRaiseInput(minRaiseTo);
  }, [minRaiseTo, maxRaiseTo]);

  return (
    <div className="mx-auto mt-5 w-full max-w-5xl border border-paper/35 bg-black/65 p-4 text-center">
      <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Betting Action</div>
      <div className="mt-1 text-sm text-paper/70">
        {isYourTurn ? "Your action is live." : "Waiting for the current seat."} Current bet {currentBet}. Minimum raise {minRaise}. Available {availableChips}.
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => onAction("check")}
          disabled={disabled || callAmount > 0}
          className="min-w-28 border border-paper/45 bg-paper/10 px-4 py-3 text-xs uppercase tracking-widest text-paper transition hover:bg-paper/15 disabled:opacity-35"
        >
          Check
        </button>
        <button
          onClick={() => onAction("call")}
          disabled={!canCall}
          className="min-w-28 border border-paper/45 bg-paper/10 px-4 py-3 text-xs uppercase tracking-widest text-paper transition hover:bg-paper/15 disabled:opacity-35"
        >
          Call {callAmount}
        </button>
        <div className="flex min-w-64 items-stretch border border-paper/35 bg-black/70">
          <input
            type="number"
            min={minRaiseTo}
            max={Math.max(minRaiseTo, maxRaiseTo)}
            step={minRaise}
            value={raiseInput}
            onChange={(event) => setRaiseInput(Number(event.target.value))}
            disabled={!canRaise}
            className="min-w-0 flex-1 bg-transparent px-3 text-center text-sm text-paper outline-none disabled:opacity-35"
          />
          <button
            onClick={() => setRaiseInput(maxRaiseTo)}
            disabled={!canRaise}
            className="border-l border-paper/25 px-3 text-[10px] uppercase tracking-widest text-paper/65 transition hover:text-paper disabled:opacity-35"
          >
            Max
          </button>
        </div>
        <button
          onClick={() => onAction("raise", normalizedRaise)}
          disabled={!canRaise}
          className="min-w-32 border border-mint/60 bg-mint/10 px-4 py-3 text-xs uppercase tracking-widest text-mint transition hover:bg-mint/15 disabled:opacity-35"
        >
          Raise to {normalizedRaise}
        </button>
        <button
          onClick={() => onAction("fold")}
          disabled={disabled}
          className="min-w-28 border border-magenta/60 bg-magenta/10 px-4 py-3 text-xs uppercase tracking-widest text-magenta transition hover:bg-magenta/15 disabled:opacity-35"
        >
          Fold
        </button>
      </div>
    </div>
  );
}

function PokerSeat({
  seat,
  player,
  isYou
}: {
  seat: number;
  player?: {
    id: string;
    name: string;
    connected: boolean;
    ready: boolean;
    handCount: number;
    committed?: number;
    streetCommitted?: number;
    folded?: boolean;
    acted?: boolean;
    isNormieHolder?: boolean;
    selectedNormieId?: number | null;
    avatarUrl?: string | null;
  };
  isYou: boolean;
}) {
  return (
    <div className={`border bg-black/70 p-3 text-center ${isYou ? "border-mint shadow-neon" : "border-paper/35"}`}>
      <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Seat {seat + 1}</div>
      <div className="mx-auto mt-3 grid h-20 w-20 place-items-center border border-paper/35 bg-paper">
        {player?.avatarUrl ? (
          <Image src={player.avatarUrl} alt={`${player.name} avatar`} width={76} height={76} className="h-[76px] w-[76px] object-contain" unoptimized />
        ) : (
          <Dices size={28} className="text-black/60" />
        )}
      </div>
      <div className="mt-3 truncate text-sm text-paper">{player?.name ?? "Open Seat"}</div>
      <div className={`mt-2 text-[10px] uppercase tracking-widest ${player?.ready ? "text-mint" : "text-paper/45"}`}>
        {player
          ? player.folded
            ? "Folded"
            : player.handCount
            ? `${player.handCount} Hole Cards`
            : player.ready
            ? "Ready"
            : player.connected
            ? "Seated"
            : "Disconnected"
          : "Waiting"}
      </div>
      {player && typeof player.committed === "number" && player.committed > 0 ? (
        <div className="mt-2 text-[10px] uppercase tracking-widest text-paper/45">In pot {player.committed}</div>
      ) : null}
      {player && typeof player.streetCommitted === "number" && player.streetCommitted > 0 ? (
        <div className="mt-1 text-[10px] uppercase tracking-widest text-paper/35">Street {player.streetCommitted}</div>
      ) : null}
      {player?.acted && !player.folded ? <div className="mt-1 text-[10px] uppercase tracking-widest text-mint/70">Acted</div> : null}
      {player?.isNormieHolder ? (
        <div className="mx-auto mt-2 w-fit border border-mint/50 px-1.5 py-0.5 text-[9px] text-mint">
          0xN{player.selectedNormieId !== null && player.selectedNormieId !== undefined ? ` #${player.selectedNormieId}` : ""}
        </div>
      ) : null}
    </div>
  );
}

function PokerShowdownPanel({
  showdown,
  playerId,
  onNextHand
}: {
  showdown: {
    winners: string[];
    pot: number;
    payoutEach: number;
    hands: Array<{
      playerId: string;
      playerName: string;
      cards: number[];
      bestCards: number[];
      handName: string;
      score: number;
      summary: string;
    }>;
  };
  playerId: string | null;
  onNextHand: () => void;
}) {
  return (
    <div className="mx-auto mt-6 w-full max-w-5xl border border-paper/50 bg-black/75 p-4 shadow-neon">
      <div className="text-center">
        <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Showdown</div>
        <h3 className="mt-1 font-display text-lg uppercase tracking-[0.22em] text-paper">
          {showdown.winners.includes(playerId ?? "") ? "You Won The Pot" : "Pot Resolved"}
        </h3>
        <div className="mt-2 text-sm text-paper/70">
          Pot {showdown.pot} chips. {showdown.winners.length > 1 ? `Split payout ${showdown.payoutEach} each.` : `Winner payout ${showdown.payoutEach}.`}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {showdown.hands.map((hand) => {
          const winner = showdown.winners.includes(hand.playerId);
          return (
            <div key={hand.playerId} className={`border bg-black/70 p-3 ${winner ? "border-mint shadow-neon" : "border-paper/30"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm text-paper">{hand.playerName}</div>
                <div className={`text-[10px] uppercase tracking-widest ${winner ? "text-mint" : "text-paper/45"}`}>
                  {winner ? "Winner" : "Settled"}
                </div>
              </div>
              <div className="terminal-hash mt-3 text-[9px] uppercase tracking-widest text-pixel/55">Best 5</div>
              <div className="mt-2 grid grid-cols-5 gap-1">
                {hand.bestCards.map((id) => (
                  <div key={id} className="grid aspect-square place-items-center border border-paper/25 bg-paper">
                    <CenteredNormieImage src={`https://api.normies.art/normie/${id}/image.png`} alt={`Showdown Normie #${id}`} className="h-full w-full" />
                  </div>
                ))}
              </div>
              <div className="mt-2 truncate text-[10px] text-paper/40">All available: {hand.cards.map((id) => `#${id}`).join(" / ")}</div>
              <div className="mt-3 font-display text-sm text-paper">{hand.handName}</div>
              <div className="mt-1 text-xs text-paper/55">{hand.summary}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex justify-center">
        <button
          onClick={onNextHand}
          className="inline-flex min-w-36 items-center justify-center gap-2 border border-paper/70 bg-paper/10 px-5 py-3 text-xs uppercase tracking-widest text-paper shadow-neon transition hover:bg-paper/15"
        >
          <RotateCcw size={16} /> Next Hand
        </button>
      </div>
    </div>
  );
}

function PokerHandHistory({
  history,
  playerId
}: {
  history: Array<{
    round: number;
    handId: string;
    winners: string[];
    winnerNames: string[];
    pot: number;
    payoutEach: number;
    summary: string;
  }>;
  playerId: string | null;
}) {
  if (!history.length) return null;

  return (
    <div className="mx-auto mt-5 w-full max-w-5xl border border-paper/25 bg-black/55 p-3">
      <div className="terminal-hash text-center text-[10px] uppercase tracking-[0.22em] text-pixel/60">Hand History</div>
      <div className="mt-3 grid gap-2">
        {history.map((entry) => {
          const youWon = entry.winners.includes(playerId ?? "");
          return (
            <div
              key={entry.handId}
              className="grid gap-2 border border-paper/20 bg-black/60 px-3 py-2 text-xs text-paper/70 md:grid-cols-[5rem_1fr_8rem_6rem]"
            >
              <span className="terminal-hash uppercase tracking-widest text-pixel/55">Round {entry.round}</span>
              <span className="truncate">{entry.summary}</span>
              <span className="text-paper/55">Pot {entry.pot}</span>
              <span className={`text-right uppercase ${youWon ? "text-mint" : "text-paper/45"}`}>{youWon ? "You won" : "Settled"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrivatePokerCard({ normieId, index, label }: { normieId?: number; index: number; label?: string }) {
  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ delay: index * 0.06 }}
      className="border border-paper/45 bg-black/80 p-2 text-center"
    >
      <div className="mx-auto grid h-28 w-28 place-items-center overflow-hidden border border-paper/40 bg-paper">
        {normieId !== undefined ? (
          <CenteredNormieImage
            src={`https://api.normies.art/normie/${normieId}/image.png`}
            alt={`Private poker Normie #${normieId}`}
            className="h-full w-full"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-black/85">
            <div className="h-16 w-16 animate-pulse border border-paper/20 bg-paper/10" />
          </div>
        )}
      </div>
      <div className="mt-2 text-xs text-paper/60">#{normieId ?? "----"}</div>
      <div className="terminal-hash mt-1 text-[9px] uppercase tracking-widest text-pixel/55">{label ?? `Private Slot ${index + 1}`}</div>
    </motion.div>
  );
}

function PokerCard({ normie, index, loading }: { normie: Normie | null; index: number; loading: boolean }) {
  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ delay: index * 0.06 }}
      className="pixel-card mx-auto grid h-72 w-full max-w-52 grid-rows-[8.5rem_1rem_1.25rem_4rem] overflow-hidden p-2 text-center"
    >
      <div className="relative mx-auto grid h-32 w-32 place-items-center overflow-hidden border border-paper/40 bg-paper">
        {normie ? (
          <CenteredNormieImage src={normie.image} alt={`Poker Normie ${normie.id}`} className="h-full w-full" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-black/80">
            <motion.div
              animate={{ opacity: loading ? [0.25, 0.8, 0.25] : 0.25 }}
              transition={{ duration: 0.8, repeat: loading ? Infinity : 0 }}
              className="h-20 w-20 border border-paper/20 bg-paper/10"
            />
          </div>
        )}
      </div>
      <div className="text-xs leading-4 text-white/60">#{normie ? normie.id : "----"}</div>
      <div className="truncate text-sm leading-5 text-paper">{normie ? normie.traits.Expression ?? "Unknown" : loading ? "Dealing" : "Waiting"}</div>
      <div className="space-y-1 text-[10px] leading-3 text-white/45">
        <div>Type: {normie?.traits.Type ?? "----"}</div>
        <div>Gender: {normie?.traits.Gender ?? "----"}</div>
        <div>Age: {normie?.traits.Age ?? "----"}</div>
      </div>
    </motion.div>
  );
}

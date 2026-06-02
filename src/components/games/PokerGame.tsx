"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Copy, Dices, LogOut, RotateCcw, Search, Users } from "lucide-react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { CenteredNormieImage } from "@/components/normies/CenteredNormieImage";
import { createPokerRoomCode, normalizePokerRoomCode } from "@/lib/pokerPvp";
import { usePokerPvp } from "@/hooks/usePokerPvp";
import { NormieAPIService } from "@/services/NormieAPIService";
import { useAccountStore } from "@/stores/accountStore";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useChipStore } from "@/stores/chipStore";
import type { NormieTraits } from "@/types/normie";

type PokerHand = {
  name: string;
  multiplier: number;
  summary: string;
};
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

function countValues(values: Array<string | undefined>) {
  return values.reduce<Record<string, number>>((counts, value) => {
    if (!value || value === "Unknown") return counts;
    const key = value;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function hasCount(counts: Record<string, number>, target: number) {
  return Object.values(counts).some((count) => count >= target);
}

function matchingValue(counts: Record<string, number>, target: number) {
  return Object.entries(counts).find(([, count]) => count >= target)?.[0] ?? "";
}

function allSame(values: Array<string | undefined>) {
  return values.length > 0 && values.every((value) => Boolean(value) && value !== "Unknown" && value === values[0]);
}

function evaluateTraitsCombo(traits: NormieTraits[], minFlushCards = 5): PokerHand {
  const expressions = traits.map((trait) => trait.Expression);
  const eyes = traits.map((trait) => trait.Eyes);
  const accessories = traits.map((trait) => trait.Accessory);
  const facialFeatures = traits.map((trait) => trait["Facial Feature"]);
  const genders = traits.map((trait) => trait.Gender);
  const ages = traits.map((trait) => trait.Age);
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
  const genderFlush = traits.length >= minFlushCards && allSame(genders);
  const ageFlush = traits.length >= minFlushCards && allSame(ages);

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

function fiveCardCombos<T>(items: T[]) {
  const combos: T[][] = [];
  for (let a = 0; a < items.length - 4; a += 1) {
    for (let b = a + 1; b < items.length - 3; b += 1) {
      for (let c = b + 1; c < items.length - 2; c += 1) {
        for (let d = c + 1; d < items.length - 1; d += 1) {
          for (let e = d + 1; e < items.length; e += 1) {
            combos.push([items[a], items[b], items[c], items[d], items[e]]);
          }
        }
      }
    }
  }
  return combos;
}

function evaluateBestVisibleCombo(traits: NormieTraits[]) {
  if (traits.length <= 5) return evaluateTraitsCombo(traits, 5);

  return fiveCardCombos(traits)
    .map((combo) => evaluateTraitsCombo(combo, 5))
    .reduce((best, current) => (current.multiplier > best.multiplier ? current : best));
}

export function PokerGame() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col px-4">
      <div className="shrink-0 text-center">
        <h2 className="font-display text-lg uppercase tracking-[0.24em] text-paper">Normie DNA Poker</h2>
        <p className="terminal-hash mx-auto mt-3 max-w-4xl truncate text-xs text-pixel/70">
          0xNORMIE // Texas-style PvP table with private Normies and shared board cards.
        </p>
      </div>
      <PokerPvP />
    </div>
  );
}

function PokerPvP() {
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
  const [roomNotice, setRoomNotice] = useState<{ kind: "info" | "error"; message: string } | null>(null);
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
  const tableStack = you?.stack ?? 0;
  const callAmount = Math.max(0, state.currentBet - streetCommitted);
  const minRaiseTo = state.currentBet + state.minRaise;
  const activeRaiseCaps = state.players
    .filter((player) => player.connected && !player.folded)
    .map((player) => (player.streetCommitted ?? 0) + (player.stack ?? 0));
  const maxRaiseTo = Math.min(streetCommitted + tableStack, activeRaiseCaps.length ? Math.min(...activeRaiseCaps) : streetCommitted + tableStack);
  const isYourTurn = connected && state.phase === "betting" && state.turnPlayerId === playerId;
  const reconnectAttempted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || reconnectAttempted.current || connected || !ready || !authenticated) return;
    const stored = window.sessionStorage.getItem(POKER_RECONNECT_KEY);
    if (!stored) return;

    reconnectAttempted.current = true;
    try {
      const parsed = JSON.parse(stored) as { roomCode?: string; roomMode?: PokerRoomMode };
      const storedRoom = normalizePokerRoomCode(parsed.roomCode ?? "");
      if (!storedRoom) return;

      setRoomCode(storedRoom);
      setJoinCode(storedRoom);
      setRoomMode(parsed.roomMode ?? "join");

      getAccessToken().then((token) => {
        if (!token) return;
        connect({
          privyToken: token,
          ante: state.buyIn,
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
  }, [authenticated, connect, connected, displayName, getAccessToken, isNormieHolder, notify, ready, selectedNormieId, selectedNormieImage, state.buyIn, username]);

  useEffect(() => {
    if (error?.toLowerCase().includes("full")) {
      window.sessionStorage.removeItem(POKER_RECONNECT_KEY);
    }
    if (error) {
      setRoomNotice({ kind: "error", message: error });
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
    setRoomNotice({ kind: "info", message: `Room ${nextCode} created. Join the table when ready.` });
  }

  function useJoinCode() {
    if (connected) return;
    clearError();
    const nextCode = normalizePokerRoomCode(joinCode);
    if (!nextCode) {
      setRoomNotice({ kind: "error", message: "Enter a valid room code before using it." });
      return;
    }
    setRoomMode("join");
    setRoomCode(nextCode);
    setRoomNotice({ kind: "info", message: `Room ${nextCode} selected. Join the table when ready.` });
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
      ante: state.buyIn,
      name: displayName || username,
      isNormieHolder,
      selectedNormieId: selectedNormieId ?? null,
      avatarUrl: selectedNormieImage ?? null
    });

    window.sessionStorage.setItem(
      POKER_RECONNECT_KEY,
      JSON.stringify({
        roomCode,
        roomMode
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
                setRoomNotice(null);
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

      {roomNotice ? (
        <div
          className={`mx-auto mt-3 max-w-4xl border px-4 py-2 text-center text-xs ${
            roomNotice.kind === "error" ? "border-magenta/50 bg-magenta/10 text-magenta" : "border-mint/40 bg-mint/10 text-mint"
          }`}
        >
          {roomNotice.message}
        </div>
      ) : null}

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
        <div className="pixel-card px-4 py-2 text-sm text-paper">Buy-in {state.buyIn}</div>
        <div className="pixel-card px-4 py-2 text-sm text-paper">Ante {state.ante}</div>
        {state.phase === "betting" ? <div className="pixel-card px-4 py-2 text-sm text-paper">{streetLabel} bet {state.currentBet}</div> : null}
        {typeof you?.stack === "number" ? <div className="pixel-card px-4 py-2 text-sm text-paper">Table stack {you.stack}</div> : null}
        {typeof you?.serverBalance === "number" ? <div className="pixel-card px-4 py-2 text-sm text-paper">Account chips {you.serverBalance}</div> : null}
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

      {state.phase === "dealt" || state.phase === "betting" ? (
        <LivePokerHints privateIds={privateHand} communityIds={state.communityCards} />
      ) : null}

      {state.phase === "betting" ? (
        <PokerBettingControls
          availableChips={tableStack}
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
            : `Set at least two players ready. Each player reserves ${state.buyIn} and antes ${state.ante} from their table stack.`}
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
    buyIn?: number;
    stack?: number;
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
      {player && typeof player.stack === "number" ? (
        <div className="mt-2 text-[10px] uppercase tracking-widest text-mint/70">Stack {player.stack}</div>
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
      cardTraits: Array<{
        id: number;
        traits: NormieTraits;
      }>;
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
                {hand.bestCards.map((id) => {
                  const traits = hand.cardTraits.find((card) => card.id === id)?.traits;
                  return <ShowdownTraitCard key={id} id={id} traits={traits} />;
                })}
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

function LivePokerHints({ privateIds, communityIds }: { privateIds: number[]; communityIds: number[] }) {
  const [traitsById, setTraitsById] = useState<Record<number, NormieTraits>>({});
  const visibleKey = [...privateIds, ...communityIds].filter((id) => typeof id === "number").join("-");
  const visibleIds = useMemo(() => (visibleKey ? visibleKey.split("-").map((id) => Number(id)) : []), [visibleKey]);

  useEffect(() => {
    let active = true;
    if (!visibleIds.length) {
      setTraitsById({});
      return;
    }

    Promise.all(
      visibleIds.map(async (id) => ({
        id,
        traits: await NormieAPIService.fetchNormieTraits(id)
      }))
    ).then((entries) => {
      if (!active) return;
      setTraitsById(
        entries.reduce<Record<number, NormieTraits>>((next, entry) => {
          next[entry.id] = entry.traits;
          return next;
        }, {})
      );
    });

    return () => {
      active = false;
    };
  }, [visibleIds, visibleKey]);

  const yourTraits = visibleIds.map((id) => traitsById[id]).filter((traits): traits is NormieTraits => Boolean(traits));
  const boardTraits = communityIds.map((id) => traitsById[id]).filter((traits): traits is NormieTraits => Boolean(traits));
  const yourBest = yourTraits.length ? evaluateBestVisibleCombo(yourTraits) : null;
  const boardBest = boardTraits.length ? evaluateBestVisibleCombo(boardTraits) : null;

  return (
    <div className="mx-auto mt-5 grid w-full max-w-5xl gap-3 md:grid-cols-2">
      <div className="border border-mint/35 bg-mint/10 p-4 text-center">
        <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-mint/75">Your Current Best</div>
        <div className="mt-2 font-display text-base uppercase tracking-[0.16em] text-paper">{yourBest?.name ?? "Loading Traits"}</div>
        <div className="mt-1 text-xs text-paper/60">{yourBest?.summary ?? "Reading visible Normie traits..."}</div>
      </div>
      <div className="border border-paper/30 bg-black/60 p-4 text-center">
        <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Board Combo</div>
        <div className="mt-2 font-display text-base uppercase tracking-[0.16em] text-paper">
          {communityIds.length ? boardBest?.name ?? "Loading Traits" : "No Board Yet"}
        </div>
        <div className="mt-1 text-xs text-paper/60">
          {communityIds.length ? boardBest?.summary ?? "Reading shared Normie traits..." : "Community cards reveal after preflop betting."}
        </div>
      </div>
    </div>
  );
}

function TraitSummary({ traits }: { traits?: NormieTraits | null }) {
  const rows = [
    ["Exp", traits?.Expression],
    ["Eyes", traits?.Eyes],
    ["Acc", traits?.Accessory],
    ["Age", traits?.Age],
    ["Gen", traits?.Gender]
  ];

  return (
    <div className="mt-2 space-y-0.5 text-left text-[9px] leading-3 text-paper/45">
      {rows.map(([label, value]) => (
        <div key={label} className="truncate">
          <span className="text-paper/65">{label}:</span> {value ?? "--"}
        </div>
      ))}
    </div>
  );
}

function ShowdownTraitCard({ id, traits }: { id: number; traits?: NormieTraits }) {
  return (
    <div className="min-w-0 border border-paper/20 bg-black/55 p-1 text-center">
      <div className="grid aspect-square place-items-center border border-paper/25 bg-paper">
        <CenteredNormieImage src={`https://api.normies.art/normie/${id}/image.png`} alt={`Showdown Normie #${id}`} className="h-full w-full" />
      </div>
      <div className="mt-1 text-[10px] text-paper/60">#{id}</div>
      <TraitSummary traits={traits} />
    </div>
  );
}

function PrivatePokerCard({ normieId, index, label }: { normieId?: number; index: number; label?: string }) {
  const [traits, setTraits] = useState<NormieTraits | null>(null);

  useEffect(() => {
    let active = true;
    setTraits(null);
    if (normieId === undefined) return;

    NormieAPIService.fetchNormieTraits(normieId).then((nextTraits) => {
      if (active) setTraits(nextTraits);
    });

    return () => {
      active = false;
    };
  }, [normieId]);

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
      {normieId !== undefined ? <TraitSummary traits={traits} /> : null}
    </motion.div>
  );
}

"use client";

import { CheckCircle2, Copy, Dices, Info, LogOut, RotateCcw, Search, Trophy, Users } from "lucide-react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
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

type TraitCard = {
  id: number;
  traits: NormieTraits;
};

function countTraitCards(cards: TraitCard[], traitName: keyof NormieTraits | "Facial Feature") {
  return cards.reduce<Record<string, number[]>>((counts, card) => {
    const value = card.traits[traitName];
    if (!value || value === "Unknown") return counts;
    const key = String(value);
    counts[key] = [...(counts[key] ?? []), card.id];
    return counts;
  }, {});
}

function idsForTraitCount(cards: TraitCard[], traitName: keyof NormieTraits | "Facial Feature", target: number) {
  const counts = countTraitCards(cards, traitName);
  return Object.values(counts).find((ids) => ids.length >= target) ?? [];
}

function allShareTrait(cards: TraitCard[], traitName: keyof NormieTraits) {
  if (!cards.length) return false;
  const firstValue = cards[0].traits[traitName];
  return Boolean(firstValue) && firstValue !== "Unknown" && cards.every((card) => card.traits[traitName] === firstValue);
}

function findComboHighlightIds(cards: TraitCard[]) {
  if (cards.length < 2) return new Set<number>();

  const combos = cards.length > 5 ? fiveCardCombos(cards) : [cards];
  const ranked = combos
    .map((combo) => ({ combo, hand: evaluateTraitsCombo(combo.map((card) => card.traits), 5) }))
    .sort((left, right) => right.hand.multiplier - left.hand.multiplier);
  const best = ranked[0];
  if (!best || best.hand.multiplier <= 0) return new Set<number>();

  const combo = best.combo;
  const eyePerfect = idsForTraitCount(combo, "Eyes", 4);
  if (eyePerfect.length) return new Set(eyePerfect);

  const accessoryPerfect = idsForTraitCount(combo, "Accessory", 4);
  if (accessoryPerfect.length) return new Set(accessoryPerfect);

  const facialFeaturePerfect = idsForTraitCount(combo, "Facial Feature", 4);
  if (facialFeaturePerfect.length) return new Set(facialFeaturePerfect);

  const expressionPair = idsForTraitCount(combo, "Expression", 2);
  const accessoryTriple = idsForTraitCount(combo, "Accessory", 3);
  if (expressionPair.length && accessoryTriple.length) return new Set([...expressionPair, ...accessoryTriple]);

  if (allShareTrait(combo, "Gender") || allShareTrait(combo, "Age")) return new Set(combo.map((card) => card.id));

  const eyeTrips = idsForTraitCount(combo, "Eyes", 3);
  if (eyeTrips.length) return new Set(eyeTrips);

  if (expressionPair.length) return new Set(expressionPair);

  return new Set<number>();
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
  const { connected, connect, clearError, disconnect, error, errorMeta, nextHand, playerId, state, submitAction, toggleReady } = usePokerPvp(`poker-${roomCode.toLowerCase()}`);
  const { ready, authenticated, getAccessToken, login } = usePrivy();
  const username = useAccountStore((store) => store.username);
  const displayName = useAccountStore((store) => store.displayName);
  const isNormieHolder = useAccountStore((store) => store.isNormieHolder);
  const selectedNormieId = useAccountStore((store) => store.selectedNormieId);
  const selectedNormieImage = useAccountStore((store) => store.selectedNormieImage);
  const notify = useArcadeStore((store) => store.notify);
  const setBalance = useChipStore((store) => store.setBalance);
  const you = state.players.find((player) => player.id === playerId);
  const privateHand = useMemo(() => state.privateHand ?? [], [state.privateHand]);
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
  const pokerErrorMessage =
    error === "Insufficient chips"
      ? `Insufficient chips for poker buy-in. Required ${errorMeta?.buyIn ?? state.buyIn}, server balance ${errorMeta?.balance ?? "unknown"}.`
      : error;
  const reconnectAttempted = useRef(false);
  const visiblePokerCardIds = useMemo(() => [...privateHand, ...state.communityCards].filter((id) => typeof id === "number"), [privateHand, state.communityCards]);
  const visibleTraitsById = useNormieTraitsById(visiblePokerCardIds);
  const highlightedCardIds = useMemo(() => {
    const cards = visiblePokerCardIds
      .map((id) => ({ id, traits: visibleTraitsById[id] }))
      .filter((card): card is TraitCard => Boolean(card.traits));
    return findComboHighlightIds(cards);
  }, [visiblePokerCardIds, visibleTraitsById]);

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
      setRoomNotice({ kind: "error", message: pokerErrorMessage ?? error });
    }
  }, [error, pokerErrorMessage]);

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
        <span className={`terminal-hash text-[10px] uppercase tracking-[0.22em] ${you?.accountError ? "text-magenta" : "text-pixel/60"}`}>
          {you?.accountError ??
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

      <PokerTable
        communityIds={state.communityCards}
        currentBet={state.currentBet}
        highlightedCardIds={highlightedCardIds}
        maxPlayers={state.maxPlayers}
        phase={state.phase}
        playerId={playerId}
        players={state.players}
        pot={state.pot}
        privateIds={privateHand}
        showdownWinnerIds={state.showdown?.winners ?? []}
        streetLabel={streetLabel}
        turnPlayerId={state.turnPlayerId}
      />
      <PokerSeatLegend />

      {state.phase === "dealt" || state.phase === "betting" ? (
        <LivePokerHints privateIds={privateHand} communityIds={state.communityCards} traitsById={visibleTraitsById} />
      ) : null}

      <PokerActionTimeline actionLog={state.actionLog} />

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

type PokerSeatPlayer = {
  id: string;
  name: string;
  seat: number;
  connected: boolean;
  ready: boolean;
  handCount: number;
  buyIn?: number;
  stack?: number;
  committed?: number;
  streetCommitted?: number;
  folded?: boolean;
  acted?: boolean;
  lastAction?: string;
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
};

type ChipFlight = {
  id: string;
  amount: number;
  seat: number;
};

function PokerTable({
  communityIds,
  currentBet,
  highlightedCardIds,
  maxPlayers,
  phase,
  playerId,
  players,
  pot,
  privateIds,
  showdownWinnerIds,
  streetLabel,
  turnPlayerId
}: {
  communityIds: number[];
  currentBet: number;
  highlightedCardIds: Set<number>;
  maxPlayers: number;
  phase: string;
  playerId: string | null;
  players: PokerSeatPlayer[];
  pot: number;
  privateIds: number[];
  showdownWinnerIds: string[];
  streetLabel: string;
  turnPlayerId?: string;
}) {
  const seatPositions = [
    "left-1/2 top-3 -translate-x-1/2",
    "right-4 top-16",
    "right-10 bottom-10",
    "left-10 bottom-10",
    "left-4 top-16"
  ];
  const [chipFlights, setChipFlights] = useState<ChipFlight[]>([]);
  const [revealedCommunityIds, setRevealedCommunityIds] = useState<Set<number>>(new Set());
  const previousCommittedRef = useRef<Record<string, number> | null>(null);
  const previousCommunityRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const nextCommitted = players.reduce<Record<string, number>>((next, player) => {
      next[player.id] = player.committed ?? 0;
      return next;
    }, {});

    const previousCommitted = previousCommittedRef.current;
    if (!previousCommitted) {
      previousCommittedRef.current = nextCommitted;
      return;
    }

    const newFlights = players
      .map((player) => {
        const previous = previousCommitted[player.id] ?? 0;
        const current = player.committed ?? 0;
        const amount = current - previous;
        if (amount <= 0) return null;
        return {
          id: `${player.id}-${current}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          amount,
          seat: player.seat
        };
      })
      .filter((flight): flight is ChipFlight => Boolean(flight));

    previousCommittedRef.current = nextCommitted;

    if (!newFlights.length) return;

    setChipFlights((current) => [...current, ...newFlights]);
    const cleanup = window.setTimeout(() => {
      setChipFlights((current) => current.filter((flight) => !newFlights.some((newFlight) => newFlight.id === flight.id)));
    }, 950);

    return () => window.clearTimeout(cleanup);
  }, [players, pot]);

  useEffect(() => {
    const nextIds = new Set(communityIds.filter((id) => typeof id === "number"));
    const previousIds = previousCommunityRef.current;
    const newIds = [...nextIds].filter((id) => !previousIds.has(id));
    previousCommunityRef.current = nextIds;

    if (!newIds.length) {
      if (!nextIds.size) setRevealedCommunityIds(new Set());
      return;
    }

    setRevealedCommunityIds((current) => new Set([...current, ...newIds]));
    const cleanup = window.setTimeout(() => {
      setRevealedCommunityIds((current) => {
        const next = new Set(current);
        newIds.forEach((id) => next.delete(id));
        return next;
      });
    }, 720);

    return () => window.clearTimeout(cleanup);
  }, [communityIds]);

  return (
    <div className="mx-auto mt-6 w-full max-w-6xl">
      <div className="relative min-h-[34rem] overflow-visible border border-paper/45 bg-black/70 p-4 shadow-neon">
        <div className="absolute inset-x-10 top-20 bottom-20 rounded-[50%] border-[10px] border-paper/20 bg-[radial-gradient(ellipse_at_center,rgba(18,96,70,0.9),rgba(4,18,14,0.96)_62%,rgba(0,0,0,0.96))] shadow-[inset_0_0_60px_rgba(255,255,255,0.08)]" />
        <div className="absolute inset-x-24 top-32 bottom-32 rounded-[50%] border border-mint/20" />
        <ChipFlightLayer flights={chipFlights} />

        <div className="absolute left-1/2 top-1/2 z-10 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-6 text-center">
          <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-mint/65">
            {streetLabel} | Pot {pot} | Bet {currentBet}
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <TableNormieCard
                key={`${index}-${communityIds[index] ?? "hidden"}`}
                highlighted={communityIds[index] !== undefined && highlightedCardIds.has(communityIds[index])}
                revealed={communityIds[index] !== undefined && revealedCommunityIds.has(communityIds[index])}
                normieId={communityIds[index]}
                label={`B${index + 1}`}
                compact
              />
            ))}
          </div>
        </div>

        {Array.from({ length: maxPlayers }, (_, seat) => {
          const player = players.find((item) => item.seat === seat);
          return (
            <div key={seat} className={`absolute z-20 ${seatPositions[seat] ?? seatPositions[0]}`}>
              <PokerTableSeat
                isTurn={Boolean(player && turnPlayerId === player.id)}
                isYou={player?.id === playerId}
                phase={phase}
                player={player}
                highlightedCardIds={highlightedCardIds}
                privateIds={player?.id === playerId ? privateIds : []}
                seat={seat}
                showdownWinnerIds={showdownWinnerIds}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PokerSeatLegend() {
  const states = [
    { label: "Ready", className: "border-mint/55 bg-mint/10 text-mint" },
    { label: "Acting", className: "border-mint bg-black text-mint shadow-neon" },
    { label: "Folded", className: "border-magenta/50 bg-magenta/10 text-magenta" },
    { label: "Offline", className: "border-paper/20 bg-black/55 text-paper/40" },
    { label: "Winner", className: "border-mint bg-mint/15 text-mint shadow-neon" }
  ];

  return (
    <div className="mx-auto mt-3 flex max-w-5xl flex-wrap justify-center gap-2">
      {states.map((state) => (
        <div key={state.label} className={`border px-2 py-1 text-[10px] uppercase tracking-widest ${state.className}`}>
          {state.label}
        </div>
      ))}
    </div>
  );
}

function ChipFlightLayer({ flights }: { flights: ChipFlight[] }) {
  const seatOrigins: Array<{ left: string; top: string }> = [
    { left: "50%", top: "18%" },
    { left: "82%", top: "34%" },
    { left: "78%", top: "76%" },
    { left: "22%", top: "76%" },
    { left: "18%", top: "34%" }
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {flights.map((flight, index) => {
        const origin = seatOrigins[flight.seat] ?? seatOrigins[0];
        const style =
          {
            "--chip-from-left": origin.left,
            "--chip-from-top": origin.top,
            animationDelay: `${index * 45}ms`
          } as CSSProperties;

        return (
          <div key={flight.id} className="chip-flight" style={style}>
            <div className="grid h-8 w-8 place-items-center rounded-full border-2 border-paper bg-black text-[8px] font-semibold text-mint shadow-neon">
              +{flight.amount}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PokerTableSeat({
  highlightedCardIds,
  isTurn,
  isYou,
  phase,
  player,
  privateIds,
  seat,
  showdownWinnerIds
}: {
  highlightedCardIds: Set<number>;
  isTurn: boolean;
  isYou: boolean;
  phase: string;
  player?: PokerSeatPlayer;
  privateIds: number[];
  seat: number;
  showdownWinnerIds: string[];
}) {
  const activeHand = phase === "dealt" || phase === "betting" || phase === "showdown";
  const isWinner = Boolean(player && showdownWinnerIds.includes(player.id));
  const seatState = !player
    ? "open"
    : isWinner
    ? "winner"
    : player.folded
    ? "folded"
    : !player.connected
    ? "offline"
    : isTurn
    ? "acting"
    : player.ready
    ? "ready"
    : player.lastAction
    ? "acted"
    : "seated";
  const status =
    seatState === "open"
      ? "OPEN"
      : seatState === "winner"
      ? "WINNER"
      : seatState === "folded"
      ? "FOLD"
      : seatState === "offline"
      ? "OFFLINE"
      : seatState === "acting"
      ? "ACTING"
      : seatState === "ready"
      ? "READY"
      : player?.lastAction ?? "SEATED";
  const seatStyles = {
    open: "border-paper/20 bg-black/45 opacity-75",
    seated: isYou ? "border-cyan bg-black/85" : "border-paper/35 bg-black/85",
    ready: "border-mint/55 bg-mint/10 shadow-neon",
    acting: "animate-pulse border-mint bg-black/90 shadow-[0_0_34px_rgba(34,255,225,0.45)] ring-2 ring-mint/45",
    folded: "border-magenta/45 bg-magenta/10 opacity-70",
    offline: "border-paper/20 bg-black/65 grayscale opacity-55",
    acted: "border-paper/40 bg-black/85",
    winner: "border-mint bg-mint/15 shadow-neon ring-2 ring-mint/55"
  }[seatState];
  const badgeStyles = {
    open: "border-paper/25 text-paper/45",
    seated: "border-paper/30 text-paper/55",
    ready: "border-mint/50 text-mint",
    acting: "border-mint bg-mint/10 text-mint shadow-neon",
    folded: "border-magenta/50 text-magenta",
    offline: "border-paper/20 text-paper/35",
    acted: "border-cyan/40 text-cyan",
    winner: "border-mint bg-mint/15 text-mint shadow-neon"
  }[seatState];

  return (
    <div
      className={`relative w-56 border p-3 text-center transition ${seatStyles}`}
    >
      {isTurn || isWinner ? (
        <>
          <div className="pointer-events-none absolute -inset-2 border border-mint/30 shadow-neon" />
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 border border-mint bg-black px-3 py-1 font-display text-[10px] uppercase tracking-[0.22em] text-mint shadow-neon">
            {isWinner ? "Winner" : "Acting"}
          </div>
        </>
      ) : null}
      <div className="flex items-center gap-2">
        <div className="grid h-12 w-12 shrink-0 place-items-center border border-paper/35 bg-paper">
          {player?.avatarUrl ? (
            <Image src={player.avatarUrl} alt={`${player.name} avatar`} width={44} height={44} className="h-11 w-11 object-contain" unoptimized />
          ) : (
            <Dices size={20} className="text-black/60" />
          )}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm text-paper">{player?.name ?? `Seat ${seat + 1}`}</div>
          <div className="text-[10px] uppercase tracking-widest text-paper/45">Stack {player?.stack ?? "--"}</div>
        </div>
        <div className={`border px-2 py-1 text-[9px] uppercase tracking-widest ${badgeStyles}`}>
          {status}
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {activeHand ? (
          Array.from({ length: 2 }, (_, index) =>
            isYou ? (
              <TableNormieCard
                key={index}
                highlighted={privateIds[index] !== undefined && highlightedCardIds.has(privateIds[index])}
                normieId={privateIds[index]}
                label={`H${index + 1}`}
                compact
              />
            ) : (
              <CardBack key={index} />
            )
          )
        ) : (
          <div className="terminal-hash py-4 text-[10px] uppercase tracking-widest text-paper/35">{player ? "Waiting" : "Open Seat"}</div>
        )}
      </div>

      <div className="mt-2 flex justify-center gap-2 text-[10px] uppercase tracking-widest text-paper/45">
        <span>Pot {player?.committed ?? 0}</span>
        <span>Street {player?.streetCommitted ?? 0}</span>
      </div>
    </div>
  );
}

function CardBack() {
  return (
    <div className="grid h-20 w-14 place-items-center border border-paper/35 bg-black text-[9px] uppercase tracking-widest text-paper/35">
      0xN
    </div>
  );
}

function TableNormieCard({
  normieId,
  label,
  compact,
  highlighted,
  revealed
}: {
  normieId?: number;
  label: string;
  compact?: boolean;
  highlighted?: boolean;
  revealed?: boolean;
}) {
  return (
    <NormieTraitPopover normieId={normieId}>
      <div
        className={`border border-paper/35 bg-black/80 p-1 text-center ${compact ? "w-16" : "w-24"} ${
          normieId !== undefined ? "cursor-pointer hover:border-mint" : ""
        } ${highlighted ? "animate-pulse border-mint shadow-neon ring-1 ring-mint/45" : ""} ${revealed ? "community-card-reveal" : ""}`}
      >
        <div className={`grid place-items-center border border-paper/25 bg-paper ${compact ? "h-16 w-14" : "h-24 w-20"}`}>
          {normieId !== undefined ? (
            <CenteredNormieImage src={`https://api.normies.art/normie/${normieId}/image.png`} alt={`Normie poker card #${normieId}`} className="h-full w-full" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-black/90 text-[9px] text-paper/35">0xN</div>
          )}
        </div>
        <div className="mt-1 flex items-center justify-center gap-1 truncate text-[9px] text-paper/50">
          {normieId !== undefined ? `#${normieId}` : label}
          {normieId !== undefined ? <Info size={9} className="text-mint/75" /> : null}
        </div>
      </div>
    </NormieTraitPopover>
  );
}

function NormieTraitPopover({
  children,
  initialTraits,
  normieId
}: {
  children: ReactNode;
  initialTraits?: NormieTraits | null;
  normieId?: number;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [traits, setTraits] = useState<NormieTraits | null>(initialTraits ?? null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialTraits) {
      setTraits(initialTraits);
    }
  }, [initialTraits]);

  useEffect(() => {
    if ((!open && !hovered) || normieId === undefined || traits || error) return;

    let active = true;
    setLoading(true);
    setError("");
    NormieAPIService.fetchNormieTraits(normieId)
      .then((nextTraits) => {
        if (active) setTraits(nextTraits);
      })
      .catch(() => {
        if (active) setError("Unable to read traits.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [error, hovered, normieId, open, traits]);

  if (normieId === undefined) return <>{children}</>;

  return (
    <button
      type="button"
      className="relative inline-block appearance-none border-0 bg-transparent p-0 text-left text-inherit"
      aria-expanded={open}
      aria-label={`Inspect Normie #${normieId} traits`}
      onClick={() => setOpen((value) => !value)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {hovered && !open ? (
        <div className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 w-44 -translate-x-1/2 border border-paper/35 bg-black/90 p-2 text-center shadow-neon">
          {loading ? (
            <div className="text-[10px] text-paper/55">Reading traits...</div>
          ) : error ? (
            <div className="text-[10px] text-magenta">{error}</div>
          ) : (
            <TraitPreview traits={traits} />
          )}
        </div>
      ) : null}
      {open ? (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 border border-mint/55 bg-black/95 p-3 shadow-neon">
          <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-mint">Normie #{normieId}</div>
          {loading ? <div className="mt-2 text-xs text-paper/55">Reading traits...</div> : null}
          {error ? <div className="mt-2 text-xs text-magenta">{error}</div> : null}
          {!loading && !error ? <TraitSummary traits={traits} /> : null}
        </div>
      ) : null}
    </button>
  );
}

function TraitPreview({ traits }: { traits?: NormieTraits | null }) {
  const preview = [
    traits?.Expression ? `Exp ${traits.Expression}` : "",
    traits?.Eyes ? `Eyes ${traits.Eyes}` : "",
    traits?.Accessory ? `Acc ${traits.Accessory}` : ""
  ].filter(Boolean);

  return (
    <div className="space-y-1 text-[10px] leading-3 text-paper/70">
      <div className="terminal-hash uppercase tracking-[0.18em] text-mint/70">Trait Peek</div>
      <div>{preview.length ? preview.join(" // ") : "No traits loaded."}</div>
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
  const youWon = showdown.winners.includes(playerId ?? "");
  const winnerNames = showdown.hands
    .filter((hand) => showdown.winners.includes(hand.playerId))
    .map((hand) => hand.playerName)
    .join(" / ");

  return (
    <div className={`mx-auto mt-6 w-full max-w-5xl border bg-black/80 p-4 ${youWon ? "border-mint shadow-neon" : "border-paper/50 shadow-neon"}`}>
      <div className={`relative overflow-hidden border p-4 text-center ${youWon ? "border-mint/70 bg-mint/10" : "border-paper/30 bg-paper/5"}`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,255,225,0.18),transparent_58%)]" />
        <div className="relative">
          <div className="mx-auto grid h-10 w-10 place-items-center border border-mint/60 bg-black text-mint shadow-neon">
            <Trophy size={20} />
          </div>
          <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Showdown</div>
          <h3 className={`mt-2 font-display text-xl uppercase tracking-[0.24em] ${youWon ? "text-mint" : "text-paper"}`}>
            {youWon ? "You Won The Pot" : "Pot Resolved"}
          </h3>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-paper/55">Winner: {winnerNames || "Pending"}</div>
          <div className="mt-2 text-sm text-paper/70">
            Pot {showdown.pot} chips. {showdown.winners.length > 1 ? `Split payout ${showdown.payoutEach} each.` : `Winner payout ${showdown.payoutEach}.`}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {showdown.hands.map((hand) => {
          const winner = showdown.winners.includes(hand.playerId);
          return (
            <div
              key={hand.playerId}
              className={`relative border bg-black/70 p-3 transition ${
                winner ? "scale-[1.01] border-mint shadow-neon ring-1 ring-mint/45" : "border-paper/20 opacity-55 grayscale"
              }`}
            >
              {winner ? (
                <div className="pointer-events-none absolute -inset-1 border border-mint/30 shadow-neon" />
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm text-paper">{hand.playerName}</div>
                <div className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest ${winner ? "text-mint" : "text-paper/45"}`}>
                  {winner ? <Trophy size={12} /> : null}
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

function PokerActionTimeline({
  actionLog
}: {
  actionLog: Array<{
    id: string;
    round: number;
    street?: string;
    playerName?: string;
    action: string;
    amount?: number;
    message: string;
  }>;
}) {
  if (!actionLog.length) return null;

  return (
    <div className="mx-auto mt-5 w-full max-w-5xl border border-paper/25 bg-black/55 p-3">
      <div className="terminal-hash text-center text-[10px] uppercase tracking-[0.22em] text-pixel/60">Action Timeline</div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {actionLog.slice(0, 8).map((entry) => (
          <div key={entry.id} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 border border-paper/15 bg-black/65 px-3 py-2 text-xs">
            <span className="terminal-hash truncate uppercase tracking-widest text-pixel/50">{entry.street ?? `R${entry.round}`}</span>
            <span className="truncate text-paper/75">{entry.message}</span>
            <span
              className={`border px-2 py-1 text-[9px] uppercase tracking-widest ${
                entry.action === "FOLD"
                  ? "border-magenta/50 text-magenta"
                  : entry.action === "RAISE" || entry.action === "SHOWDOWN"
                  ? "border-mint/50 text-mint"
                  : "border-paper/25 text-paper/55"
              }`}
            >
              {entry.action}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function useNormieTraitsById(ids: number[]) {
  const [traitsById, setTraitsById] = useState<Record<number, NormieTraits>>({});
  const visibleKey = ids.filter((id) => typeof id === "number").join("-");
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

  return traitsById;
}

function LivePokerHints({ privateIds, communityIds, traitsById }: { privateIds: number[]; communityIds: number[]; traitsById: Record<number, NormieTraits> }) {
  const visibleIds = useMemo(() => [...privateIds, ...communityIds].filter((id) => typeof id === "number"), [privateIds, communityIds]);
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
    ["Type", traits?.Type],
    ["Exp", traits?.Expression],
    ["Eyes", traits?.Eyes],
    ["Acc", traits?.Accessory],
    ["Face", traits?.["Facial Feature"]],
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
    <NormieTraitPopover normieId={id} initialTraits={traits}>
      <div className="min-w-0 cursor-pointer border border-paper/20 bg-black/55 p-1 text-center hover:border-mint">
        <div className="grid aspect-square place-items-center border border-paper/25 bg-paper">
          <CenteredNormieImage src={`https://api.normies.art/normie/${id}/image.png`} alt={`Showdown Normie #${id}`} className="h-full w-full" />
        </div>
        <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-paper/60">
          #{id}
          <Info size={9} className="text-mint/75" />
        </div>
        <TraitSummary traits={traits} />
      </div>
    </NormieTraitPopover>
  );
}

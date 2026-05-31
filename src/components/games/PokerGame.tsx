"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Copy, Dices, LogOut, RotateCcw, Search, Users } from "lucide-react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
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

const handRanks = {
  none: { name: "No DNA Hand", multiplier: 0 },
  pair: { name: "Expression Pair", multiplier: 2 },
  threeType: { name: "Type Three Of A Kind", multiplier: 4 },
  flush: { name: "Trait Flush", multiplier: 7 },
  fullHouse: { name: "DNA Full House", multiplier: 12 }
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

function allSame(values: Array<string | undefined>) {
  const known = values.map((value) => value ?? "Unknown");
  return known.every((value) => value === known[0]);
}

function evaluateHand(cards: Normie[]): PokerHand {
  const expressions = cards.map((card) => card.traits.Expression);
  const types = cards.map((card) => card.traits.Type);
  const genders = cards.map((card) => card.traits.Gender);
  const ages = cards.map((card) => card.traits.Age);
  const expressionCounts = countValues(expressions);
  const typeCounts = countValues(types);
  const expressionTriple = hasCount(expressionCounts, 3);
  const typePair = hasCount(typeCounts, 2);
  const typeTriple = hasCount(typeCounts, 3);
  const expressionPair = hasCount(expressionCounts, 2);
  const genderFlush = allSame(genders);
  const ageFlush = allSame(ages);

  if (typePair && expressionTriple) {
    return {
      ...handRanks.fullHouse,
      summary: `Type pair plus Expression triple. Expressions: ${expressions.join(" / ")}.`
    };
  }

  if (genderFlush || ageFlush) {
    return {
      ...handRanks.flush,
      summary: `All cards share ${genderFlush ? `Gender ${genders[0] ?? "Unknown"}` : `Age ${ages[0] ?? "Unknown"}`}.`
    };
  }

  if (typeTriple) {
    return {
      ...handRanks.threeType,
      summary: `Three or more cards share a Type. Types: ${types.join(" / ")}.`
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
          Three Type 4x
        </div>
        <div className="border border-paper/35 bg-black/70 px-3 py-2 text-xs uppercase tracking-widest text-paper/70">
          Flush 7x
        </div>
        <div className="border border-paper/60 bg-paper/10 px-3 py-2 text-xs uppercase tracking-widest text-paper shadow-neon">
          Full House 12x
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
  const [roomCode, setRoomCode] = useState(() => createPokerRoomCode());
  const [joinCode, setJoinCode] = useState("");
  const [roomMode, setRoomMode] = useState<PokerRoomMode>("create");
  const { connected, connect, disconnect, error, playerId, state, toggleReady } = usePokerPvp(`poker-${roomCode.toLowerCase()}`);
  const { authenticated, login } = usePrivy();
  const holderProfile = useAccountStore((store) => ({
    username: store.username,
    displayName: store.displayName,
    isNormieHolder: store.isNormieHolder,
    selectedNormieId: store.selectedNormieId,
    selectedNormieImage: store.selectedNormieImage
  }));
  const notify = useArcadeStore((store) => store.notify);
  const you = state.players.find((player) => player.id === playerId);
  const readyCount = state.players.filter((player) => player.connected && player.ready).length;
  const connectedCount = state.players.filter((player) => player.connected).length;

  function inviteUrl() {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.set("pokerRoom", roomCode);
    return url.toString();
  }

  function createRoom() {
    if (connected) return;
    const nextCode = createPokerRoomCode();
    setRoomMode("create");
    setRoomCode(nextCode);
    setJoinCode(nextCode);
  }

  function useJoinCode() {
    if (connected) return;
    const nextCode = normalizePokerRoomCode(joinCode);
    if (!nextCode) return;
    setRoomMode("join");
    setRoomCode(nextCode);
  }

  function joinTable() {
    if (!authenticated) {
      notify({ kind: "info", title: "Login Required", body: "Connect your account before joining the PvP poker table." });
      login();
      return;
    }

    connect({
      name: holderProfile.displayName || holderProfile.username,
      isNormieHolder: holderProfile.isNormieHolder,
      selectedNormieId: holderProfile.selectedNormieId ?? null,
      avatarUrl: holderProfile.selectedNormieImage ?? null
    });
  }

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
          onClick={() => setRoomMode("join")}
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
              onChange={(event) => setJoinCode(normalizePokerRoomCode(event.target.value))}
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
          {error ?? `${state.message} ${readyCount}/${Math.max(connectedCount, 2)} ready.`}
        </span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-5">
        {Array.from({ length: state.maxPlayers }, (_, seat) => {
          const player = state.players.find((item) => item.seat === seat);
          return <PokerSeat key={seat} seat={seat} player={player} isYou={player?.id === playerId} />;
        })}
      </div>

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
              className={`inline-flex min-w-36 items-center justify-center gap-2 border px-5 py-3 text-xs uppercase tracking-widest transition ${
                you?.ready ? "border-mint bg-mint/10 text-mint" : "border-paper/70 bg-paper/10 text-paper shadow-neon hover:bg-paper/15"
              }`}
            >
              <CheckCircle2 size={16} /> {you?.ready ? "Ready" : "Set Ready"}
            </button>
            <button
              onClick={disconnect}
              className="inline-flex min-w-32 items-center justify-center gap-2 border border-paper/40 bg-black/70 px-5 py-3 text-xs uppercase tracking-widest text-paper/70 transition hover:border-paper hover:text-paper"
            >
              <LogOut size={16} /> Leave
            </button>
          </>
        )}
      </div>

      <div className="mx-auto mt-5 w-full max-w-4xl border-t border-paper/20 pt-3 text-center">
        <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Step 1 Foundation</div>
        <div className="text-sm text-paper">Rooms, seats, and ready states are active. Dealing/scoring comes next after verification.</div>
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
        {player ? (player.ready ? "Ready" : player.connected ? "Seated" : "Disconnected") : "Waiting"}
      </div>
      {player?.isNormieHolder ? (
        <div className="mx-auto mt-2 w-fit border border-mint/50 px-1.5 py-0.5 text-[9px] text-mint">
          0xN{player.selectedNormieId !== null && player.selectedNormieId !== undefined ? ` #${player.selectedNormieId}` : ""}
        </div>
      ) : null}
    </div>
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

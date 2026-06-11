"use client";

import { Copy, Dices, LogIn, RefreshCw, Swords, Users } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useMemo, useState } from "react";
import { NormieImage } from "@/components/normies/NormieImage";
import { createTcgRoomCode, normalizeTcgRoomCode, tcgCardPower } from "@/lib/tcgPvp";
import { useTcgPvp } from "@/hooks/useTcgPvp";
import { NormieAPIService } from "@/services/NormieAPIService";
import type { NormieTraits } from "@/types/normie";
import { useAccountStore } from "@/stores/accountStore";
import { useArcadeStore } from "@/stores/arcadeStore";

type RoomMode = "quick" | "create" | "join";

export function TcgClashGame() {
  const [roomCode, setRoomCode] = useState(() => {
    if (typeof window === "undefined") return "QUICKPLAY";
    const urlRoom = normalizeTcgRoomCode(new URLSearchParams(window.location.search).get("tcgRoom") ?? "");
    return urlRoom || "QUICKPLAY";
  });
  const [roomMode, setRoomMode] = useState<RoomMode>(() => (roomCode === "QUICKPLAY" ? "quick" : "join"));
  const [joinCode, setJoinCode] = useState(() => (roomCode === "QUICKPLAY" ? "" : roomCode));
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const { authenticated, getAccessToken, login, user } = usePrivy();
  const accountKey = user?.id ?? user?.wallet?.address ?? null;
  const username = useAccountStore((store) => store.username);
  const displayName = useAccountStore((store) => store.displayName);
  const isNormieHolder = useAccountStore((store) => store.isNormieHolder);
  const selectedNormieId = useAccountStore((store) => store.selectedNormieId);
  const selectedNormieImage = useAccountStore((store) => store.selectedNormieImage);
  const notify = useArcadeStore((store) => store.notify);
  const { connected, connect, disconnect, draftPick, error, playerId, playCard, rematch, state } = useTcgPvp(`tcg-${roomCode.toLowerCase()}`);
  const you = state.players.find((player) => player.id === playerId);
  const opponent = state.players.find((player) => player.id !== playerId);
  const playerSeat = you?.seat ?? 0;
  const yourLaneKey = playerSeat === 0 ? "playerA" : "playerB";
  const opponentLaneKey = playerSeat === 0 ? "playerB" : "playerA";
  const hand = useMemo(() => state.privateHand ?? [], [state.privateHand]);
  const drafted = useMemo(() => state.privateDrafted ?? [], [state.privateDrafted]);
  const draftPool = useMemo(() => state.draftPool ?? [], [state.draftPool]);
  const canPlay = connected && state.phase === "playing" && Boolean(you) && !you?.pendingPlay && state.players.length >= 2;
  const canDraft = connected && state.phase === "drafting" && state.draftTurnPlayerId === playerId;
  const visibleCardIds = useMemo(
    () => [...new Set([...hand, ...drafted, ...draftPool, ...state.lanes.flatMap((lane) => [...lane.playerA, ...lane.playerB])])],
    [draftPool, drafted, hand, state.lanes]
  );
  const traitsById = useNormieTraitsById(visibleCardIds);
  const burnedIds = useBurnedNormieIds(visibleCardIds);

  const title = useMemo(() => {
    if (!connected) return "Create or join a Circuit Clash room.";
    if (!opponent?.connected) return "Waiting for opponent.";
    if (state.phase === "drafting") return canDraft ? "Draft a Normie from the shared pool." : "Opponent is drafting.";
    if (state.phase === "finished") return state.winnerId ? (state.winnerId === playerId ? "Victory" : "Defeat") : "Draw";
    if (you?.pendingPlay) return "Card locked. Waiting for opponent.";
    return state.message;
  }, [canDraft, connected, opponent?.connected, playerId, state.message, state.phase, state.winnerId, you?.pendingPlay]);

  function selectRoomMode(mode: RoomMode) {
    if (connected) return;
    setRoomMode(mode);
    if (mode === "quick") {
      setRoomCode("QUICKPLAY");
      return;
    }
    if (mode === "create") {
      const next = createTcgRoomCode();
      setRoomCode(next);
      setJoinCode(next);
      return;
    }
    setRoomCode(normalizeTcgRoomCode(joinCode) || "QUICKPLAY");
  }

  async function joinMatch() {
    if (!authenticated) {
      notify({ kind: "info", title: "Login Required", body: "Connect your account before entering PvP." });
      login();
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      notify({ kind: "loss", title: "TCG rejected", body: "Could not read your Privy session token." });
      return;
    }

    connect({
      privyToken: token,
      accountKey,
      name: displayName || username,
      isNormieHolder,
      selectedNormieId: selectedNormieId ?? null,
      avatarUrl: selectedNormieImage ?? null
    });
  }

  async function copyInvite() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (roomCode === "QUICKPLAY") {
      url.searchParams.delete("tcgRoom");
    } else {
      url.searchParams.set("tcgRoom", roomCode);
    }
    await navigator.clipboard?.writeText(url.toString());
    notify({ kind: "info", title: "TCG Invite Copied", body: `Room ${roomCode} link copied.` });
  }

  function playSelected(lane: number) {
    if (!selectedCard || !canPlay) return;
    playCard(selectedCard, lane);
    setSelectedCard(null);
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 pb-4 pt-1">
      <header className="shrink-0 text-center">
        <h2 className="font-display text-lg uppercase tracking-[0.24em] text-paper">Normie Circuit Clash</h2>
        <p className="terminal-hash mx-auto mt-1 max-w-4xl truncate text-xs text-pixel/70">{title}</p>
      </header>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
        <aside className="game-panel p-4">
          <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">PvP Room</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["quick", "create", "join"] as const).map((mode) => (
              <button
                key={mode}
                disabled={connected}
                onClick={() => selectRoomMode(mode)}
                className={`border px-2 py-2 text-[10px] uppercase tracking-widest transition ${
                  roomMode === mode ? "border-paper bg-paper/15 text-paper shadow-neon" : "border-paper/25 bg-black/60 text-paper/55 hover:border-paper/70"
                } disabled:opacity-45`}
              >
                {mode === "quick" ? "Quick" : mode}
              </button>
            ))}
          </div>
          {roomMode === "join" && !connected ? (
            <input
              value={joinCode}
              onChange={(event) => {
                const next = normalizeTcgRoomCode(event.target.value);
                setJoinCode(next);
                setRoomCode(next || "QUICKPLAY");
              }}
              placeholder="ROOM CODE"
              className="mt-3 w-full border border-paper/25 bg-black/70 px-3 py-2 text-center text-sm uppercase tracking-widest text-paper outline-none focus:border-mint"
            />
          ) : (
            <div className="mt-3 border border-paper/25 bg-black/70 px-3 py-2 text-center font-display text-sm uppercase tracking-[0.22em] text-paper">
              {roomCode === "QUICKPLAY" ? "Quickplay" : roomCode}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            {!connected ? (
              <button onClick={joinMatch} className="inline-flex flex-1 items-center justify-center gap-2 border border-paper/70 bg-paper/10 px-4 py-2 text-xs uppercase tracking-widest text-paper shadow-neon transition hover:bg-paper/15">
                <LogIn size={15} /> Join
              </button>
            ) : (
              <button onClick={disconnect} className="inline-flex flex-1 items-center justify-center gap-2 border border-paper/40 bg-black/70 px-4 py-2 text-xs uppercase tracking-widest text-paper/70 transition hover:border-paper">
                Leave
              </button>
            )}
            <button onClick={copyInvite} className="grid h-10 w-10 place-items-center border border-paper/35 bg-black/70 text-paper/70 hover:text-paper">
              <Copy size={15} />
            </button>
          </div>
          {error ? <div className="mt-3 border border-magenta/50 bg-magenta/10 px-3 py-2 text-xs text-magenta">{error}</div> : null}

          <div className="mt-5 grid gap-2">
            <PlayerPlate label="You" name={you?.name} score={you?.score ?? 0} connected={connected} avatarUrl={you?.avatarUrl} />
            <PlayerPlate label="Opponent" name={opponent?.name} score={opponent?.score ?? 0} connected={Boolean(opponent?.connected)} avatarUrl={opponent?.avatarUrl} />
          </div>

          <div className="mt-5 border border-paper/15 bg-black/60 p-3">
            <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Rules</div>
            <p className="mt-2 text-sm leading-relaxed text-paper/65">
              Five turns. Play one Normie into one of three lanes. Same-lane cards compare power. Separate lanes both score.
            </p>
          </div>
        </aside>

        <main className="min-h-0">
          {state.phase === "drafting" ? (
            <DraftPanel
              canDraft={canDraft}
              drafted={drafted}
              draftPool={draftPool}
              draftTarget={state.draftTarget ?? 8}
              opponentDraftedCount={opponent?.draftedCount ?? 0}
              onDraft={draftPick}
              traitsById={traitsById}
              burnedIds={burnedIds}
            />
          ) : (
            <section className="grid gap-3 md:grid-cols-3">
              {state.lanes.map((lane, index) => (
                <LanePanel
                  key={index}
                  lane={index}
                  yourCards={lane[yourLaneKey]}
                  opponentCards={lane[opponentLaneKey]}
                  selectedCard={selectedCard}
                  canPlay={canPlay}
                  onPlay={() => playSelected(index)}
                />
              ))}
            </section>
          )}

          <section className="mt-4 game-panel p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">Hand</div>
                <div className="text-sm text-paper/60">{state.phase === "drafting" ? `Draft ${drafted.length}/${state.draftTarget ?? 8}.` : `Turn ${state.turn}/${state.maxTurns}. Select a card, then choose a lane.`}</div>
              </div>
              {state.phase === "finished" ? (
                <button onClick={rematch} className="inline-flex items-center gap-2 border border-paper/60 bg-paper/10 px-4 py-2 text-xs uppercase tracking-widest text-paper hover:bg-paper/15">
                  <RefreshCw size={15} /> Rematch
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {hand.map((cardId) => (
                <TcgCard key={cardId} cardId={cardId} traits={traitsById[cardId]} burned={burnedIds.has(cardId)} selected={selectedCard === cardId} disabled={!canPlay} onClick={() => setSelectedCard(cardId)} />
              ))}
              {!hand.length ? <div className="col-span-full border border-paper/15 bg-black/55 px-3 py-6 text-center text-sm text-paper/45">No cards in hand.</div> : null}
            </div>
          </section>

          {state.reveal ? (
            <section className="mt-4 border border-paper/25 bg-black/70 px-4 py-3 text-sm text-paper/75">
              <span className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Reveal</span>
              <div className="mt-1 text-center">{state.reveal.message}</div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <RevealEffects label="Player A" reveal={state.reveal.playerA} />
                <RevealEffects label="Player B" reveal={state.reveal.playerB} />
              </div>
            </section>
          ) : null}
        </main>
      </section>
    </div>
  );
}

function RevealEffects({ label, reveal }: { label: string; reveal?: { cardId: number; power: number; effects?: string[] } }) {
  if (!reveal) return null;
  return (
    <div className="border border-paper/15 bg-black/55 p-2">
      <div className="flex items-center justify-between gap-2 text-xs text-paper">
        <span>{label} #{reveal.cardId}</span>
        <span className="text-mint">Power {reveal.power}</span>
      </div>
      <div className="mt-1 space-y-1 text-[10px] leading-snug text-paper/50">
        {reveal.effects?.length ? reveal.effects.slice(0, 4).map((effect) => <div key={effect}>{effect}</div>) : <div>No trait bonus triggered.</div>}
      </div>
    </div>
  );
}

function PlayerPlate({ label, name, score, connected, avatarUrl }: { label: string; name?: string; score: number; connected: boolean; avatarUrl?: string | null }) {
  return (
    <div className="grid grid-cols-[2.25rem_1fr_2rem] items-center gap-2 border border-paper/20 bg-black/55 p-2">
      {avatarUrl ? <NormieImage src={avatarUrl} alt={`${name ?? label} avatar`} className="h-9 w-9 border border-paper/30 bg-paper object-contain" /> : <Users size={18} className="mx-auto text-paper/45" />}
      <div className="min-w-0">
        <div className="truncate text-xs uppercase tracking-[0.14em] text-paper">{name ?? label}</div>
        <div className="text-[10px] uppercase tracking-widest text-paper/40">{connected ? "Connected" : "Offline"}</div>
      </div>
      <div className="text-right font-display text-lg text-mint">{score}</div>
    </div>
  );
}

function DraftPanel({
  canDraft,
  drafted,
  draftPool,
  draftTarget,
  opponentDraftedCount,
  onDraft,
  traitsById,
  burnedIds
}: {
  canDraft: boolean;
  drafted: number[];
  draftPool: number[];
  draftTarget: number;
  opponentDraftedCount: number;
  onDraft: (cardId: number) => void;
  traitsById: Record<number, NormieTraits>;
  burnedIds: Set<number>;
}) {
  return (
    <section className="game-panel p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">Deck Draft</div>
          <div className="text-sm text-paper/60">Pick from the shared Normie pool. Both players draft {draftTarget} cards.</div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-xs uppercase tracking-widest text-paper/60">
          <div className="border border-paper/20 bg-black/60 px-3 py-2">You {drafted.length}/{draftTarget}</div>
          <div className="border border-paper/20 bg-black/60 px-3 py-2">Rival {opponentDraftedCount}/{draftTarget}</div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {draftPool.map((cardId) => (
          <TcgCard
            key={cardId}
            cardId={cardId}
            traits={traitsById[cardId]}
            burned={burnedIds.has(cardId)}
            selected={false}
            disabled={!canDraft}
            actionLabel={canDraft ? "Draft" : "Waiting"}
            onClick={() => onDraft(cardId)}
          />
        ))}
      </div>
      <div className="mt-4 border border-paper/15 bg-black/55 p-3">
        <div className="terminal-hash mb-2 text-[10px] uppercase tracking-[0.22em] text-pixel/60">Your Drafted Deck</div>
        <div className="flex flex-wrap gap-2">
          {drafted.map((id) => (
            <span key={id} className="border border-paper/20 bg-black/70 px-2 py-1 text-xs text-paper/70">#{id}</span>
          ))}
          {!drafted.length ? <span className="text-xs text-paper/40">No picks yet.</span> : null}
        </div>
      </div>
    </section>
  );
}

function LanePanel({ lane, yourCards, opponentCards, selectedCard, canPlay, onPlay }: { lane: number; yourCards: number[]; opponentCards: number[]; selectedCard: number | null; canPlay: boolean; onPlay: () => void }) {
  return (
    <div className="game-panel min-h-72 p-3">
      <div className="flex items-center justify-between border-b border-paper/15 pb-2">
        <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">Lane {lane + 1}</div>
        <button
          disabled={!canPlay || !selectedCard}
          onClick={onPlay}
          className="inline-flex items-center gap-1 border border-mint/60 bg-mint/10 px-2 py-1 text-[10px] uppercase tracking-widest text-mint disabled:cursor-not-allowed disabled:border-paper/20 disabled:bg-black/50 disabled:text-paper/30"
        >
          <Swords size={12} /> Play
        </button>
      </div>
      <div className="mt-3 grid grid-rows-2 gap-3">
        <CardStack label="Opponent" cards={opponentCards} />
        <CardStack label="You" cards={yourCards} />
      </div>
    </div>
  );
}

function CardStack({ label, cards }: { label: string; cards: number[] }) {
  const last = cards[cards.length - 1];
  return (
    <div className="min-h-28 border border-paper/15 bg-black/50 p-2">
      <div className="mb-1 text-[9px] uppercase tracking-widest text-paper/40">{label} / {cards.length}</div>
      {last !== undefined ? <MiniCard id={last} /> : <div className="grid h-20 place-items-center text-[10px] uppercase tracking-widest text-paper/25">Empty</div>}
    </div>
  );
}

function MiniCard({ id }: { id: number }) {
  return (
    <div className="grid grid-cols-[3rem_1fr] items-center gap-2">
      <NormieImage src={NormieAPIService.imageUrl(id)} alt={`Normie card #${id}`} className="h-12 w-12 border border-paper/25 bg-paper object-contain" />
      <div className="min-w-0">
        <div className="truncate text-xs text-paper">Normie #{id}</div>
        <div className="text-[10px] text-mint">Power {tcgCardPower(id)}</div>
      </div>
    </div>
  );
}

function TcgCard({
  cardId,
  traits,
  burned,
  selected,
  disabled,
  actionLabel,
  onClick
}: {
  cardId: number;
  traits?: NormieTraits;
  burned?: boolean;
  selected: boolean;
  disabled: boolean;
  actionLabel?: string;
  onClick: () => void;
}) {
  const effects = describeTcgEffects(traits, burned);

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`grid min-h-64 grid-rows-[auto_1fr_auto] border bg-black/70 p-3 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 ${
        selected ? "border-mint shadow-neon" : "border-paper/25 hover:border-paper/70"
      }`}
    >
      <NormieImage src={NormieAPIService.imageUrl(cardId)} alt={`Normie card #${cardId}`} className="mx-auto h-32 w-32 border border-paper/30 bg-paper object-contain" />
      <span className="mt-3 border-t border-paper/15 pt-3">
        <span className="flex items-center justify-between gap-2">
          <span className="block text-sm uppercase tracking-[0.14em] text-paper">Normie #{cardId}</span>
          <Dices size={17} className="shrink-0 text-paper/50" />
        </span>
        <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-mint">Power {tcgCardPower(cardId)}</span>
        <span className="mt-1 block text-[10px] uppercase tracking-widest text-paper/45">
          {traits?.Expression ?? "Expression"} / {traits?.Type ?? "Type"}{burned ? " / Burned" : ""}
        </span>
      </span>
      <span className="mt-2 space-y-1 text-[10px] leading-snug text-paper/55">
        {effects.slice(0, 3).map((effect) => (
          <span key={effect} className="block">{effect}</span>
        ))}
      </span>
      {actionLabel ? (
        <span className="mt-3 border-t border-paper/10 pt-2 text-center text-[10px] uppercase tracking-widest text-mint">{actionLabel}</span>
      ) : null}
    </button>
  );
}

function describeTcgEffects(traits?: NormieTraits, burned?: boolean) {
  const expression = String(traits?.Expression ?? "");
  const type = String(traits?.Type ?? "");
  const effects: string[] = [];

  if (expression === "Neutral") effects.push("Neutral: +1 in contested lanes.");
  else if (expression === "Slight Smile") effects.push("Slight Smile: +2 beside an ally.");
  else if (expression === "Friendly") effects.push("Friendly: +2 when behind.");
  else if (expression === "Content") effects.push("Content: +1, resists penalties.");
  else if (expression === "Confident") effects.push("Confident: +3 when contested.");
  else if (expression === "Peaceful") effects.push("Peaceful: blocks burned backlash.");
  else if (expression) effects.push(`${expression}: +1 wildcard expression.`);
  else effects.push("Expression effect loads from traits.");

  if (type === "Human") effects.push("Human: +1 per other Human on board.");
  else if (type === "Cat") effects.push("Cat: +3 into an empty lane.");
  else if (type === "Alien") effects.push("Alien: +2 if rival plays elsewhere.");
  else if (type === "Agent") effects.push("Agent: copies last Type bonus.");
  else effects.push("Type: no active bonus.");

  if (burned) effects.push("Burned: +6, risky if defeated.");
  effects.push("Combos: same Expression +2; Human/Cat/Alien +3.");

  return effects;
}

function useNormieTraitsById(ids: number[]) {
  const [traitsById, setTraitsById] = useState<Record<number, NormieTraits>>({});

  useEffect(() => {
    const missing = ids.filter((id) => !traitsById[id]);
    if (!missing.length) return;
    let cancelled = false;
    void Promise.all(missing.map(async (id) => ({ id, traits: await NormieAPIService.fetchNormieTraits(id) }))).then((entries) => {
      if (cancelled) return;
      setTraitsById((current) => {
        const next = { ...current };
        entries.forEach((entry) => {
          next[entry.id] = entry.traits;
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [ids, traitsById]);

  return traitsById;
}

function useBurnedNormieIds(ids: number[]) {
  const [burnedIds, setBurnedIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (!ids.length) return;
    let cancelled = false;
    void NormieAPIService.fetchBurnedNormieIds(500).then((burned) => {
      if (!cancelled) setBurnedIds(new Set(burned));
    });
    return () => {
      cancelled = true;
    };
  }, [ids.length]);

  return burnedIds;
}

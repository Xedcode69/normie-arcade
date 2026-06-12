"use client";

import { AlertTriangle, Copy, Dices, Flame, GitBranch, Info, LogIn, Plus, RefreshCw, Shield, Swords, Trophy, Users } from "lucide-react";
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
type ProjectedLanePower = {
  power: number;
  effects: string[];
};
type TcgEffectKind = "buff" | "penalty" | "burned" | "combo" | "shield" | "info";
type TcgMatchSummary = {
  result: "Victory" | "Defeat" | "Draw";
  finalScore: string;
  bestCard?: { cardId: number; power: number; owner: "You" | "Opponent" };
  biggestSwing?: { turn: number; margin: number; winner: "You" | "Opponent" | "Draw" };
};

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
  const setLeaderboardOpen = useArcadeStore((store) => store.setLeaderboardOpen);
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
  const draftSecondsLeft = useDraftSecondsLeft(state.draftDeadlineAt);
  const draftActivePlayer = state.players.find((player) => player.id === state.draftTurnPlayerId);

  const title = useMemo(() => {
    if (!connected) return "Create or join a Circuit Clash room.";
    if (!opponent?.connected) return "Waiting for opponent.";
    if (state.phase === "drafting") return canDraft ? "Draft a Normie from the shared pool." : "Opponent is drafting.";
    if (state.phase === "finished") return state.winnerId ? (state.winnerId === playerId ? "Victory" : "Defeat") : "Draw";
    if (you?.pendingPlay) return "Card locked. Waiting for opponent.";
    return state.message;
  }, [canDraft, connected, opponent?.connected, playerId, state.message, state.phase, state.winnerId, you?.pendingPlay]);
  const matchSummary = useMemo(
    () => buildTcgMatchSummary({ history: state.history, playerSeat, winnerId: state.winnerId, playerId, youScore: you?.score ?? 0, opponentScore: opponent?.score ?? 0 }),
    [opponent?.score, playerId, playerSeat, state.history, state.winnerId, you?.score]
  );

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

  function openTcgLeaderboard() {
    setLeaderboardOpen(true);
    window.dispatchEvent(new CustomEvent("normie:select-leaderboard", { detail: { game: "TCG", mode: "PVP" } }));
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
            <PlayerPlate
              label="You"
              name={you?.name}
              score={you?.score ?? 0}
              connected={connected}
              avatarUrl={you?.avatarUrl}
              handCount={you?.handCount ?? hand.length}
              deckCount={you?.deckCount ?? 0}
              draftActive={state.phase === "drafting" && state.draftTurnPlayerId === you?.id}
            />
            <PlayerPlate
              label="Opponent"
              name={opponent?.name}
              score={opponent?.score ?? 0}
              connected={Boolean(opponent?.connected)}
              avatarUrl={opponent?.avatarUrl}
              handCount={opponent?.handCount ?? 0}
              deckCount={opponent?.deckCount ?? 0}
              draftActive={state.phase === "drafting" && state.draftTurnPlayerId === opponent?.id}
            />
          </div>

          <div className="mt-5 border border-paper/15 bg-black/60 p-3">
            <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Rules</div>
            <p className="mt-2 text-sm leading-relaxed text-paper/65">
              Five turns. Play one Normie into one of three lanes. Same-lane cards compare power. Separate lanes both score.
            </p>
          </div>

          <EffectGlossary />
        </aside>

        <main className="min-h-0">
          {state.phase === "finished" ? (
            <MatchResultPanel summary={matchSummary} onRematch={rematch} onOpenLeaderboard={openTcgLeaderboard} />
          ) : null}

          {state.phase === "drafting" ? (
            <DraftPanel
              canDraft={canDraft}
              drafted={drafted}
              draftPool={draftPool}
              draftTarget={state.draftTarget ?? 8}
              opponentDraftedCount={opponent?.draftedCount ?? 0}
              activeDrafterName={draftActivePlayer?.id === playerId ? "You" : draftActivePlayer?.name ?? "Opponent"}
              secondsLeft={draftSecondsLeft}
              totalSeconds={state.draftPickSeconds ?? 20}
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
                  preview={
                    selectedCard
                      ? projectTcgLanePower({
                          cardId: selectedCard,
                          lane: index,
                          lanes: state.lanes,
                          playerSeat,
                          opponentPendingLane: opponent?.pendingPlay?.lane,
                          traitsById,
                          burnedIds
                        })
                      : null
                  }
                  onPlay={() => playSelected(index)}
                />
              ))}
            </section>
          )}

          <section className="mt-4 game-panel p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">Hand</div>
                <div className="text-sm text-paper/60">{state.phase === "drafting" ? `Draft ${drafted.length}/${state.draftTarget ?? 8}.` : `Turn ${state.turn}/${state.maxTurns}. Select a card, then choose a lane.`}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs uppercase tracking-widest text-paper/60">
                <div className="border border-paper/20 bg-black/60 px-3 py-2">Deck {you?.deckCount ?? 0}</div>
                <div className="border border-paper/20 bg-black/60 px-3 py-2">Rival Hand {opponent?.handCount ?? 0}</div>
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
        {reveal.effects?.length ? (
          <div className="flex flex-wrap gap-1">
            {reveal.effects.slice(0, 4).map((effect) => <EffectPill key={effect} effect={effect} triggered />)}
          </div>
        ) : (
          <div>No trait bonus triggered.</div>
        )}
      </div>
    </div>
  );
}

function MatchResultPanel({ summary, onRematch, onOpenLeaderboard }: { summary: TcgMatchSummary; onRematch: () => void; onOpenLeaderboard: () => void }) {
  const resultClass = summary.result === "Victory" ? "text-mint" : summary.result === "Defeat" ? "text-magenta" : "text-paper";

  return (
    <section className="mb-4 border border-paper/35 bg-black/80 p-4 shadow-neon">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-paper/15 pb-3">
        <div>
          <div className="terminal-hash text-[10px] uppercase tracking-[0.25em] text-pixel/65">Match Result</div>
          <div className={`mt-1 font-display text-3xl uppercase tracking-[0.18em] ${resultClass}`}>{summary.result}</div>
        </div>
        <div className="text-right">
          <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/55">Final Score</div>
          <div className="mt-1 font-display text-2xl text-paper">{summary.finalScore}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ResultStat
          label="Best Card Played"
          value={summary.bestCard ? `#${summary.bestCard.cardId} / ${summary.bestCard.power}` : "No cards"}
          detail={summary.bestCard ? `${summary.bestCard.owner} played the highest-power card.` : "No reveal history recorded."}
        />
        <ResultStat
          label="Biggest Power Swing"
          value={summary.biggestSwing ? `${summary.biggestSwing.margin} power` : "0 power"}
          detail={summary.biggestSwing ? `Turn ${summary.biggestSwing.turn}. ${summary.biggestSwing.winner} won the swing.` : "No contested power gap."}
        />
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button onClick={onOpenLeaderboard} className="inline-flex items-center gap-2 border border-mint/55 bg-mint/10 px-4 py-2 text-xs uppercase tracking-widest text-mint transition hover:bg-mint/15">
          <Trophy size={15} /> TCG Leaderboard
        </button>
        <button onClick={onRematch} className="inline-flex items-center gap-2 border border-paper/60 bg-paper/10 px-4 py-2 text-xs uppercase tracking-widest text-paper transition hover:bg-paper/15">
          <RefreshCw size={15} /> Rematch
        </button>
      </div>
    </section>
  );
}

function ResultStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-paper/15 bg-black/55 p-3">
      <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">{label}</div>
      <div className="mt-1 text-lg text-paper">{value}</div>
      <div className="mt-1 text-xs text-paper/50">{detail}</div>
    </div>
  );
}

function EffectGlossary() {
  return (
    <div className="mt-5 border border-paper/15 bg-black/60 p-3">
      <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Effect Key</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <EffectLegend kind="buff" label="Buff" detail="Power gain or positive modifier." />
        <EffectLegend kind="combo" label="Combo" detail="Board synergy bonus." />
        <EffectLegend kind="burned" label="Burned" detail="High-risk burned effect." />
        <EffectLegend kind="penalty" label="Penalty" detail="Score or power drawback." />
        <EffectLegend kind="shield" label="Shield" detail="Blocks burned backlash." />
      </div>
    </div>
  );
}

function EffectLegend({ kind, label, detail }: { kind: TcgEffectKind; label: string; detail: string }) {
  return (
    <span title={detail} className={`inline-flex items-center gap-1 border px-2 py-1 text-[9px] uppercase tracking-widest ${effectClass(kind, false)}`}>
      <EffectIcon kind={kind} size={11} />
      {label}
    </span>
  );
}

function EffectPill({ effect, triggered, compact }: { effect: string; triggered?: boolean; compact?: boolean }) {
  const kind = classifyEffect(effect);
  return (
    <span
      title={effect}
      className={`inline-flex max-w-full items-center gap-1 border text-left leading-snug ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"} ${
        effectClass(kind, Boolean(triggered))
      }`}
    >
      <EffectIcon kind={kind} size={compact ? 10 : 12} />
      <span className="truncate">{shortEffectLabel(effect)}</span>
    </span>
  );
}

function EffectIcon({ kind, size }: { kind: TcgEffectKind; size: number }) {
  if (kind === "burned") return <Flame size={size} />;
  if (kind === "combo") return <GitBranch size={size} />;
  if (kind === "penalty") return <AlertTriangle size={size} />;
  if (kind === "shield") return <Shield size={size} />;
  if (kind === "buff") return <Plus size={size} />;
  return <Info size={size} />;
}

function classifyEffect(effect: string): TcgEffectKind {
  const value = effect.toLowerCase();
  if (value.includes("shield") || value.includes("peaceful") || value.includes("blocks")) return "shield";
  if (value.includes("burned") || value.includes("scorched")) return "burned";
  if (value.includes("combo") || value.includes("spread") || value.includes("same expression")) return "combo";
  if (value.includes("penalty") || value.includes("lost") || value.includes("backlash") || value.includes("-")) return "penalty";
  if (value.includes("+")) return "buff";
  return "info";
}

function effectClass(kind: TcgEffectKind, triggered: boolean) {
  const glow = triggered ? " shadow-[0_0_14px_currentColor]" : "";
  if (kind === "burned") return `border-red-400/60 bg-red-500/10 text-red-300${glow}`;
  if (kind === "combo") return `border-cyan-300/60 bg-cyan-400/10 text-cyan-200${glow}`;
  if (kind === "penalty") return `border-magenta/60 bg-magenta/10 text-magenta${glow}`;
  if (kind === "shield") return `border-paper/55 bg-paper/10 text-paper${glow}`;
  if (kind === "buff") return `border-mint/60 bg-mint/10 text-mint${glow}`;
  return `border-paper/25 bg-black/55 text-paper/60${glow}`;
}

function shortEffectLabel(effect: string) {
  return effect.replace("2 combo:", "Combo:").replace("wins a tied lane by", "tie lane").replace("virtual power", "power");
}

function PlayerPlate({
  label,
  name,
  score,
  connected,
  avatarUrl,
  handCount,
  deckCount,
  draftActive
}: {
  label: string;
  name?: string;
  score: number;
  connected: boolean;
  avatarUrl?: string | null;
  handCount: number;
  deckCount: number;
  draftActive?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[2.25rem_1fr_2rem] items-center gap-2 border bg-black/55 p-2 transition ${
        draftActive ? "animate-pulse border-mint shadow-neon" : "border-paper/20"
      }`}
    >
      {avatarUrl ? <NormieImage src={avatarUrl} alt={`${name ?? label} avatar`} className="h-9 w-9 border border-paper/30 bg-paper object-contain" /> : <Users size={18} className="mx-auto text-paper/45" />}
      <div className="min-w-0">
        <div className="truncate text-xs uppercase tracking-[0.14em] text-paper">{name ?? label}</div>
        <div className={`text-[10px] uppercase tracking-widest ${draftActive ? "text-mint" : "text-paper/40"}`}>{draftActive ? "Drafting" : connected ? "Connected" : "Offline"}</div>
        <div className="mt-1 flex gap-1 text-[9px] uppercase tracking-widest text-paper/45">
          <span className="border border-paper/15 bg-black/50 px-1.5 py-0.5">H {handCount}</span>
          <span className="border border-paper/15 bg-black/50 px-1.5 py-0.5">D {deckCount}</span>
        </div>
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
  activeDrafterName,
  secondsLeft,
  totalSeconds,
  onDraft,
  traitsById,
  burnedIds
}: {
  canDraft: boolean;
  drafted: number[];
  draftPool: number[];
  draftTarget: number;
  opponentDraftedCount: number;
  activeDrafterName: string;
  secondsLeft: number | null;
  totalSeconds: number;
  onDraft: (cardId: number) => void;
  traitsById: Record<number, NormieTraits>;
  burnedIds: Set<number>;
}) {
  const timerPercent = secondsLeft === null ? 0 : Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));

  return (
    <section className="game-panel p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/65">Deck Draft</div>
          <div className="text-sm text-paper/60">Snake draft from the shared Normie pool. Both players draft {draftTarget} cards.</div>
        </div>
        <div className="grid min-w-72 gap-2 text-xs uppercase tracking-widest text-paper/60">
          <div className={`border px-3 py-2 text-center transition ${canDraft ? "animate-pulse border-mint bg-mint/10 text-mint shadow-neon" : "border-paper/20 bg-black/60"}`}>
            {activeDrafterName} drafting / {secondsLeft ?? "--"}s
          </div>
          <div className="h-1.5 overflow-hidden border border-paper/15 bg-black/70">
            <div className={`h-full transition-all duration-300 ${canDraft ? "bg-mint" : "bg-paper/55"}`} style={{ width: `${timerPercent}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="border border-paper/20 bg-black/60 px-3 py-2">You {drafted.length}/{draftTarget}</div>
            <div className="border border-paper/20 bg-black/60 px-3 py-2">Rival {opponentDraftedCount}/{draftTarget}</div>
          </div>
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

function LanePanel({
  lane,
  yourCards,
  opponentCards,
  selectedCard,
  canPlay,
  preview,
  onPlay
}: {
  lane: number;
  yourCards: number[];
  opponentCards: number[];
  selectedCard: number | null;
  canPlay: boolean;
  preview: ProjectedLanePower | null;
  onPlay: () => void;
}) {
  return (
    <div className={`game-panel min-h-72 p-3 transition ${preview ? "border-mint/45 shadow-[0_0_18px_rgba(0,255,194,0.12)]" : ""}`}>
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
      {preview ? (
        <div className="mt-3 border border-mint/35 bg-mint/5 p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="terminal-hash text-[9px] uppercase tracking-[0.2em] text-mint/80">Projected</span>
            <span className="font-display text-lg text-mint">{preview.power}</span>
          </div>
          <div className="mt-1 space-y-0.5 text-[10px] leading-snug text-paper/55">
            {preview.effects.slice(0, 3).map((effect) => (
              <EffectPill key={effect} effect={effect} compact />
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-3 grid grid-rows-2 gap-3">
        <CardStack label="Opponent" cards={opponentCards} />
        <CardStack label="You" cards={yourCards} />
      </div>
    </div>
  );
}

function CardStack({ label, cards }: { label: string; cards: number[] }) {
  const last = cards[cards.length - 1];
  const previous = cards.slice(0, -1).slice(-5);
  return (
    <div className="min-h-32 border border-paper/15 bg-black/50 p-2">
      <div className="mb-1 flex items-center justify-between gap-2 text-[9px] uppercase tracking-widest text-paper/40">
        <span>{label} / {cards.length}</span>
        {previous.length ? <span>Played {cards.length}</span> : null}
      </div>
      {last !== undefined ? <MiniCard id={last} revealKey={`${label}-${cards.length}-${last}`} /> : <div className="grid h-20 place-items-center text-[10px] uppercase tracking-widest text-paper/25">Empty</div>}
      {previous.length ? (
        <div className="mt-2 flex gap-1 border-t border-paper/10 pt-2">
          {previous.map((id, index) => (
            <div key={`${id}-${index}`} title={`Played Normie #${id}`} className="grid h-7 w-7 place-items-center border border-paper/15 bg-paper text-[9px] text-black/70">
              #{String(id).slice(-2)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MiniCard({ id, revealKey }: { id: number; revealKey?: string }) {
  return (
    <div key={revealKey ?? id} className="grid animate-[tcg-reveal_320ms_ease-out] grid-cols-[3rem_1fr] items-center gap-2">
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
      className={`grid min-h-64 animate-[tcg-draw_260ms_ease-out] grid-rows-[auto_1fr_auto] border bg-black/70 p-3 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 ${
        selected ? "-translate-y-1 border-mint bg-mint/5 shadow-[0_0_24px_rgba(0,255,194,0.28)]" : "border-paper/25 hover:border-paper/70"
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
      <span className="mt-2 flex flex-wrap gap-1 text-[10px] leading-snug">
        {effects.slice(0, 3).map((effect) => (
          <EffectPill key={effect} effect={effect} compact />
        ))}
      </span>
      {actionLabel ? (
        <span className="mt-3 border-t border-paper/10 pt-2 text-center text-[10px] uppercase tracking-widest text-mint">{actionLabel}</span>
      ) : selected ? (
        <span className="mt-3 border-t border-mint/30 pt-2 text-center text-[10px] uppercase tracking-widest text-mint">Armed</span>
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

function projectTcgLanePower({
  cardId,
  lane,
  lanes,
  playerSeat,
  opponentPendingLane,
  traitsById,
  burnedIds
}: {
  cardId: number;
  lane: number;
  lanes: Array<{ playerA: number[]; playerB: number[] }>;
  playerSeat: 0 | 1;
  opponentPendingLane?: number;
  traitsById: Record<number, NormieTraits>;
  burnedIds: Set<number>;
}): ProjectedLanePower {
  const ownKey = playerSeat === 0 ? "playerA" : "playerB";
  const opponentKey = playerSeat === 0 ? "playerB" : "playerA";
  const traits = traitsById[cardId];
  const base = tcgCardPower(cardId);
  const expression = String(traits?.Expression ?? "");
  const type = String(traits?.Type ?? "");
  const ownBoardIds = lanes.flatMap((item) => item[ownKey]);
  const ownBoardTraits = ownBoardIds.map((id) => traitsById[id]).filter((item): item is NormieTraits => Boolean(item));
  const contested = opponentPendingLane === lane;
  const effects: string[] = [`Base ${base}`];
  let power = base;

  if (!traits) {
    effects.push("Traits loading.");
    return { power, effects };
  }

  if (expression === "Neutral" && contested) {
    power += 1;
    effects.push("Neutral +1 contested.");
  } else if (expression === "Slight Smile" && hasAdjacentOwnCard(lanes, ownKey, lane)) {
    power += 2;
    effects.push("Slight Smile +2 beside ally.");
  } else if (expression === "Friendly" && lanes[lane][ownKey].length < lanes[lane][opponentKey].length) {
    power += 2;
    effects.push("Friendly +2 while behind.");
  } else if (expression === "Content") {
    power += 1;
    effects.push("Content +1.");
  } else if (expression === "Confident" && contested) {
    power += 3;
    effects.push("Confident +3 contested.");
  } else if (expression === "Peaceful") {
    effects.push("Peaceful shield ready.");
  } else if (expression) {
    power += 1;
    effects.push(`${expression} +1 wildcard.`);
  }

  if (type === "Human") {
    const bonus = ownBoardTraits.filter((item) => String(item.Type ?? "") === "Human").length;
    power += bonus;
    effects.push(bonus ? `Human +${bonus}.` : "Human +0.");
  } else if (type === "Cat" && lanes[lane][ownKey].length + lanes[lane][opponentKey].length === 0) {
    power += 3;
    effects.push("Cat +3 empty lane.");
  } else if (type === "Alien") {
    if (opponentPendingLane !== undefined && opponentPendingLane !== lane) {
      power += 2;
      effects.push("Alien +2 rival elsewhere.");
    } else {
      effects.push("Alien waits for rival lane.");
    }
  } else if (type === "Agent") {
    effects.push("Agent copies hidden last Type bonus.");
  }

  const expressionPair = expression && ownBoardTraits.some((item) => String(item.Expression ?? "") === expression);
  if (expressionPair) {
    power += 2;
    effects.push("Combo +2 same Expression.");
  }

  const typeSet = new Set([...ownBoardTraits.map((item) => String(item.Type ?? "")), type]);
  if (typeSet.has("Human") && typeSet.has("Cat") && typeSet.has("Alien")) {
    power += 3;
    effects.push("Combo +3 type spread.");
  }

  if (burnedIds.has(cardId)) {
    power += 6;
    effects.push("Burned +6.");
  }

  return { power, effects };
}

function hasAdjacentOwnCard(lanes: Array<{ playerA: number[]; playerB: number[] }>, ownKey: "playerA" | "playerB", lane: number) {
  return [lane - 1, lane + 1].some((index) => index >= 0 && index < lanes.length && lanes[index][ownKey].length > 0);
}

function buildTcgMatchSummary({
  history,
  playerSeat,
  winnerId,
  playerId,
  youScore,
  opponentScore
}: {
  history: Array<{
    turn: number;
    playerA?: { cardId: number; power: number };
    playerB?: { cardId: number; power: number };
    laneWinner?: "playerA" | "playerB" | "draw";
  }>;
  playerSeat: 0 | 1;
  winnerId?: string;
  playerId: string | null;
  youScore: number;
  opponentScore: number;
}): TcgMatchSummary {
  const ownerFor = (side: "playerA" | "playerB") => (playerSeat === 0 ? side === "playerA" : side === "playerB") ? "You" : "Opponent";
  let bestCard: TcgMatchSummary["bestCard"];
  let biggestSwing: TcgMatchSummary["biggestSwing"];

  history.forEach((entry) => {
    const cards = [
      entry.playerA ? { ...entry.playerA, owner: ownerFor("playerA") } : null,
      entry.playerB ? { ...entry.playerB, owner: ownerFor("playerB") } : null
    ].filter((item): item is { cardId: number; power: number; owner: "You" | "Opponent" } => Boolean(item));

    cards.forEach((card) => {
      if (!bestCard || card.power > bestCard.power) bestCard = card;
    });

    if (entry.playerA && entry.playerB) {
      const margin = Math.abs(entry.playerA.power - entry.playerB.power);
      if (!biggestSwing || margin > biggestSwing.margin) {
        biggestSwing = {
          turn: entry.turn,
          margin,
          winner: entry.playerA.power === entry.playerB.power ? "Draw" : entry.playerA.power > entry.playerB.power ? ownerFor("playerA") : ownerFor("playerB")
        };
      }
    }
  });

  return {
    result: !winnerId ? "Draw" : winnerId === playerId ? "Victory" : "Defeat",
    finalScore: `${youScore} - ${opponentScore}`,
    bestCard,
    biggestSwing
  };
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

function useDraftSecondsLeft(deadlineAt?: number) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!deadlineAt) {
      setSecondsLeft(null);
      return;
    }

    const update = () => setSecondsLeft(Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [deadlineAt]);

  return secondsLeft;
}

"use client";

import { Check, Coins, Gamepad2, Loader2, Trophy, UserRound, X } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatChips } from "@/lib/gameMath";
import { useAccountStore } from "@/stores/accountStore";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useChipStore } from "@/stores/chipStore";

type GuideState = {
  chipsClaimed?: boolean;
  triedGame?: boolean;
  openedLeaderboard?: boolean;
  dismissed?: boolean;
  completed?: boolean;
};

const GUIDE_VERSION = "v1";

function getStoredGuide(key: string): GuideState {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as GuideState;
  } catch {
    return {};
  }
}

function saveStoredGuide(key: string, state: GuideState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(state));
}

export function FirstRunGuide() {
  const { authenticated, getAccessToken, login, user } = usePrivy();
  const activeGame = useArcadeStore((store) => store.activeGame);
  const setActiveGame = useArcadeStore((store) => store.setActiveGame);
  const setLeaderboardOpen = useArcadeStore((store) => store.setLeaderboardOpen);
  const notify = useArcadeStore((store) => store.notify);
  const username = useAccountStore((store) => store.username);
  const displayName = useAccountStore((store) => store.displayName);
  const selectedNormieId = useAccountStore((store) => store.selectedNormieId);
  const selectedNormieImage = useAccountStore((store) => store.selectedNormieImage);
  const hydrateChips = useChipStore((store) => store.hydrate);
  const balance = useChipStore((store) => store.balance);
  const [guideState, setGuideState] = useState<GuideState>({});
  const [claimingChips, setClaimingChips] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const storageKey = useMemo(() => {
    const accountKey = user?.id ?? user?.wallet?.address ?? "guest";
    return `normie:first-run-guide:${GUIDE_VERSION}:${accountKey}`;
  }, [user?.id, user?.wallet?.address]);

  const avatarPicked = Boolean(username || displayName || selectedNormieId || selectedNormieImage);
  const chipsReady = Boolean(guideState.chipsClaimed);
  const allDone = avatarPicked && chipsReady && guideState.triedGame && guideState.openedLeaderboard;

  const updateGuide = useCallback(
    (patch: GuideState) => {
      setGuideState((current) => {
        const next = { ...current, ...patch };
        saveStoredGuide(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  useEffect(() => {
    if (!authenticated) {
      setGuideState({});
      setHasLoaded(false);
      return;
    }

    setGuideState(getStoredGuide(storageKey));
    setHasLoaded(true);
  }, [authenticated, storageKey]);

  useEffect(() => {
    if (!hasLoaded || guideState.completed || !allDone) return;
    updateGuide({ completed: true });
    notify({ kind: "win", title: "Route Complete", body: "First run guide cleared." });
  }, [allDone, guideState.completed, hasLoaded, notify, updateGuide]);

  async function claimStarterChips() {
    if (claimingChips) return;
    if (!authenticated) {
      login();
      return;
    }

    setClaimingChips(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Could not read your Privy session.");
      }

      const response = await fetch("/api/chips/faucet", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const data = (await response.json()) as {
        ok?: boolean;
        amount?: number;
        error?: string;
        chipAccount?: {
          balance: number;
          streak: number;
          multiplier: number;
        };
      };

      if (!response.ok || !data.ok || !data.chipAccount) {
        throw new Error(data.error ?? "Starter chips failed.");
      }

      hydrateChips(data.chipAccount);
      updateGuide({ chipsClaimed: true });
      notify({ kind: "win", title: "Starter Chips Ready", body: `${formatChips(data.amount ?? 0)} chips added.` });
    } catch (error) {
      notify({ kind: "loss", title: "Starter Chips Failed", body: error instanceof Error ? error.message : "Could not claim chips." });
    } finally {
      setClaimingChips(false);
    }
  }

  function tryRecommendedGame() {
    updateGuide({ triedGame: true });
    setActiveGame("sort");
  }

  function openLeaderboard() {
    updateGuide({ openedLeaderboard: true });
    window.dispatchEvent(new CustomEvent("normie:select-leaderboard", { detail: { game: "SORT_SPRINT", mode: "SKILL" } }));
    setLeaderboardOpen(true);
  }

  if (!authenticated || !hasLoaded || activeGame !== "lobby" || guideState.dismissed || guideState.completed || allDone) {
    return null;
  }

  return (
    <aside className="pointer-events-auto fixed bottom-24 right-5 z-[62] w-[min(92vw,28rem)] border border-paper/35 bg-black/88 p-4 text-paper shadow-neon backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="terminal-hash text-[10px] uppercase tracking-[0.24em] text-pixel/65">0xNormie // First Run Route</div>
          <h2 className="mt-2 font-display text-lg uppercase tracking-[0.2em] text-paper">Start The Arcade</h2>
        </div>
        <button
          onClick={() => updateGuide({ dismissed: true })}
          className="grid h-8 w-8 shrink-0 place-items-center border border-paper/35 bg-paper/5 text-paper/70 transition hover:border-paper hover:text-paper"
          aria-label="Dismiss first run guide"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        <GuideStep complete={avatarPicked} active={!avatarPicked} icon={<UserRound size={14} />} label="Pick Avatar" detail={avatarPicked ? "Player card ready." : "Choose and save a Normie player card."} />
        <GuideAction
          complete={chipsReady}
          active={avatarPicked && !chipsReady}
          icon={claimingChips ? <Loader2 size={14} className="animate-spin" /> : <Coins size={14} />}
          label="Claim Starter Chips"
          detail={chipsReady ? `${formatChips(balance)} chips loaded.` : "Load your first arcade balance."}
          disabled={claimingChips}
          onClick={claimStarterChips}
        />
        <GuideAction
          complete={Boolean(guideState.triedGame)}
          active={chipsReady && !guideState.triedGame}
          icon={<Gamepad2 size={14} />}
          label="Try Sort Sprint"
          detail="A quick skill game with no chip risk."
          disabled={!avatarPicked}
          onClick={tryRecommendedGame}
        />
        <GuideAction
          complete={Boolean(guideState.openedLeaderboard)}
          active={Boolean(guideState.triedGame) && !guideState.openedLeaderboard}
          icon={<Trophy size={14} />}
          label="Open Leaderboard"
          detail="See the first board and chase a score."
          disabled={false}
          onClick={openLeaderboard}
        />
      </div>
    </aside>
  );
}

function GuideStep({ complete, active, icon, label, detail }: { complete: boolean; active: boolean; icon: React.ReactNode; label: string; detail: string }) {
  return (
    <div className={`flex items-center gap-3 border px-3 py-2.5 ${complete ? "border-mint/55 bg-mint/10" : active ? "border-paper/60 bg-paper/10" : "border-paper/20 bg-black/55"}`}>
      <GuideIcon complete={complete} active={active} fallback={icon} />
      <div className="min-w-0">
        <div className="font-display text-xs uppercase tracking-[0.16em] text-paper">{label}</div>
        <div className="mt-1 truncate text-xs text-paper/55">{detail}</div>
      </div>
    </div>
  );
}

function GuideAction({
  complete,
  active,
  icon,
  label,
  detail,
  disabled,
  onClick
}: {
  complete: boolean;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  detail: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 border px-3 py-2.5 text-left transition hover:border-mint/70 hover:bg-paper/10 disabled:cursor-not-allowed disabled:opacity-45 ${
        complete ? "border-mint/55 bg-mint/10" : active ? "border-paper/60 bg-paper/10 shadow-neon" : "border-paper/20 bg-black/55"
      }`}
    >
      <GuideIcon complete={complete} active={active} fallback={icon} />
      <span className="min-w-0">
        <span className="block font-display text-xs uppercase tracking-[0.16em] text-paper">{label}</span>
        <span className="mt-1 block truncate text-xs text-paper/55">{detail}</span>
      </span>
    </button>
  );
}

function GuideIcon({ complete, active, fallback }: { complete: boolean; active: boolean; fallback: React.ReactNode }) {
  return (
    <span className={`grid h-7 w-7 shrink-0 place-items-center border ${complete ? "border-mint text-mint" : active ? "border-paper/70 text-paper" : "border-paper/30 text-paper/45"}`}>
      {complete ? <Check size={14} /> : fallback}
    </span>
  );
}

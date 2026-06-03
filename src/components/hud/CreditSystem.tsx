"use client";

import { Coins, Droplets, RotateCcw, Zap } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { formatChips } from "@/lib/gameMath";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useChipStore } from "@/stores/chipStore";

export function CreditSystem() {
  const { authenticated, getAccessToken, login } = usePrivy();
  const [claiming, setClaiming] = useState(false);
  const balance = useChipStore((state) => state.balance);
  const streak = useChipStore((state) => state.streak);
  const multiplier = useChipStore((state) => state.multiplier);
  const hydrate = useChipStore((state) => state.hydrate);
  const reset = useChipStore((state) => state.reset);
  const notify = useArcadeStore((state) => state.notify);

  async function claimFaucet() {
    if (claiming) return;
    if (!authenticated) {
      notify({ kind: "info", title: "Login Required", body: "Connect your account before using the test faucet." });
      login();
      return;
    }

    setClaiming(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Could not read your Privy session token.");
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
        throw new Error(data.error ?? "Faucet failed.");
      }

      hydrate(data.chipAccount);
      notify({ kind: "win", title: "Test Chips Added", body: `${formatChips(data.amount ?? 0)} chips sent to your account.` });
    } catch (error) {
      notify({ kind: "loss", title: "Faucet Failed", body: error instanceof Error ? error.message : "Could not add test chips." });
    } finally {
      setClaiming(false);
    }
  }

  return (
    <>
      <Metric icon={<Coins size={16} />} label="Chips" value={formatChips(balance)} />
      <Metric icon={<Zap size={16} />} label="Streak" value={`${streak} / ${multiplier.toFixed(1)}x`} />
      <button
        aria-label="Claim test chips"
        onClick={claimFaucet}
        disabled={claiming}
        className="grid h-11 w-11 place-items-center hud-panel text-mint transition hover:text-paper disabled:opacity-45"
        title="Claim test chips"
      >
        <Droplets size={17} />
      </button>
      <button
        aria-label="Reset chips"
        onClick={reset}
        className="grid h-11 w-11 place-items-center hud-panel text-paper/70 transition hover:text-paper"
      >
        <RotateCcw size={17} />
      </button>
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="hud-panel flex min-w-28 items-center gap-2 px-3 py-2">
      <span className="text-paper">{icon}</span>
      <span>
        <span className="terminal-hash block text-[9px] uppercase tracking-widest text-pixel/55">{label}</span>
        <span className="block text-sm capitalize text-paper">{value}</span>
      </span>
    </div>
  );
}

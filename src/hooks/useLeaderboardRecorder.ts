"use client";

import { usePrivy } from "@privy-io/react-auth";
import { recordLeaderboard } from "@/services/LeaderboardService";
import { useArcadeStore } from "@/stores/arcadeStore";
import type { RecordLeaderboardInput } from "@/lib/leaderboardSchema";

type LeaderboardResult = Omit<RecordLeaderboardInput, "privyToken" | "bestCombo"> & {
  bestCombo?: number;
};

export function useLeaderboardRecorder() {
  const { authenticated, getAccessToken } = usePrivy();
  const notify = useArcadeStore((state) => state.notify);

  return async function recordResult(result: LeaderboardResult) {
    if (!authenticated) {
      notify({
        kind: "info",
        title: "Leaderboard skipped",
        body: "Sign in to post ranked runs."
      });
      return;
    }

    try {
      const privyToken = await getAccessToken();
      if (!privyToken) {
        notify({
          kind: "info",
          title: "Leaderboard skipped",
          body: "Could not get an auth token for this run."
        });
        return;
      }
      await recordLeaderboard({ ...result, bestCombo: result.bestCombo ?? 0, privyToken });
    } catch {
      notify({
        kind: "info",
        title: "Leaderboard pending",
        body: "The run completed, but the leaderboard could not be updated."
      });
    }
  };
}

"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useArcadeStore } from "@/stores/arcadeStore";

export function AuthSync() {
  const { ready, authenticated, user } = usePrivy();
  const lastSyncedUser = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !authenticated || !user?.id || lastSyncedUser.current === user.id) {
      return;
    }

    lastSyncedUser.current = user.id;

    const syncAccount = async () => {
      const response = await fetch("/api/account/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privyId: user.id,
          email: user.email?.address ?? null,
          walletAddress: user.wallet?.address ?? null
        })
      });

      if (!response.ok) {
        throw new Error("Account sync failed");
      }

      useArcadeStore.getState().notify({
        title: "Account Linked",
        body: "Your Normie arcade profile is ready.",
        kind: "win"
      });
    };

    syncAccount().catch(() => {
      lastSyncedUser.current = null;
      useArcadeStore.getState().notify({
        title: "Account Sync Pending",
        body: "Login worked, but the database profile could not be saved yet.",
        kind: "info"
      });
    });
  }, [authenticated, ready, user]);

  return null;
}

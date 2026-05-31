"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccountStore } from "@/stores/accountStore";
import { useArcadeStore } from "@/stores/arcadeStore";
import { usePlayerStore } from "@/stores/playerStore";

export function AuthSync() {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const lastSyncedUser = useRef<string | null>(null);
  const setProfile = useAccountStore((state) => state.setProfile);
  const resetProfile = useAccountStore((state) => state.resetProfile);
  const setAvatarUrl = usePlayerStore((state) => state.setAvatarUrl);

  useEffect(() => {
    if (ready && !authenticated) {
      resetProfile();
      setAvatarUrl(null);
      lastSyncedUser.current = null;
    }
  }, [authenticated, ready, resetProfile, setAvatarUrl]);

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

      const account = (await response.json()) as {
        account?: {
          isNormieHolder?: boolean;
          selectedNormieId?: number | null;
          ownedNormies?: Array<{ normieId: number; imageUrl: string }>;
          holderVerifiedAt?: string | null;
        };
      };

      const walletAddress = user.wallet?.address;
      if (walletAddress) {
        const token = await getAccessToken();
        if (token) {
          const verifyResponse = await fetch("/api/account/verify-normies", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              walletAddress,
              selectedNormieId: account.account?.selectedNormieId ?? null
            })
          });

          if (verifyResponse.ok) {
            const verified = (await verifyResponse.json()) as {
              profile: {
                isNormieHolder: boolean;
                selectedNormieId: number | null;
                selectedNormieImage: string | null;
                holderVerifiedAt: string | null;
                ownedNormieIds: number[];
              };
            };
            setProfile(verified.profile);
            setAvatarUrl(verified.profile.selectedNormieImage);
          }
        }
      } else {
        resetProfile();
        setAvatarUrl(null);
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
  }, [authenticated, getAccessToken, ready, resetProfile, setAvatarUrl, setProfile, user]);

  return null;
}

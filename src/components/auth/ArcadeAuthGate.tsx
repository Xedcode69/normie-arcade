"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export function ArcadeAuthGate() {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const router = useRouter();
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    if (!privyAppId || !ready || authenticated) return;
    router.replace("/");
  }, [authenticated, privyAppId, ready, router]);

  return null;
}

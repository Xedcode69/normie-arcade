"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthSync } from "@/components/auth/AuthSync";

export function Providers({ children }: { children: React.ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 10,
            gcTime: 1000 * 60 * 30,
            retry: 2,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  const content = <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  if (!privyAppId) {
    return content;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["wallet", "email"],
        appearance: {
          theme: "dark",
          accentColor: "#f4f1e8",
          logo: undefined
        }
      }}
    >
      {content}
      <AuthSync />
    </PrivyProvider>
  );
}

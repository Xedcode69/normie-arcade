"use client";

import { LogIn, LogOut, UserRound, Wallet } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

function formatWallet(address?: string) {
  if (!address) {
    return "Connected";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AuthButton() {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!privyAppId) {
    return (
      <div className="flex h-9 min-w-28 items-center gap-2 border border-paper/25 bg-black/65 px-2.5 text-paper/55">
        <UserRound size={16} />
        <span>
          <span className="terminal-hash block text-[8px] uppercase tracking-widest">Account</span>
          <span className="block text-xs leading-none">Set Privy ID</span>
        </span>
      </div>
    );
  }

  return <PrivyAuthButton />;
}

function PrivyAuthButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const walletAddress = user?.wallet?.address;

  if (!ready) {
    return (
      <button className="flex h-9 min-w-28 items-center gap-2 border border-paper/25 bg-black/65 px-2.5 text-paper/50" disabled>
        <UserRound size={16} />
        <span>
          <span className="terminal-hash block text-[8px] uppercase tracking-widest">Account</span>
          <span className="block text-xs leading-none">Loading</span>
        </span>
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        aria-label="Connect wallet or login"
        onClick={login}
        className="flex h-9 min-w-28 items-center gap-2 border border-paper/25 bg-black/65 px-2.5 text-paper transition hover:border-mint/60 hover:text-mint"
      >
        <LogIn size={16} />
        <span>
          <span className="terminal-hash block text-[8px] uppercase tracking-widest text-pixel/45">Account</span>
          <span className="block text-xs leading-none">Connect</span>
        </span>
      </button>
    );
  }

  return (
    <>
      <div className="flex h-9 min-w-32 items-center gap-2 border border-paper/25 bg-black/65 px-2.5 text-paper">
        <Wallet size={16} className="text-paper/70" />
        <span>
          <span className="terminal-hash block text-[8px] uppercase tracking-widest text-pixel/45">Account</span>
          <span className="block text-xs leading-none">{formatWallet(walletAddress)}</span>
        </span>
      </div>
      <button
        aria-label="Logout"
        onClick={logout}
        className="grid h-9 w-9 place-items-center border border-paper/25 bg-black/65 text-paper/65 transition hover:border-magenta/55 hover:text-magenta"
        title="Logout"
      >
        <LogOut size={15} />
      </button>
    </>
  );
}

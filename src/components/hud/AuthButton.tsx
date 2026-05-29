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
      <div className="hud-panel flex min-w-32 items-center gap-2 px-3 py-2 text-paper/55">
        <UserRound size={16} />
        <span>
          <span className="terminal-hash block text-[9px] uppercase tracking-widest">Account</span>
          <span className="block text-xs">Set Privy ID</span>
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
      <button className="hud-panel flex min-w-32 items-center gap-2 px-3 py-2 text-paper/50" disabled>
        <UserRound size={16} />
        <span>
          <span className="terminal-hash block text-[9px] uppercase tracking-widest">Account</span>
          <span className="block text-xs">Loading</span>
        </span>
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        aria-label="Connect wallet or login"
        onClick={login}
        className="hud-panel flex min-w-32 items-center gap-2 px-3 py-2 text-paper transition hover:text-mint"
      >
        <LogIn size={16} />
        <span>
          <span className="terminal-hash block text-[9px] uppercase tracking-widest text-pixel/55">Account</span>
          <span className="block text-xs">Connect</span>
        </span>
      </button>
    );
  }

  return (
    <button
      aria-label="Disconnect account"
      onClick={logout}
      className="hud-panel flex min-w-36 items-center gap-2 px-3 py-2 text-paper transition hover:text-magenta"
      title="Disconnect"
    >
      {walletAddress ? <Wallet size={16} /> : <LogOut size={16} />}
      <span>
        <span className="terminal-hash block text-[9px] uppercase tracking-widest text-pixel/55">Account</span>
        <span className="block text-xs">{formatWallet(walletAddress)}</span>
      </span>
    </button>
  );
}

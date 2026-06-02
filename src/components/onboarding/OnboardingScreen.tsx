"use client";

import { ArrowRight, Check, IdCard, Loader2, LogIn, UserRound, Wallet } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useMemo, useState } from "react";
import { useAccountStore } from "@/stores/accountStore";
import { useArcadeStore } from "@/stores/arcadeStore";
import { usePlayerStore } from "@/stores/playerStore";

const previewNormies = [2260, 5674, 6450, 8768];

function shortWallet(address?: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "No wallet connected";
}

function normieImageUrl(id: number) {
  return `https://api.normies.art/normie/${id}/image.png`;
}

export function OnboardingScreen() {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!privyAppId) {
    return <NoPrivyOnboarding />;
  }

  return <PrivyOnboarding />;
}

function NoPrivyOnboarding() {
  const router = useRouter();

  return (
    <main className="bitmap-bg h-screen overflow-y-auto bg-void px-4 py-6 text-paper">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col justify-center">
        <OnboardingShell>
          <div className="game-panel p-6 md:p-8">
            <div className="terminal-hash text-[10px] uppercase tracking-[0.28em] text-pixel/65">Setup Required</div>
            <h1 className="mt-3 font-display text-3xl uppercase tracking-[0.26em] text-paper neon-text md:text-5xl">Normie Arcade</h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-paper/72">
              Add `NEXT_PUBLIC_PRIVY_APP_ID` to enable signup, login, holder verification, profiles, and PvP identity.
            </p>
            <button
              onClick={() => router.push("/arcade")}
              className="mt-7 inline-flex items-center gap-2 border border-paper/70 bg-paper/10 px-5 py-3 text-xs uppercase tracking-widest text-paper shadow-neon"
            >
              Enter Dev Arcade <ArrowRight size={16} />
            </button>
          </div>
        </OnboardingShell>
      </div>
    </main>
  );
}

function PrivyOnboarding() {
  const router = useRouter();
  const { ready, authenticated, user, login, getAccessToken } = usePrivy();
  const username = useAccountStore((store) => store.username);
  const displayName = useAccountStore((store) => store.displayName);
  const isNormieHolder = useAccountStore((store) => store.isNormieHolder);
  const selectedNormieId = useAccountStore((store) => store.selectedNormieId);
  const selectedNormieImage = useAccountStore((store) => store.selectedNormieImage);
  const ownedNormieIds = useAccountStore((store) => store.ownedNormieIds);
  const setProfile = useAccountStore((store) => store.setProfile);
  const setAvatarUrl = usePlayerStore((store) => store.setAvatarUrl);
  const notify = useArcadeStore((store) => store.notify);
  const [draftUsername, setDraftUsername] = useState(username ?? "");
  const [draftDisplayName, setDraftDisplayName] = useState(displayName ?? "");
  const [draftNormieId, setDraftNormieId] = useState<number | null>(selectedNormieId ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeAvatar = draftNormieId !== null ? normieImageUrl(draftNormieId) : selectedNormieImage;
  const profileComplete = Boolean(username || displayName);
  const canSave = useMemo(() => {
    const cleanUsername = draftUsername.trim();
    const cleanDisplayName = draftDisplayName.trim();
    return (!cleanUsername || /^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) && cleanDisplayName.length <= 40;
  }, [draftDisplayName, draftUsername]);

  useEffect(() => {
    setDraftUsername(username ?? "");
    setDraftDisplayName(displayName ?? "");
    setDraftNormieId(selectedNormieId ?? null);
  }, [displayName, selectedNormieId, username]);

  async function saveProfile() {
    if (!canSave) {
      setError("Username must be 3-20 letters, numbers, or underscores.");
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      setError("Could not read your Privy session.");
      return;
    }

    setSaving(true);
    setError(null);
    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        username: draftUsername.trim() ? draftUsername.trim().toLowerCase() : null,
        displayName: draftDisplayName.trim() || null,
        selectedNormieId: draftNormieId
      })
    });
    const data = (await response.json()) as {
      error?: string;
      profile?: {
        username: string | null;
        displayName: string | null;
        isNormieHolder: boolean;
        selectedNormieId: number | null;
        selectedNormieImage: string | null;
        holderVerifiedAt: string | null;
        ownedNormieIds: number[];
      };
    };
    setSaving(false);

    if (!response.ok || !data.profile) {
      setError(data.error ?? "Profile setup failed.");
      return;
    }

    setProfile(data.profile);
    setAvatarUrl(data.profile.selectedNormieImage);
    notify({ kind: "win", title: "Profile Ready", body: "Your arcade identity is saved." });
  }

  function enterArcade() {
    router.push("/arcade");
  }

  return (
    <main className="bitmap-bg h-screen overflow-y-auto bg-void px-4 py-6 text-paper">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-center gap-5 lg:grid-cols-[1fr_26rem]">
        <OnboardingShell>
          <section className="game-panel p-5 md:p-8">
            <div className="terminal-hash text-[10px] uppercase tracking-[0.28em] text-pixel/65">On-chain Neon Casino</div>
            <h1 className="mt-3 font-display text-3xl uppercase tracking-[0.26em] text-paper neon-text md:text-6xl">Normie Arcade</h1>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-paper/72">
              Sign in, verify your Normies, set your player card, then enter the 3D casino with chip games and PvP tables.
            </p>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <StepTile active={!authenticated} complete={authenticated} label="Login" detail="Privy wallet or email" />
              <StepTile active={authenticated && !profileComplete} complete={profileComplete} label="Profile" detail="Username and avatar" />
              <StepTile active={authenticated && profileComplete} complete={false} label="Enter" detail="Open arcade dashboard" />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {!ready ? (
                <button className="inline-flex min-w-40 items-center justify-center gap-2 border border-paper/50 px-5 py-3 text-xs uppercase tracking-widest text-paper/55" disabled>
                  <Loader2 size={16} className="animate-spin" /> Loading
                </button>
              ) : !authenticated ? (
                <button
                  onClick={login}
                  className="inline-flex min-w-44 items-center justify-center gap-2 border border-paper/70 bg-paper/10 px-5 py-3 text-xs uppercase tracking-widest text-paper shadow-neon transition hover:bg-paper/15"
                >
                  <LogIn size={16} /> Sign Up / Login
                </button>
              ) : (
                <button
                  onClick={enterArcade}
                  className="inline-flex min-w-44 items-center justify-center gap-2 border border-mint/70 bg-mint/10 px-5 py-3 text-xs uppercase tracking-widest text-mint shadow-neon transition hover:bg-mint/15"
                >
                  Enter Arcade <ArrowRight size={16} />
                </button>
              )}
            </div>
          </section>
        </OnboardingShell>

        <aside className="game-panel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="terminal-hash text-[10px] uppercase tracking-[0.24em] text-pixel/60">Player Card</div>
              <h2 className="mt-1 font-display text-xl uppercase tracking-[0.2em] text-paper">Arcade Identity</h2>
            </div>
            <div className="grid h-16 w-16 place-items-center border border-paper/45 bg-paper">
              {activeAvatar ? (
                <Image src={activeAvatar} alt="Selected Normie avatar" width={60} height={60} className="h-[60px] w-[60px] object-contain" unoptimized />
              ) : (
                <UserRound size={28} className="text-black/60" />
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 border border-paper/25 bg-black/55 px-3 py-2 text-sm text-paper/75">
            <Wallet size={16} />
            <span>{shortWallet(user?.wallet?.address)}</span>
          </div>

          <label className="mt-5 block">
            <span className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Username</span>
            <input
              value={draftUsername}
              onChange={(event) => setDraftUsername(event.target.value)}
              disabled={!authenticated}
              placeholder="normie_player"
              className="mt-1 w-full border border-paper/35 bg-black/70 px-3 py-2 text-sm lowercase text-paper outline-none placeholder:text-paper/25 disabled:opacity-45"
              maxLength={20}
            />
          </label>

          <label className="mt-4 block">
            <span className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Display Name</span>
            <div className="mt-1 flex items-center gap-2 border border-paper/35 bg-black/70 px-3 py-2">
              <IdCard size={14} className="text-paper/50" />
              <input
                value={draftDisplayName}
                onChange={(event) => setDraftDisplayName(event.target.value)}
                disabled={!authenticated}
                placeholder="Arcade name"
                className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-paper/25 disabled:opacity-45"
                maxLength={40}
              />
            </div>
          </label>

          <div className="mt-4">
            <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Verified Avatar</div>
            <div className="mt-2 grid max-h-36 grid-cols-4 gap-2 overflow-y-auto pr-1">
              {ownedNormieIds.length ? (
                ownedNormieIds.map((id) => (
                  <button
                    key={id}
                    onClick={() => setDraftNormieId(id)}
                    disabled={!authenticated}
                    className={`border bg-paper p-1 transition ${draftNormieId === id ? "border-mint shadow-neon" : "border-paper/30 hover:border-paper"}`}
                    aria-label={`Select Normie ${id}`}
                  >
                    <Image src={normieImageUrl(id)} alt={`Normie #${id}`} width={64} height={64} className="h-14 w-full object-contain" unoptimized />
                    <span className="mt-1 block bg-black px-1 py-0.5 text-[9px] text-paper">#{id}</span>
                  </button>
                ))
              ) : (
                <div className="col-span-4 border border-paper/25 bg-black/65 px-3 py-4 text-center text-xs text-paper/55">
                  {authenticated ? "Holder verification will unlock owned Normie avatars." : "Login to verify owned Normies."}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 inline-flex border border-mint/50 px-2 py-1 text-[10px] uppercase tracking-widest text-mint">
            {isNormieHolder ? `0xN Holder${draftNormieId !== null ? ` #${draftNormieId}` : ""}` : "No verified Normie yet"}
          </div>

          {error ? <div className="mt-4 border border-magenta/60 bg-magenta/10 px-3 py-2 text-xs text-magenta">{error}</div> : null}

          <button
            onClick={saveProfile}
            disabled={!authenticated || saving || !canSave}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-paper/70 bg-paper/10 px-5 py-3 text-xs uppercase tracking-widest text-paper shadow-neon transition hover:bg-paper/15 disabled:opacity-45"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Profile
          </button>
        </aside>
      </div>
    </main>
  );
}

function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex gap-2">
        {previewNormies.map((id) => (
          <div key={id} className="grid h-16 w-16 place-items-center border border-paper/45 bg-paper shadow-neon">
            <Image src={normieImageUrl(id)} alt={`Normie preview #${id}`} width={58} height={58} className="h-[58px] w-[58px] object-contain" unoptimized />
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

function StepTile({ active, complete, label, detail }: { active: boolean; complete: boolean; label: string; detail: string }) {
  return (
    <div className={`border px-4 py-3 ${complete ? "border-mint/60 bg-mint/10" : active ? "border-paper/70 bg-paper/10" : "border-paper/25 bg-black/55"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-sm uppercase tracking-[0.18em] text-paper">{label}</span>
        {complete ? <Check size={15} className="text-mint" /> : null}
      </div>
      <div className="mt-2 text-xs text-paper/55">{detail}</div>
    </div>
  );
}

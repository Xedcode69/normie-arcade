"use client";

import { Check, IdCard, Loader2, Pencil, UserRound, X } from "lucide-react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useMemo, useState } from "react";
import { useAccountStore } from "@/stores/accountStore";
import { useArcadeStore } from "@/stores/arcadeStore";
import { usePlayerStore } from "@/stores/playerStore";

function normieImageUrl(id: number) {
  return `https://api.normies.art/normie/${id}/image.png`;
}

function shortWallet(address?: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "No wallet";
}

export function ProfileButton() {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!privyAppId) {
    return null;
  }

  return <PrivyProfileButton />;
}

function PrivyProfileButton() {
  const { ready, authenticated, user, login, getAccessToken } = usePrivy();
  const profile = useAccountStore((store) => ({
    username: store.username,
    displayName: store.displayName,
    isNormieHolder: store.isNormieHolder,
    selectedNormieId: store.selectedNormieId,
    selectedNormieImage: store.selectedNormieImage,
    holderVerifiedAt: store.holderVerifiedAt,
    ownedNormieIds: store.ownedNormieIds
  }));
  const setProfile = useAccountStore((store) => store.setProfile);
  const setAvatarUrl = usePlayerStore((store) => store.setAvatarUrl);
  const notify = useArcadeStore((store) => store.notify);
  const [open, setOpen] = useState(false);

  if (!ready) {
    return (
      <button className="grid h-11 w-11 place-items-center hud-panel text-paper/45" disabled aria-label="Profile loading">
        <Loader2 size={17} className="animate-spin" />
      </button>
    );
  }

  return (
    <>
      <button
        aria-label={authenticated ? "Open profile" : "Connect to edit profile"}
        onClick={() => (authenticated ? setOpen(true) : login())}
        className="grid h-11 w-11 place-items-center hud-panel text-paper/75 transition hover:text-mint"
        title="Profile"
      >
        {profile.selectedNormieImage ? (
          <Image
            src={profile.selectedNormieImage}
            alt="Profile Normie"
            width={28}
            height={28}
            className="h-7 w-7 border border-paper/40 bg-paper object-contain"
            unoptimized
          />
        ) : (
          <UserRound size={17} />
        )}
      </button>
      {open ? (
        <ProfilePanel
          walletAddress={user?.wallet?.address}
          profile={profile}
          getAccessToken={getAccessToken}
          setProfile={setProfile}
          setAvatarUrl={setAvatarUrl}
          notify={notify}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

type ProfilePanelProfile = {
  username?: string | null;
  displayName?: string | null;
  isNormieHolder: boolean;
  selectedNormieId?: number | null;
  selectedNormieImage?: string | null;
  holderVerifiedAt?: string | null;
  ownedNormieIds: number[];
};

function ProfilePanel({
  walletAddress,
  profile,
  getAccessToken,
  setProfile,
  setAvatarUrl,
  notify,
  onClose
}: {
  walletAddress?: string;
  profile: ProfilePanelProfile;
  getAccessToken: () => Promise<string | null>;
  setProfile: (profile: Partial<ProfilePanelProfile>) => void;
  setAvatarUrl: (avatarUrl?: string | null) => void;
  notify: (message: { title: string; body: string; kind: "win" | "loss" | "info" }) => void;
  onClose: () => void;
}) {
  const [username, setUsername] = useState(profile.username ?? "");
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [selectedNormieId, setSelectedNormieId] = useState<number | null>(profile.selectedNormieId ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedImage = selectedNormieId !== null ? normieImageUrl(selectedNormieId) : profile.selectedNormieImage;
  const canSave = useMemo(() => {
    const cleanUsername = username.trim();
    const cleanDisplayName = displayName.trim();
    return (!cleanUsername || /^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) && cleanDisplayName.length <= 40;
  }, [displayName, username]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function saveProfile() {
    if (!canSave) {
      setError("Username must be 3-20 letters, numbers, or underscores.");
      return;
    }

    setSaving(true);
    setError(null);
    const token = await getAccessToken();

    if (!token) {
      setSaving(false);
      setError("Could not read your Privy session.");
      return;
    }

    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        username: username.trim() ? username.trim().toLowerCase() : null,
        displayName: displayName.trim() || null,
        selectedNormieId
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
      setError(data.error ?? "Profile update failed.");
      return;
    }

    setProfile(data.profile);
    setAvatarUrl(data.profile.selectedNormieImage);
    notify({ kind: "win", title: "Profile Saved", body: "Your arcade identity is updated." });
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 bg-black/65 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="absolute right-3 top-20 w-[calc(100vw-1.5rem)] max-w-md border border-paper/70 bg-black/95 p-4 shadow-neon md:right-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="terminal-hash text-[10px] uppercase tracking-[0.28em] text-pixel/60">0xNormie Profile</div>
            <h2 className="mt-1 font-display text-xl uppercase tracking-[0.2em] text-paper">Player Card</h2>
          </div>
          <button onClick={onClose} aria-label="Close profile" className="grid h-10 w-10 place-items-center border border-paper/40 text-paper/70 hover:text-paper">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-[6rem_1fr] gap-4">
          <div className="grid h-24 w-24 place-items-center border border-paper/50 bg-paper">
            {selectedImage ? (
              <Image src={selectedImage} alt="Selected Normie avatar" width={92} height={92} className="h-[92px] w-[92px] object-contain" unoptimized />
            ) : (
              <UserRound size={34} className="text-black/60" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-paper">
              <IdCard size={16} />
              <span className="truncate">{displayName || username || "Unnamed player"}</span>
            </div>
            <div className="mt-2 text-xs text-pixel/60">{shortWallet(walletAddress)}</div>
            <div className="mt-3 inline-flex border border-mint/50 px-2 py-1 text-[10px] uppercase tracking-widest text-mint">
              {profile.isNormieHolder ? `0xN Holder${selectedNormieId !== null ? ` #${selectedNormieId}` : ""}` : "No verified Normie"}
            </div>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Username</span>
          <div className="mt-1 flex items-center gap-2 border border-paper/35 bg-black/70 px-3 py-2">
            <Pencil size={14} className="text-paper/50" />
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="normie_player"
              className="min-w-0 flex-1 bg-transparent text-sm lowercase text-paper outline-none placeholder:text-paper/25"
              maxLength={20}
            />
          </div>
        </label>

        <label className="mt-4 block">
          <span className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Display Name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Arcade name"
            className="mt-1 w-full border border-paper/35 bg-black/70 px-3 py-2 text-sm text-paper outline-none placeholder:text-paper/25"
            maxLength={40}
          />
        </label>

        <div className="mt-4">
          <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/60">Verified Avatar</div>
          <div className="mt-2 grid max-h-44 grid-cols-4 gap-2 overflow-y-auto pr-1">
            {profile.ownedNormieIds.length ? (
              profile.ownedNormieIds.map((id) => (
                <button
                  key={id}
                  onClick={() => setSelectedNormieId(id)}
                  className={`relative border bg-paper p-1 transition ${
                    selectedNormieId === id ? "border-mint shadow-neon" : "border-paper/30 hover:border-paper"
                  }`}
                  aria-label={`Select Normie ${id}`}
                >
                  <Image src={normieImageUrl(id)} alt={`Normie #${id}`} width={72} height={72} className="h-16 w-full object-contain" unoptimized />
                  <span className="mt-1 block bg-black px-1 py-0.5 text-[9px] text-paper">#{id}</span>
                </button>
              ))
            ) : (
              <div className="col-span-4 border border-paper/25 bg-black/65 px-3 py-5 text-center text-xs text-paper/55">
                Connect a wallet holding Normies to unlock avatar selection.
              </div>
            )}
          </div>
        </div>

        {error ? <div className="mt-4 border border-magenta/60 bg-magenta/10 px-3 py-2 text-xs text-magenta">{error}</div> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="border border-paper/35 px-4 py-2 text-xs uppercase tracking-widest text-paper/65 hover:text-paper">
            Cancel
          </button>
          <button
            onClick={saveProfile}
            disabled={saving || !canSave}
            className="inline-flex items-center gap-2 border border-paper/70 bg-paper/10 px-4 py-2 text-xs uppercase tracking-widest text-paper shadow-neon disabled:opacity-45"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

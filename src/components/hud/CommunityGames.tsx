"use client";

import { CheckCircle2, ExternalLink, Gamepad2, Send, ShieldCheck, X, XCircle } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useArcadeStore } from "@/stores/arcadeStore";

type CommunityGame = {
  id: string;
  name: string;
  creator: string;
  description: string;
  tags: string[];
  url: string;
  previewUrl?: string | null;
  contact?: string | null;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  createdAt?: string;
  accent?: string;
};

const curatedGames: CommunityGame[] = [
  {
    id: "curated-trait-runner",
    name: "Trait Runner",
    creator: "0xBuilder",
    description: "A speed-run cabinet where players dodge hazards based on live Normie trait prompts.",
    tags: ["Skill", "Traits", "Arcade"],
    url: "https://example.com/trait-runner",
    accent: "#27f6e7"
  },
  {
    id: "curated-burn-vault",
    name: "Burn Vault",
    creator: "Ash Labs",
    description: "A memory puzzle using burned Normie history and ghost-image matching.",
    tags: ["Memory", "Burned", "History"],
    url: "https://example.com/burn-vault",
    accent: "#ff43cf"
  },
  {
    id: "curated-agent-terminal",
    name: "Agent Terminal",
    creator: "Pixel Guild",
    description: "Draft Normie agents from persona cards and simulate quick terminal battles.",
    tags: ["Agents", "Strategy", "PvE"],
    url: "https://example.com/agent-terminal",
    accent: "#d7ff35"
  }
];

const accents = ["#27f6e7", "#ff43cf", "#d7ff35", "#35ff8f", "#f4f1e8"];

export function CommunityGames() {
  const open = useArcadeStore((state) => state.communityGamesOpen);
  const setOpen = useArcadeStore((state) => state.setCommunityGamesOpen);
  const [submittedGames, setSubmittedGames] = useState<CommunityGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [adminGames, setAdminGames] = useState<CommunityGame[]>([]);
  const [adminState, setAdminState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!open) return;

    let canceled = false;
    setLoading(true);
    fetch("/api/community-games")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load community games");
        return response.json() as Promise<{ games: CommunityGame[] }>;
      })
      .then((data) => {
        if (!canceled) setSubmittedGames(data.games);
      })
      .catch(() => {
        if (!canceled) setSubmittedGames([]);
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [open]);

  const games = useMemo(
    () => [...submittedGames.map((game, index) => ({ ...game, accent: accents[index % accents.length] })), ...curatedGames],
    [submittedGames]
  );

  if (!open) return null;

  return (
    <aside className="pointer-events-auto fixed inset-0 z-[120] grid place-items-center bg-black/72 px-4 backdrop-blur-sm">
      <section className="game-panel max-h-[86vh] w-[min(64rem,96vw)] overflow-hidden p-4">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-paper/20 pb-4">
          <div>
            <div className="terminal-hash text-[10px] uppercase tracking-[0.26em] text-pixel/70">Portal Alley</div>
            <h2 className="mt-1 font-display text-xl uppercase tracking-[0.22em] text-paper">Community Games</h2>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => {
                setSubmitOpen(true);
                setAdminOpen(false);
                setSubmitState("idle");
              }}
              className="inline-flex h-9 items-center gap-2 border border-mint/60 bg-mint/10 px-3 text-xs uppercase tracking-widest text-mint transition hover:bg-mint/15"
            >
              <Send size={14} /> Submit Game
            </button>
            <button
              onClick={() => {
                setAdminOpen((value) => !value);
                setSubmitOpen(false);
              }}
              className="inline-flex h-9 items-center gap-2 border border-paper/40 bg-black/80 px-3 text-xs uppercase tracking-widest text-paper/70 transition hover:border-mint hover:text-mint"
            >
              <ShieldCheck size={14} /> Admin
            </button>
            <button
              aria-label="Close community games"
              onClick={() => setOpen(false)}
              className="grid h-9 w-9 place-items-center border border-paper/45 bg-black/80 text-paper/70 transition hover:text-paper"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {submitOpen ? (
          <SubmitGameForm
            state={submitState}
            onStateChange={setSubmitState}
            onClose={() => setSubmitOpen(false)}
          />
        ) : null}

        {adminOpen ? (
          <AdminReviewPanel
            games={adminGames}
            token={adminToken}
            state={adminState}
            onTokenChange={setAdminToken}
            onStateChange={setAdminState}
            onGamesChange={setAdminGames}
          />
        ) : null}

        <div className="grid max-h-[68vh] gap-3 overflow-y-auto pr-1 thin-scroll md:grid-cols-3">
          {loading ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-80 animate-pulse border border-paper/15 bg-white/10" />) : null}
          {!loading && games.map((game, index) => <CommunityGameCard key={game.id} game={game} index={index} />)}
        </div>
      </section>
    </aside>
  );
}

function AdminReviewPanel({
  games,
  token,
  state,
  onTokenChange,
  onStateChange,
  onGamesChange
}: {
  games: CommunityGame[];
  token: string;
  state: "idle" | "loading" | "ready" | "error";
  onTokenChange: (token: string) => void;
  onStateChange: (state: "idle" | "loading" | "ready" | "error") => void;
  onGamesChange: (games: CommunityGame[]) => void;
}) {
  async function loadPending() {
    if (!token.trim()) {
      onStateChange("error");
      return;
    }

    onStateChange("loading");
    const response = await fetch("/api/community-games/admin?status=PENDING", {
      headers: { "x-admin-token": token.trim() }
    });

    if (!response.ok) {
      onGamesChange([]);
      onStateChange("error");
      return;
    }

    const data = (await response.json()) as { games: CommunityGame[] };
    onGamesChange(data.games);
    onStateChange("ready");
  }

  async function review(id: string, status: "APPROVED" | "REJECTED") {
    const response = await fetch("/api/community-games/admin", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token.trim()
      },
      body: JSON.stringify({ id, status })
    });

    if (!response.ok) {
      onStateChange("error");
      return;
    }

    onGamesChange(games.filter((game) => game.id !== id));
    onStateChange("ready");
  }

  return (
    <section className="mb-4 border border-paper/25 bg-black/70 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-64 flex-1">
          <span className="mb-1 block text-[9px] uppercase tracking-widest text-paper/45">Admin Token</span>
          <input
            type="password"
            value={token}
            onChange={(event) => onTokenChange(event.target.value)}
            placeholder="COMMUNITY_GAMES_ADMIN_TOKEN"
            className="w-full border border-paper/25 bg-black/70 px-3 py-2 text-sm text-paper outline-none focus:border-mint"
          />
        </label>
        <button
          type="button"
          onClick={loadPending}
          disabled={state === "loading"}
          className="inline-flex h-10 items-center gap-2 border border-mint/70 bg-mint/10 px-3 text-xs uppercase tracking-widest text-mint transition hover:bg-mint/15 disabled:opacity-45"
        >
          <ShieldCheck size={14} /> {state === "loading" ? "Loading" : "Load Pending"}
        </button>
      </div>

      <div className="mt-3 text-xs text-paper/55">
        {state === "error" ? "Admin request failed. Check the token and try again." : state === "ready" ? `${games.length} pending submission${games.length === 1 ? "" : "s"}.` : "Review submitted games before they appear in Portal Alley."}
      </div>

      {games.length ? (
        <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1 thin-scroll">
          {games.map((game) => (
            <article key={game.id} className="grid gap-3 border border-paper/15 bg-black/60 p-3 md:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-pixel/60">{game.creator}</div>
                <h3 className="mt-1 font-display text-sm uppercase tracking-[0.14em] text-paper">{game.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper/65">{game.description}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-paper/45">
                  <a href={game.url} target="_blank" rel="noreferrer" className="underline decoration-paper/30 underline-offset-4 hover:text-mint">
                    {game.url}
                  </a>
                  {game.contact ? <span>Contact: {game.contact}</span> : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {game.tags.map((tag) => (
                    <span key={tag} className="border border-paper/20 px-2 py-1 text-[9px] uppercase tracking-widest text-paper/55">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 md:flex-col md:items-stretch md:justify-center">
                <button
                  type="button"
                  onClick={() => review(game.id, "APPROVED")}
                  className="inline-flex items-center justify-center gap-2 border border-mint/65 bg-mint/10 px-3 py-2 text-xs uppercase tracking-widest text-mint transition hover:bg-mint/15"
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => review(game.id, "REJECTED")}
                  className="inline-flex items-center justify-center gap-2 border border-magenta/55 bg-magenta/10 px-3 py-2 text-xs uppercase tracking-widest text-magenta transition hover:bg-magenta/15"
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SubmitGameForm({
  state,
  onStateChange,
  onClose
}: {
  state: "idle" | "sending" | "sent" | "error";
  onStateChange: (state: "idle" | "sending" | "sent" | "error") => void;
  onClose: () => void;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const tags = String(form.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    onStateChange("sending");
    const response = await fetch("/api/community-games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        creator: form.get("creator"),
        description: form.get("description"),
        tags,
        url: form.get("url"),
        previewUrl: form.get("previewUrl"),
        contact: form.get("contact")
      })
    });

    onStateChange(response.ok ? "sent" : "error");
    if (response.ok) formElement.reset();
  }

  return (
    <form onSubmit={submit} className="mb-4 grid gap-3 border border-mint/35 bg-black/70 p-3 md:grid-cols-2">
      <Field name="name" label="Game Name" required />
      <Field name="creator" label="Creator" required />
      <Field name="url" label="Game URL" required />
      <Field name="previewUrl" label="Preview URL" />
      <Field name="tags" label="Tags" placeholder="Skill, Normies API, Puzzle" required />
      <Field name="contact" label="Contact" />
      <label className="md:col-span-2">
        <span className="mb-1 block text-[9px] uppercase tracking-widest text-paper/45">Description</span>
        <textarea
          name="description"
          required
          minLength={20}
          maxLength={240}
          className="min-h-20 w-full border border-paper/25 bg-black/70 px-3 py-2 text-sm text-paper outline-none focus:border-mint"
        />
      </label>
      <div className="md:col-span-2 flex items-center justify-between gap-3">
        <div className="text-xs text-paper/55">
          {state === "sent" ? "Submission saved as pending review." : state === "error" ? "Submission failed. Check the fields and try again." : "Approved games appear in Portal Alley."}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="border border-paper/35 px-3 py-2 text-xs uppercase tracking-widest text-paper/65 hover:text-paper">
            Close
          </button>
          <button disabled={state === "sending"} className="border border-mint/70 bg-mint/10 px-3 py-2 text-xs uppercase tracking-widest text-mint disabled:opacity-45">
            {state === "sending" ? "Submitting" : "Submit"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({ name, label, placeholder, required }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return (
    <label>
      <span className="mb-1 block text-[9px] uppercase tracking-widest text-paper/45">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full border border-paper/25 bg-black/70 px-3 py-2 text-sm text-paper outline-none focus:border-mint"
      />
    </label>
  );
}

function CommunityGameCard({ game, index }: { game: CommunityGame; index: number }) {
  const accent = game.accent ?? accents[index % accents.length];

  return (
    <article className="pixel-card grid min-h-80 grid-rows-[7rem_1fr_auto] overflow-hidden">
      <div className="relative border-b border-paper/15 bg-black/70">
        <div
          className="absolute inset-4 border"
          style={{
            borderColor: `${accent}88`,
            boxShadow: `0 0 28px ${accent}22 inset`
          }}
        />
        <div className="absolute left-1/2 top-1/2 grid h-16 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden border-2 bg-black/85" style={{ borderColor: accent }}>
          {game.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Gamepad2 size={26} style={{ color: accent }} />
          )}
        </div>
        <div className="absolute bottom-3 left-4 right-4 h-2 border" style={{ borderColor: `${accent}66` }} />
        <div className="absolute right-4 top-3 border border-paper/25 px-2 py-1 text-[9px] text-paper/55">#{index + 1}</div>
      </div>

      <div className="p-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-pixel/60">{game.creator}</div>
        <h3 className="mt-1 font-display text-base uppercase tracking-[0.14em] text-paper">{game.name}</h3>
        <p className="mt-3 text-sm leading-relaxed text-paper/68">{game.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {game.tags.map((tag) => (
            <span key={tag} className="border border-paper/20 bg-black/55 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-paper/55">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <a
        href={game.url}
        target="_blank"
        rel="noreferrer"
        className="mx-4 mb-4 inline-flex items-center justify-center gap-2 border border-paper/65 bg-paper/10 px-3 py-2 text-xs uppercase tracking-widest text-paper transition hover:border-mint hover:bg-mint/10 hover:text-mint"
      >
        Visit Site <ExternalLink size={14} />
      </a>
    </article>
  );
}

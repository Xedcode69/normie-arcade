"use client";

import { CircleDot, Dices, Landmark, Swords, TowerControl, Trophy, Workflow } from "lucide-react";
import { useMemo } from "react";
import { NormieImage } from "@/components/normies/NormieImage";
import { useNormiePreload } from "@/hooks/useNormiePreload";
import { useArcadeStore, type GameId } from "@/stores/arcadeStore";

type MapLocation = {
  id: string;
  label: string;
  subtitle: string;
  hotkey?: string;
  x: number;
  y: number;
  color: string;
  kind: "game" | "utility";
  game?: Exclude<GameId, "lobby">;
  icon: React.ReactNode;
};

const locations: MapLocation[] = [
  {
    id: "roulette-district",
    label: "Roulette District",
    subtitle: "Neon expression casino",
    hotkey: "1",
    x: 16,
    y: 38,
    color: "#27f6e7",
    kind: "game",
    game: "roulette",
    icon: <CircleDot size={22} />
  },
  {
    id: "rps-arena",
    label: "RPS Arena",
    subtitle: "Fixed-stake battle station",
    hotkey: "2",
    x: 31,
    y: 24,
    color: "#ff43cf",
    kind: "game",
    game: "rps",
    icon: <Swords size={22} />
  },
  {
    id: "dna-poker-club",
    label: "DNA Poker Club",
    subtitle: "Private trait lounge",
    hotkey: "3",
    x: 60,
    y: 27,
    color: "#f4f1e8",
    kind: "game",
    game: "poker",
    icon: <Dices size={22} />
  },
  {
    id: "prediction-tower",
    label: "Prediction Tower",
    subtitle: "Up/Down terminal",
    hotkey: "4",
    x: 77,
    y: 43,
    color: "#d7ff35",
    kind: "game",
    game: "updown",
    icon: <TowerControl size={22} />
  },
  {
    id: "sort-depot",
    label: "Sort Sprint Depot",
    subtitle: "Transit sorting station",
    hotkey: "5",
    x: 46,
    y: 60,
    color: "#35ff8f",
    kind: "game",
    game: "sort",
    icon: <Workflow size={22} />
  },
  {
    id: "chip-bank",
    label: "Chip Bank",
    subtitle: "Cashier and balances",
    hotkey: "C",
    x: 23,
    y: 70,
    color: "#f4f1e8",
    kind: "utility",
    icon: <Landmark size={22} />
  },
  {
    id: "leaderboard-wall",
    label: "Leaderboard Wall",
    subtitle: "Global rankings",
    x: 71,
    y: 69,
    color: "#ff43cf",
    kind: "utility",
    icon: <Trophy size={22} />
  }
];

const routePairs = [
  ["roulette-district", "rps-arena"],
  ["rps-arena", "dna-poker-club"],
  ["dna-poker-club", "prediction-tower"],
  ["roulette-district", "sort-depot"],
  ["sort-depot", "prediction-tower"],
  ["sort-depot", "chip-bank"],
  ["sort-depot", "leaderboard-wall"]
];

export function ArcadeLobby() {
  useNormiePreload();
  const setActiveGame = useArcadeStore((state) => state.setActiveGame);
  const notify = useArcadeStore((state) => state.notify);
  const normies = useArcadeStore((state) => state.loadedNormies);
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), []);

  function selectLocation(location: MapLocation) {
    if (location.game) {
      setActiveGame(location.game);
      return;
    }

    notify({
      kind: "info",
      title: location.label,
      body:
        location.id === "chip-bank"
          ? "Chip purchase and withdraw support will arrive in a future update."
          : "Open the trophy panel to inspect live global rankings."
    });
  }

  return (
    <section className="relative h-screen overflow-hidden bg-void pt-28 text-paper">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(244,241,232,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(244,241,232,0.055)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="pointer-events-none absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-mint/60 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-44 w-44 bg-mint/18 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/5 h-52 w-52 bg-magenta/16 blur-3xl" />

      <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col px-4 pb-24 md:px-6">
        <div className="mb-4 flex shrink-0 flex-wrap items-end justify-between gap-3">
          <div>
            <div className="terminal-hash text-[10px] uppercase tracking-[0.28em] text-pixel/70">City Map</div>
            <h1 className="mt-1 font-display text-2xl uppercase tracking-[0.24em] text-paper neon-text md:text-4xl">
              Normie City Arcade
            </h1>
          </div>
          <div className="hud-panel max-w-xl px-4 py-3 text-xs leading-relaxed text-paper/72">
            Pick a district to enter a cabinet. Number hotkeys still launch the game stations.
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden border-2 border-paper/75 bg-black/60 shadow-neon">
          <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_center,rgba(244,241,232,0.09)_0_1px,transparent_1px)] [background-size:22px_22px]" />
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {routePairs.map(([fromId, toId]) => {
              const from = locationById.get(fromId)!;
              const to = locationById.get(toId)!;
              return (
                <line
                  key={`${fromId}-${toId}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="rgba(244,241,232,0.55)"
                  strokeWidth="0.42"
                  strokeDasharray="1.3 1.1"
                />
              );
            })}
          </svg>

          <div className="absolute inset-0">
            {locations.map((location, index) => (
              <MapStop
                key={location.id}
                location={location}
                normie={normies[index]}
                onSelect={() => selectLocation(location)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MapStop({ location, normie, onSelect }: { location: MapLocation; normie?: { id: number; image: string }; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="group absolute z-10 w-52 max-w-[42vw] -translate-x-1/2 -translate-y-1/2 text-left transition hover:-translate-y-[calc(50%+0.25rem)]"
      style={{ left: `${location.x}%`, top: `${location.y}%` }}
    >
      <span className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-full border-2 bg-black/85 shadow-neon transition group-hover:scale-110" style={{ borderColor: location.color, color: location.color }}>
        {location.icon}
      </span>
      <span className="pixel-card block p-2 transition group-hover:border-mint">
        <span className="flex items-center gap-2">
          {normie ? (
            <NormieImage src={normie.image} alt={`Normie guide ${normie.id}`} className="h-10 w-10 border border-paper/30 bg-paper object-contain" />
          ) : (
            <span className="grid h-10 w-10 place-items-center border border-paper/25 bg-black text-[8px] text-paper/45">0xN</span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-xs uppercase tracking-[0.14em] text-paper">{location.label}</span>
            <span className="mt-1 block truncate text-[10px] text-paper/50">{location.subtitle}</span>
          </span>
        </span>
        <span className="mt-2 flex items-center justify-between border-t border-paper/15 pt-2">
          <span className="terminal-hash text-[8px] uppercase tracking-[0.2em] text-pixel/60">
            {location.kind === "game" ? "Station" : "Utility"}
          </span>
          {location.hotkey ? <span className="border border-paper/30 px-2 py-0.5 text-[9px] text-pixel/75">{location.hotkey}</span> : null}
        </span>
      </span>
    </button>
  );
}

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
    y: 42,
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
    x: 32,
    y: 28,
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
    x: 61,
    y: 29,
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
    x: 82,
    y: 45,
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
    x: 48,
    y: 62,
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
    x: 22,
    y: 76,
    color: "#f4f1e8",
    kind: "utility",
    icon: <Landmark size={22} />
  },
  {
    id: "leaderboard-wall",
    label: "Leaderboard Wall",
    subtitle: "Global rankings",
    x: 72,
    y: 75,
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
    <section className="relative h-screen overflow-hidden bg-void pt-24 text-paper">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(244,241,232,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(244,241,232,0.055)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="pointer-events-none absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-mint/60 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-44 w-44 bg-mint/18 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/5 h-52 w-52 bg-magenta/16 blur-3xl" />

      <div className="relative flex h-full w-full flex-col px-4 pb-20 md:px-8">
        <div className="mb-2 shrink-0">
          <div>
            <div className="terminal-hash text-[10px] uppercase tracking-[0.28em] text-pixel/70">City Map</div>
            <h1 className="mt-1 font-display text-2xl uppercase tracking-[0.24em] text-paper neon-text md:text-5xl">
              Normie City Arcade
            </h1>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-75 [background-image:radial-gradient(circle_at_center,rgba(244,241,232,0.085)_0_1px,transparent_1px)] [background-size:24px_24px]" />
          <DistrictZone left={7} top={26} width={24} height={24} color="#27f6e7" label="Expression Casino Block" />
          <DistrictZone left={25} top={12} width={24} height={24} color="#ff43cf" label="Arena Quarter" />
          <DistrictZone left={53} top={14} width={25} height={24} color="#f4f1e8" label="Private Lounge Row" />
          <DistrictZone left={73} top={32} width={22} height={26} color="#d7ff35" label="Prediction Highrise" />
          <DistrictZone left={39} top={50} width={25} height={24} color="#35ff8f" label="Transit Depot Yard" />
          <DistrictZone left={13} top={66} width={24} height={22} color="#f4f1e8" label="Chip Bank Plaza" />
          <DistrictZone left={64} top={65} width={25} height={22} color="#ff43cf" label="Leaderboard Wall" />
          <CityBlocks />
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {routePairs.map(([fromId, toId]) => {
              const from = locationById.get(fromId)!;
              const to = locationById.get(toId)!;
              return (
                <g key={`${fromId}-${toId}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="rgba(0,0,0,0.72)"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                />
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="rgba(244,241,232,0.68)"
                  strokeWidth="0.7"
                  strokeDasharray="1.8 1.5"
                  strokeLinecap="round"
                />
                </g>
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

function DistrictZone({
  left,
  top,
  width,
  height,
  color,
  label
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  label: string;
}) {
  return (
    <div
      className="pointer-events-none absolute border bg-black/30 opacity-85"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        borderColor: `${color}55`,
        boxShadow: `0 0 34px ${color}20 inset, 0 0 18px ${color}12`
      }}
    >
      <div className="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate text-[8px] uppercase tracking-[0.22em] text-paper/32">
        {label}
      </div>
    </div>
  );
}

function CityBlocks() {
  const blocks = [
    { left: 4, top: 18, width: 6, height: 18, color: "#27f6e7" },
    { left: 13, top: 18, width: 5, height: 10, color: "#f4f1e8" },
    { left: 37, top: 16, width: 5, height: 14, color: "#ff43cf" },
    { left: 47, top: 18, width: 5, height: 9, color: "#35ff8f" },
    { left: 82, top: 20, width: 4, height: 15, color: "#d7ff35" },
    { left: 91, top: 40, width: 5, height: 16, color: "#f4f1e8" },
    { left: 5, top: 62, width: 6, height: 17, color: "#f4f1e8" },
    { left: 34, top: 75, width: 7, height: 11, color: "#35ff8f" },
    { left: 54, top: 78, width: 5, height: 10, color: "#27f6e7" },
    { left: 91, top: 72, width: 5, height: 13, color: "#ff43cf" }
  ];

  return (
    <>
      {blocks.map((block, index) => (
        <div
          key={index}
          className="pointer-events-none absolute border border-paper/15 bg-black/50"
          style={{
            left: `${block.left}%`,
            top: `${block.top}%`,
            width: `${block.width}%`,
            height: `${block.height}%`,
            boxShadow: `0 0 22px ${block.color}16`
          }}
        >
          <div className="absolute inset-1 opacity-45 [background-image:linear-gradient(rgba(244,241,232,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(244,241,232,0.12)_1px,transparent_1px)] [background-size:8px_8px]" />
        </div>
      ))}
    </>
  );
}

function MapStop({ location, normie, onSelect }: { location: MapLocation; normie?: { id: number; image: string }; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="group absolute z-10 w-56 max-w-[42vw] -translate-x-1/2 -translate-y-1/2 text-left transition hover:-translate-y-[calc(50%+0.25rem)]"
      style={{ left: `${location.x}%`, top: `${location.y}%` }}
    >
      <span className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-full border-2 bg-black/90 shadow-neon transition group-hover:scale-110" style={{ borderColor: location.color, color: location.color }}>
        {location.icon}
      </span>
      <span className="block border-2 border-paper/75 bg-black/80 p-2 shadow-[4px_4px_0_#000] transition group-hover:border-mint">
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

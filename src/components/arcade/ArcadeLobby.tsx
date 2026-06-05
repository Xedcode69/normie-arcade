"use client";

import { CircleDot, Dices, Gamepad2, Landmark, Search, Swords, TowerControl, Trophy, Workflow } from "lucide-react";
import { useMemo, useState } from "react";
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

type DistrictKind = "casino" | "arena" | "lounge" | "tower" | "depot" | "bank" | "leaderboard" | "community";

const locations: MapLocation[] = [
  {
    id: "roulette-district",
    label: "Roulette District",
    subtitle: "Neon expression casino",
    hotkey: "1",
    x: 18,
    y: 25,
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
    x: 48,
    y: 21,
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
    x: 78,
    y: 25,
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
    x: 19,
    y: 52,
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
    x: 51,
    y: 50,
    color: "#35ff8f",
    kind: "game",
    game: "sort",
    icon: <Workflow size={22} />
  },
  {
    id: "pixel-lab",
    label: "Pixel Detective",
    subtitle: "Fragment ID lab",
    hotkey: "6",
    x: 82,
    y: 52,
    color: "#27f6e7",
    kind: "game",
    game: "pixel",
    icon: <Search size={22} />
  },
  {
    id: "chip-bank",
    label: "Chip Bank",
    subtitle: "Cashier and balances",
    hotkey: "C",
    x: 30,
    y: 80,
    color: "#f4f1e8",
    kind: "utility",
    icon: <Landmark size={22} />
  },
  {
    id: "leaderboard-wall",
    label: "Leaderboard Wall",
    subtitle: "Global rankings",
    x: 68,
    y: 80,
    color: "#ff43cf",
    kind: "utility",
    icon: <Trophy size={22} />
  },
  {
    id: "community-games",
    label: "Community Games",
    subtitle: "External arcade portals",
    x: 50,
    y: 95,
    color: "#d7ff35",
    kind: "utility",
    icon: <Gamepad2 size={22} />
  }
];

const routePairs = [
  ["roulette-district", "rps-arena"],
  ["rps-arena", "dna-poker-club"],
  ["dna-poker-club", "prediction-tower"],
  ["roulette-district", "sort-depot"],
  ["sort-depot", "prediction-tower"],
  ["sort-depot", "chip-bank"],
  ["sort-depot", "pixel-lab"],
  ["pixel-lab", "leaderboard-wall"],
  ["sort-depot", "leaderboard-wall"],
  ["chip-bank", "community-games"],
  ["leaderboard-wall", "community-games"]
];

export function ArcadeLobby() {
  useNormiePreload();
  const [focusedLocationId, setFocusedLocationId] = useState<string | null>(null);
  const setActiveGame = useArcadeStore((state) => state.setActiveGame);
  const setLeaderboardOpen = useArcadeStore((state) => state.setLeaderboardOpen);
  const setCommunityGamesOpen = useArcadeStore((state) => state.setCommunityGamesOpen);
  const notify = useArcadeStore((state) => state.notify);
  const normies = useArcadeStore((state) => state.loadedNormies);
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), []);

  function selectLocation(location: MapLocation) {
    if (location.game) {
      setActiveGame(location.game);
      return;
    }

    if (location.id === "leaderboard-wall") {
      setLeaderboardOpen(true);
      return;
    }

    if (location.id === "community-games") {
      setCommunityGamesOpen(true);
      return;
    }

    notify({
      kind: "info",
      title: location.label,
      body: "Chip purchase and withdraw support will arrive in a future update."
    });
  }

  return (
    <section className="relative h-screen overflow-hidden bg-void pt-20 text-paper">
      <div className="pointer-events-none absolute inset-0 opacity-65 [background-image:linear-gradient(rgba(244,241,232,0.052)_1px,transparent_1px),linear-gradient(90deg,rgba(244,241,232,0.052)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="pointer-events-none absolute inset-x-0 top-20 h-px bg-gradient-to-r from-transparent via-mint/60 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-44 w-44 bg-mint/18 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/5 h-52 w-52 bg-magenta/16 blur-3xl" />

      <div className="relative flex h-full w-full flex-col px-4 pb-16 md:px-8">
        <div className="mb-3 shrink-0">
          <div>
            <div className="terminal-hash text-[10px] uppercase tracking-[0.28em] text-pixel/70">City Map</div>
            <h1 className="mt-1 font-display text-2xl uppercase tracking-[0.2em] text-paper neon-text md:text-4xl xl:text-5xl">
              Normie City Arcade
            </h1>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-y border-paper/10 thin-scroll">
          <div className="relative h-[1120px] min-w-0">
            <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:radial-gradient(circle_at_center,rgba(244,241,232,0.07)_0_1px,transparent_1px)] [background-size:24px_24px]" />
            <DistrictZone id="roulette-district" focusedLocationId={focusedLocationId} left={5} top={13} width={26} height={19} color="#27f6e7" label="Roulette District" kind="casino" />
            <DistrictZone id="rps-arena" focusedLocationId={focusedLocationId} left={35} top={9} width={28} height={20} color="#ff43cf" label="RPS Arena" kind="arena" />
            <DistrictZone id="dna-poker-club" focusedLocationId={focusedLocationId} left={67} top={13} width={27} height={19} color="#f4f1e8" label="DNA Poker Club" kind="lounge" />
            <DistrictZone id="prediction-tower" focusedLocationId={focusedLocationId} left={5} top={41} width={27} height={20} color="#d7ff35" label="Prediction Tower" kind="tower" />
            <DistrictZone id="sort-depot" focusedLocationId={focusedLocationId} left={36} top={38} width={29} height={22} color="#35ff8f" label="Sort Sprint Depot" kind="depot" />
            <DistrictZone id="pixel-lab" focusedLocationId={focusedLocationId} left={70} top={41} width={26} height={20} color="#27f6e7" label="Pixel Detective" kind="casino" />
            <DistrictZone id="chip-bank" focusedLocationId={focusedLocationId} left={15} top={67} width={30} height={18} color="#f4f1e8" label="Chip Bank" kind="bank" />
            <DistrictZone id="leaderboard-wall" focusedLocationId={focusedLocationId} left={56} top={67} width={31} height={18} color="#ff43cf" label="Leaderboard Wall" kind="leaderboard" />
            <DistrictZone id="community-games" focusedLocationId={focusedLocationId} left={31} top={89} width={38} height={9} color="#d7ff35" label="Community Games" kind="community" />
            <CityBlocks isDimmed={Boolean(focusedLocationId)} />
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {routePairs.map(([fromId, toId]) => {
                const from = locationById.get(fromId)!;
                const to = locationById.get(toId)!;
                const isFocusedRoute = focusedLocationId ? fromId === focusedLocationId || toId === focusedLocationId : true;
                return (
                  <g key={`${fromId}-${toId}`} className="transition-opacity duration-200" opacity={isFocusedRoute ? 1 : 0.28}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isFocusedRoute ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.5)"}
                    strokeWidth="2.1"
                    strokeLinecap="round"
                  />
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isFocusedRoute ? "rgba(244,241,232,0.78)" : "rgba(244,241,232,0.34)"}
                    strokeWidth={isFocusedRoute ? "0.85" : "0.55"}
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
                  focusedLocationId={focusedLocationId}
                  onFocusChange={setFocusedLocationId}
                  onSelect={() => selectLocation(location)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DistrictZone({
  id,
  focusedLocationId,
  left,
  top,
  width,
  height,
  color,
  label,
  kind
}: {
  id: string;
  focusedLocationId: string | null;
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  label: string;
  kind: DistrictKind;
}) {
  const isFocused = focusedLocationId === id;
  const isDimmed = Boolean(focusedLocationId) && !isFocused;

  return (
    <div
      className="pointer-events-none absolute overflow-hidden border bg-black/34 transition-all duration-200"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        borderColor: `${color}55`,
        opacity: isDimmed ? 0.38 : isFocused ? 1 : 0.78,
        boxShadow: isFocused
          ? `0 0 56px ${color}36 inset, 0 0 34px ${color}34`
          : `0 0 34px ${color}18 inset, 0 0 16px ${color}10`
      }}
    >
      <div
        className="absolute inset-0 opacity-55"
        style={{
          backgroundImage:
            "linear-gradient(rgba(244,241,232,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(244,241,232,0.08) 1px, transparent 1px)",
          backgroundSize: "12px 12px"
        }}
      />
      <div className="absolute left-3 top-2 z-10 max-w-[calc(100%-1.5rem)] truncate bg-black/60 px-1 text-[8px] uppercase tracking-[0.24em]" style={{ color }}>
        {label}
      </div>
      <DistrictDetails kind={kind} color={color} />
    </div>
  );
}

function DistrictDetails({ kind, color }: { kind: DistrictKind; color: string }) {
  if (kind === "casino") {
    return (
      <>
        <div className="absolute bottom-4 left-5 h-12 w-32 rounded-full border-2 border-dashed opacity-80" style={{ borderColor: color }} />
        {Array.from({ length: 12 }).map((_, index) => (
          <span
            key={index}
            className="city-casino-bulb absolute h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: color,
              left: `${10 + index * 7}%`,
              top: `${22 + (index % 2) * 48}%`,
              boxShadow: `0 0 10px ${color}`,
              animationDelay: `${index * 120}ms`
            }}
          />
        ))}
      </>
    );
  }

  if (kind === "arena") {
    return (
      <>
        <div className="city-arena-ring absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 opacity-70" style={{ borderColor: color }} />
        <div className="city-arena-ring city-arena-ring-delayed absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rotate-45 border opacity-55" style={{ borderColor: color }} />
        <div className="absolute bottom-6 left-8 right-8 h-px" style={{ backgroundColor: `${color}88` }} />
      </>
    );
  }

  if (kind === "lounge") {
    return (
      <>
        <div className="absolute bottom-5 left-6 right-6 h-16 border opacity-60" style={{ borderColor: color }} />
        <div className="absolute right-8 top-8 h-24 w-16 border opacity-45" style={{ borderColor: color }} />
        <div className="city-lounge-line absolute inset-x-8 top-1/2 h-px rotate-[-8deg]" style={{ backgroundColor: `${color}66` }} />
        <div className="city-lounge-line city-lounge-line-delayed absolute inset-x-12 top-[62%] h-px rotate-[-8deg]" style={{ backgroundColor: `${color}55` }} />
      </>
    );
  }

  if (kind === "tower") {
    return (
      <>
        <div className="absolute bottom-4 left-1/2 h-[78%] w-20 -translate-x-1/2 border-2 opacity-75" style={{ borderColor: color }} />
        <div className="city-tower-scan absolute left-1/2 h-8 w-20 -translate-x-1/2" style={{ background: `linear-gradient(to bottom, transparent, ${color}66, transparent)` }} />
        {Array.from({ length: 7 }).map((_, index) => (
          <span key={index} className="absolute left-1/2 h-px w-16 -translate-x-1/2" style={{ top: `${22 + index * 9}%`, backgroundColor: `${color}88` }} />
        ))}
        <div className="absolute left-1/2 top-6 h-5 w-5 -translate-x-1/2 rotate-45 border" style={{ borderColor: color }} />
      </>
    );
  }

  if (kind === "depot") {
    return (
      <>
        <div className="absolute left-4 right-4 top-1/2 h-1 -translate-y-1/2" style={{ backgroundColor: `${color}77` }} />
        <div className="absolute left-4 right-4 top-[58%] h-1" style={{ backgroundColor: `${color}55` }} />
        <span className="city-depot-signal absolute right-8 top-[42%] h-3 w-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 14px ${color}` }} />
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} className="absolute top-[46%] h-10 w-px rotate-12" style={{ left: `${10 + index * 10}%`, backgroundColor: `${color}88` }} />
        ))}
      </>
    );
  }

  if (kind === "bank") {
    return (
      <>
        <div className="absolute bottom-5 left-8 right-8 h-3 border-t-2" style={{ borderColor: color }} />
        {Array.from({ length: 4 }).map((_, index) => (
          <span key={index} className="absolute bottom-8 h-16 w-3 border" style={{ left: `${25 + index * 14}%`, borderColor: color }} />
        ))}
        <div className="absolute bottom-[5.3rem] left-1/2 h-12 w-24 -translate-x-1/2 border-t-2" style={{ borderColor: color }} />
      </>
    );
  }

  if (kind === "community") {
    return (
      <>
        <div className="absolute bottom-4 left-8 right-8 top-9 border-2 opacity-70" style={{ borderColor: color }} />
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className="absolute bottom-6 h-8 w-10 border bg-black/60"
            style={{
              left: `${18 + index * 15}%`,
              borderColor: `${color}99`,
              boxShadow: `0 0 14px ${color}22`
            }}
          />
        ))}
        <div className="absolute left-1/2 top-6 h-px w-2/3 -translate-x-1/2" style={{ backgroundColor: `${color}88` }} />
      </>
    );
  }

  return (
    <>
      <div className="absolute bottom-5 left-7 right-7 top-10 border-2 opacity-70" style={{ borderColor: color }} />
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="city-leaderboard-row absolute left-10 right-10 h-5 border"
          style={{
            top: `${28 + index * 11}%`,
            borderColor: `${color}88`,
            animationDelay: `${index * 180}ms`
          }}
        />
      ))}
      <div className="absolute right-8 top-7 h-3 w-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 14px ${color}` }} />
    </>
  );
}

function CityBlocks({ isDimmed }: { isDimmed: boolean }) {
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
    <div className={isDimmed ? "opacity-35 transition-opacity duration-200" : "opacity-70 transition-opacity duration-200"}>
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
    </div>
  );
}

function MapStop({
  location,
  normie,
  focusedLocationId,
  onFocusChange,
  onSelect
}: {
  location: MapLocation;
  normie?: { id: number; image: string };
  focusedLocationId: string | null;
  onFocusChange: (id: string | null) => void;
  onSelect: () => void;
}) {
  const isFocused = focusedLocationId === location.id;
  const isDimmed = Boolean(focusedLocationId) && !isFocused;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => onFocusChange(location.id)}
      onMouseLeave={() => onFocusChange(null)}
      onFocus={() => onFocusChange(location.id)}
      onBlur={() => onFocusChange(null)}
      className="group absolute z-10 w-48 max-w-[38vw] -translate-x-1/2 -translate-y-1/2 text-left transition duration-200 hover:-translate-y-[calc(50%+0.25rem)]"
      style={{ left: `${location.x}%`, top: `${location.y}%` }}
    >
      <span
        className="mx-auto mb-1.5 grid h-14 w-14 place-items-center rounded-full border-2 bg-black/90 shadow-neon transition group-hover:scale-110"
        style={{ borderColor: location.color, color: location.color, opacity: isDimmed ? 0.45 : 1 }}
      >
        {location.icon}
      </span>
      <span
        className="block border bg-black/86 p-2 shadow-[4px_4px_0_#000] backdrop-blur-sm transition group-hover:border-mint"
        style={{
          borderColor: isFocused ? location.color : "rgba(244,241,232,0.75)",
          opacity: isDimmed ? 0.48 : 1,
          boxShadow: isFocused ? `4px 4px 0 #000, 0 0 24px ${location.color}33` : "4px 4px 0 #000"
        }}
      >
        <span className="flex items-center gap-2">
          {normie ? (
            <NormieImage src={normie.image} alt={`Normie guide ${normie.id}`} className="h-9 w-9 border border-paper/30 bg-paper object-contain" />
          ) : (
            <span className="grid h-9 w-9 place-items-center border border-paper/25 bg-black text-[8px] text-paper/45">0xN</span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-[11px] uppercase tracking-[0.12em] text-paper">{location.label}</span>
            <span className="mt-0.5 block truncate text-[9px] text-paper/50">{location.subtitle}</span>
          </span>
        </span>
        <span className="mt-2 flex items-center justify-between border-t border-paper/15 pt-1.5">
          <span className="terminal-hash text-[8px] uppercase tracking-[0.2em] text-pixel/60">
            {location.kind === "game" ? "Station" : "Utility"}
          </span>
          {location.hotkey ? <span className="border border-paper/30 px-2 py-0.5 text-[9px] text-pixel/75">{location.hotkey}</span> : null}
        </span>
      </span>
    </button>
  );
}

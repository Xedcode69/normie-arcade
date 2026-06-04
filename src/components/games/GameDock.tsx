"use client";

import { AnimatePresence, motion } from "framer-motion";
import { HelpCircle, Maximize2, Minimize2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useArcadeStore } from "@/stores/arcadeStore";
import { NormieImage } from "@/components/normies/NormieImage";
import type { GameId } from "@/stores/arcadeStore";
import { RouletteGame } from "./RouletteGame";
import { RPSGame } from "./RPSGame";
import { PokerGame } from "./PokerGame";
import { UpDownGame } from "./UpDownGame";
import { SortSprintGame } from "./SortSprintGame";

const instructions = {
  roulette: {
    title: "Expression Roulette",
    lines: [
      "Choose Easy, Medium, or Hard, then set your chip bet.",
      "Each column spins, fetches a real Normie, and stops on that Normie's API Expression trait.",
      "Win only when every revealed Normie has the same Expression."
    ]
  },
  rps: {
    title: "Type RPS Arena",
    lines: [
      "Choose Human, Cat, or Alien to start a round.",
      "Cat beats Alien, Human beats Cat, and Alien beats Human.",
      "The match is best of three. First side to two round wins takes the match."
    ]
  },
  poker: {
    title: "Normie DNA Poker",
    lines: [
      "Texas-style PvP poker using real Normies as cards.",
      "Each seated player reserves the same buy-in, then antes from that table stack each hand.",
      "You receive two private Normies. Five community Normies reveal across flop, turn, and river.",
      "Use check, call, raise, or fold during betting. The server handles chip reserve, wagers, pot, and payout.",
      "Click a visible card to inspect full traits. Hover for a quick Expression, Eyes, and Accessory peek.",
      "Glowing cards show which visible Normies currently contribute to your best DNA combo."
    ],
    sections: [
      {
        heading: "DNA Hands",
        items: [
          "Expression Pair: two or more cards share Expression.",
          "Eye Trips: three or more cards share Eyes.",
          "Age/Gender Flush: five cards share Age or Gender.",
          "Accessory Full House: Expression pair plus Accessory triple.",
          "Perfect DNA: four or more cards share Eyes, Accessory, or Facial Feature."
        ]
      },
      {
        heading: "Showdown",
        items: [
          "Best five-card DNA hand wins the pot.",
          "Tied best hands split the pot.",
          "Folded players cannot win the hand."
        ]
      }
    ]
  },
  updown: {
    title: "Up Or Down",
    lines: [
      "Choose Easy, Medium, or Hard, then set your chip bet.",
      "Predict whether the next fetched Normie ID is higher or lower than the current base.",
      "Survive the target number of predictions to win the mode payout."
    ]
  },
  sort: {
    title: "Normie Sort Sprint",
    lines: [
      "Start a fixed 30-second sorting shift.",
      "Read the active rule and send each live Normie to the matching trait bin.",
      "The rule changes during the run. Correct sorts build combo and wrong bins reset it.",
      "Your final score is the number of correct selections, ranked on the cabinet leaderboard."
    ]
  }
} as const;

export function GameDock() {
  const activeGame = useArcadeStore((state) => state.activeGame);
  const setActiveGame = useArcadeStore((state) => state.setActiveGame);
  const loadedNormies = useArcadeStore((state) => state.loadedNormies);
  const [expanded, setExpanded] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (activeGame === "lobby") {
      setExpanded(false);
      setShowInstructions(false);
    } else {
      setShowInstructions(false);
    }
  }, [activeGame]);

  const helperNormie = loadedNormies[14] ?? loadedNormies[3] ?? loadedNormies[0];

  return (
    <AnimatePresence>
      {activeGame !== "lobby" ? (
        <div
          className={`pointer-events-none fixed z-[100] px-3 transition-all ${
            expanded ? "inset-x-0 bottom-3 top-3 md:bottom-5 md:top-5" : "inset-x-0 bottom-3 top-20 md:bottom-5 md:top-20"
          }`}
        >
          <motion.section
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className={`game-panel pointer-events-auto mx-auto flex h-full w-full flex-col overflow-hidden p-3 ${
              expanded ? "max-w-[96rem]" : "max-w-7xl"
            }`}
          >
            <div className="absolute right-4 top-4 z-20 flex gap-2">
              <button
                aria-label="Show game instructions"
                onClick={() => setShowInstructions((value) => !value)}
                className="grid h-9 w-9 place-items-center border border-paper/50 bg-black/85 text-paper/70 transition hover:text-paper"
              >
                <HelpCircle size={17} />
              </button>
              <button
                aria-label={expanded ? "Shrink game panel" : "Expand game panel"}
                onClick={() => setExpanded((value) => !value)}
                className="grid h-9 w-9 place-items-center border border-paper/50 bg-black/85 text-paper/70 transition hover:text-paper"
              >
                {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
              <button
                aria-label="Return to lobby"
                onClick={() => {
                  setShowInstructions(false);
                  setActiveGame("lobby");
                }}
                className="grid h-9 w-9 place-items-center border border-paper/50 bg-black/85 text-paper/70 transition hover:text-paper"
              >
                <X size={17} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden thin-scroll">
              {activeGame === "roulette" ? <RouletteGame /> : null}
              {activeGame === "rps" ? <RPSGame /> : null}
              {activeGame === "poker" ? <PokerGame /> : null}
              {activeGame === "updown" ? <UpDownGame /> : null}
              {activeGame === "sort" ? <SortSprintGame /> : null}
            </div>
            <AnimatePresence>
              {showInstructions ? (
                <InstructionGuide
                  normie={helperNormie}
                  game={activeGame}
                  onClose={() => setShowInstructions(false)}
                />
              ) : null}
            </AnimatePresence>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function InstructionGuide({
  normie,
  game,
  onClose
}: {
  normie?: { id: number; image: string };
  game: Exclude<GameId, "lobby">;
  onClose: () => void;
}) {
  const content = instructions[game];

  return (
    <motion.aside
      initial={{ x: -360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -360, opacity: 0 }}
      transition={{ type: "spring", stiffness: 210, damping: 24 }}
      className="absolute bottom-4 left-4 top-16 z-30 flex w-[min(24rem,calc(100%-2rem))] flex-col justify-end gap-3"
    >
      <div className="flex items-end gap-3">
        <div className="pixel-card shrink-0 p-2 shadow-neon">
          {normie ? (
            <NormieImage src={normie.image} alt={`Instruction Normie #${normie.id}`} className="h-24 w-24 object-cover" />
          ) : (
            <div className="h-24 w-24 animate-pulse bg-white/10" />
          )}
          <div className="mt-1 text-center text-[9px] uppercase tracking-widest text-paper">Guide #{normie?.id ?? "----"}</div>
        </div>
        <div className="game-panel p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <div className="terminal-hash text-[10px] uppercase tracking-[0.22em] text-pixel/70">Instructions</div>
              <h3 className="mt-1 font-display text-base uppercase tracking-[0.18em] text-paper">{content.title}</h3>
            </div>
            <button
              aria-label="Close instructions"
              onClick={onClose}
              className="grid h-7 w-7 place-items-center border border-paper/40 bg-black/80 text-paper/70 hover:text-paper"
            >
              <X size={14} />
            </button>
          </div>
          <div className="space-y-2 text-sm leading-relaxed text-paper/82">
            {content.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {"sections" in content
              ? content.sections.map((section) => (
                  <div key={section.heading} className="border-t border-paper/15 pt-2">
                    <div className="terminal-hash text-[10px] uppercase tracking-[0.2em] text-mint/75">{section.heading}</div>
                    <ul className="mt-2 space-y-1">
                      {section.items.map((item) => (
                        <li key={item} className="grid grid-cols-[0.75rem_1fr] gap-2 text-xs text-paper/75">
                          <span className="text-mint">-</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              : null}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

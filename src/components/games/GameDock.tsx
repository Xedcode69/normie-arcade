"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useArcadeStore } from "@/stores/arcadeStore";
import { RouletteGame } from "./RouletteGame";
import { RPSGame } from "./RPSGame";
import { UpDownGame } from "./UpDownGame";

export function GameDock() {
  const activeGame = useArcadeStore((state) => state.activeGame);
  const setActiveGame = useArcadeStore((state) => state.setActiveGame);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (activeGame === "lobby") setExpanded(false);
  }, [activeGame]);

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
                  aria-label={expanded ? "Shrink game panel" : "Expand game panel"}
                  onClick={() => setExpanded((value) => !value)}
                  className="grid h-9 w-9 place-items-center border border-paper/50 bg-black/85 text-paper/70 transition hover:text-paper"
                >
                  {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>
              <button
                aria-label="Return to lobby"
                onClick={() => setActiveGame("lobby")}
                className="grid h-9 w-9 place-items-center border border-paper/50 bg-black/85 text-paper/70 transition hover:text-paper"
              >
                <X size={17} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden thin-scroll max-md:overflow-auto">
              {activeGame === "roulette" ? <RouletteGame /> : null}
              {activeGame === "rps" ? <RPSGame /> : null}
              {activeGame === "updown" ? <UpDownGame /> : null}
            </div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

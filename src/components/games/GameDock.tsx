"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useArcadeStore } from "@/stores/arcadeStore";
import { RouletteGame } from "./RouletteGame";
import { RPSGame } from "./RPSGame";
import { UpDownGame } from "./UpDownGame";

export function GameDock() {
  const activeGame = useArcadeStore((state) => state.activeGame);
  const setActiveGame = useArcadeStore((state) => state.setActiveGame);

  return (
    <AnimatePresence>
      {activeGame !== "lobby" ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[100] px-3 md:bottom-5">
          <motion.section
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="hud-panel pointer-events-auto mx-auto flex max-h-[min(54vh,34rem)] w-full max-w-5xl flex-col overflow-hidden p-4 md:max-h-[min(48vh,32rem)]"
          >
            <div className="mb-2 flex justify-end">
              <button
                aria-label="Return to lobby"
                onClick={() => setActiveGame("lobby")}
                className="grid h-9 w-9 place-items-center border border-paper/50 bg-black/85 text-paper/70 transition hover:text-paper"
              >
                <X size={17} />
              </button>
            </div>
            <div className="min-h-0 overflow-auto thin-scroll">
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

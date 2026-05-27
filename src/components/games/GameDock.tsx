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
        <motion.section
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="pointer-events-auto absolute inset-x-3 bottom-3 z-50 mx-auto max-h-[58vh] max-w-5xl overflow-auto rounded-lg hud-panel p-4 thin-scroll md:bottom-5 md:max-h-[48vh]"
        >
          <button
            aria-label="Return to lobby"
            onClick={() => setActiveGame("lobby")}
            className="sticky left-full top-0 z-10 grid h-9 w-9 place-items-center rounded border border-white/15 bg-black/75 text-white/70 transition hover:text-white"
          >
            <X size={17} />
          </button>
          {activeGame === "roulette" ? <RouletteGame /> : null}
          {activeGame === "rps" ? <RPSGame /> : null}
          {activeGame === "updown" ? <UpDownGame /> : null}
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}

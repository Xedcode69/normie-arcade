"use client";

import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import { useState } from "react";
import { rpsWinner } from "@/lib/gameMath";
import { NormieAPIService } from "@/services/NormieAPIService";
import { useArcadeStore } from "@/stores/arcadeStore";
import { useChipStore } from "@/stores/chipStore";
import type { Normie, RPSType } from "@/types/normie";
import { RPS_TYPES } from "@/types/normie";
import { playTone } from "@/lib/audio";
import { NormieImage } from "@/components/normies/NormieImage";

type Score = { player: number; npc: number };

export function RPSGame() {
  const [bet, setBet] = useState(150);
  const [score, setScore] = useState<Score>({ player: 0, npc: 0 });
  const [playerNormie, setPlayerNormie] = useState<Normie | null>(null);
  const [npcNormie, setNpcNormie] = useState<Normie | null>(null);
  const [message, setMessage] = useState("Best of 3. Human beats Cat, Cat beats Alien, Alien beats Human.");
  const [locked, setLocked] = useState(false);
  const wager = useChipStore((state) => state.wager);
  const win = useChipStore((state) => state.win);
  const lose = useChipStore((state) => state.lose);
  const notify = useArcadeStore((state) => state.notify);

  async function playRound(playerType: RPSType) {
    if (locked) return;
    const roundStart = score.player === 0 && score.npc === 0;
    if (roundStart && !wager(bet)) {
      notify({ kind: "loss", title: "Table rejected", body: "You need more chips for that match." });
      return;
    }

    setLocked(true);
    setMessage("Arena gates opening...");
    const [player, npc] = await Promise.all([NormieAPIService.getRandomNormie(), NormieAPIService.getRandomNormie()]);
    const npcType = RPS_TYPES[Math.floor(Math.random() * RPS_TYPES.length)];
    setPlayerNormie({ ...player, traits: { ...player.traits, Type: playerType } });
    setNpcNormie({ ...npc, traits: { ...npc.traits, Type: npcType } });

    const result = rpsWinner(playerType, npcType);
    const nextScore = { ...score };
    if (result === "player") nextScore.player += 1;
    if (result === "npc") nextScore.npc += 1;
    setScore(nextScore);

    if (result === "draw") {
      setMessage(`${playerType} mirrors ${npcType}. Draw round.`);
      playTone(420, 0.15);
    } else {
      setMessage(`${playerType} versus ${npcType}. ${result === "player" ? "You take the round." : "NPC takes the round."}`);
      playTone(result === "player" ? 680 : 220, 0.18, "triangle");
    }

    if (nextScore.player >= 2 || nextScore.npc >= 2) {
      const won = nextScore.player > nextScore.npc;
      if (won) {
        win(bet * 2.4);
        notify({ kind: "win", title: "Arena match won", body: "2.4x payout awarded." });
      } else {
        lose();
        notify({ kind: "loss", title: "Arena match lost", body: "The dealer keeps the wager." });
      }
      setTimeout(() => setScore({ player: 0, npc: 0 }), 900);
    }

    setLocked(false);
  }

  return (
    <div className="pr-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl uppercase tracking-[0.2em] text-paper">Normie Type RPS</h2>
          <p className="terminal-hash mt-1 max-w-2xl text-sm text-pixel/70">{message}</p>
        </div>
        <div className="pixel-card px-4 py-2 text-sm text-paper/70">
          {score.player} - {score.npc}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {RPS_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => playRound(type)}
            disabled={locked}
            className="inline-flex items-center gap-2 border border-paper/60 bg-paper/10 px-4 py-2 text-sm uppercase tracking-widest text-paper disabled:opacity-50"
          >
            <Swords size={15} /> {type}
          </button>
        ))}
        <input
          aria-label="RPS bet"
          type="number"
          value={bet}
          min={10}
          step={10}
          onChange={(event) => setBet(Number(event.target.value))}
          className="w-28 border border-paper/40 bg-black/60 px-3 py-2 text-sm text-paper"
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Fighter label="You" normie={playerNormie} />
        <Fighter label="NPC" normie={npcNormie} />
      </div>
    </div>
  );
}

function Fighter({ label, normie }: { label: string; normie: Normie | null }) {
  return (
    <motion.div layout className="pixel-card p-3 text-center">
      <div className="text-xs uppercase tracking-widest text-white/50">{label}</div>
      {normie ? (
        <NormieImage src={normie.image} alt={`${label} Normie`} className="mx-auto mt-2 h-28 w-28 object-cover" />
      ) : (
        <div className="mx-auto mt-2 h-28 w-28 animate-pulse bg-white/10" />
      )}
      <div className="mt-2 font-display text-lg text-white">{normie?.traits.Type ?? "Awaiting"}</div>
    </motion.div>
  );
}

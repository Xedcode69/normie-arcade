"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { useArcadeStore } from "@/stores/arcadeStore";
import { usePlayerStore } from "@/stores/playerStore";

const moves = {
  up: { x: 0, z: -1, icon: <ArrowUp size={16} /> },
  left: { x: -1, z: 0, icon: <ArrowLeft size={16} /> },
  right: { x: 1, z: 0, icon: <ArrowRight size={16} /> },
  down: { x: 0, z: 1, icon: <ArrowDown size={16} /> }
};

export function PlayerControls() {
  const activeGame = useArcadeStore((state) => state.activeGame);
  const setTouchMove = usePlayerStore((state) => state.setTouchMove);

  if (activeGame !== "lobby") return null;

  return (
    <div className="pointer-events-auto absolute bottom-5 right-5 z-40 grid grid-cols-3 gap-1 md:bottom-24">
      <div />
      <MoveButton label="Move forward" move={moves.up} setTouchMove={setTouchMove} />
      <div />
      <MoveButton label="Move left" move={moves.left} setTouchMove={setTouchMove} />
      <div className="grid h-10 w-10 place-items-center border border-paper/40 bg-black/70 text-[8px] uppercase tracking-widest text-paper">
        WASD
      </div>
      <MoveButton label="Move right" move={moves.right} setTouchMove={setTouchMove} />
      <div />
      <MoveButton label="Move back" move={moves.down} setTouchMove={setTouchMove} />
      <div />
    </div>
  );
}

function MoveButton({
  label,
  move,
  setTouchMove
}: {
  label: string;
  move: { x: number; z: number; icon: React.ReactNode };
  setTouchMove: (move: { x: number; z: number }) => void;
}) {
  return (
    <button
      aria-label={label}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setTouchMove({ x: move.x, z: move.z });
      }}
      onPointerUp={() => setTouchMove({ x: 0, z: 0 })}
      onPointerCancel={() => setTouchMove({ x: 0, z: 0 })}
      className="grid h-10 w-10 place-items-center border border-paper/60 bg-black/80 text-paper shadow-neon"
    >
      {move.icon}
    </button>
  );
}

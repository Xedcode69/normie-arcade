"use client";

import { RotateCw } from "lucide-react";
import { useArcadeStore } from "@/stores/arcadeStore";

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

export function RotateScreenButton() {
  const notify = useArcadeStore((state) => state.notify);

  async function rotateScreen() {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }

      const orientation = screen.orientation as LockableOrientation | undefined;
      if (orientation?.lock) {
        await orientation.lock("landscape");
        notify({ kind: "info", title: "Landscape locked", body: "The arcade is now optimized for wide play." });
      } else {
        notify({ kind: "info", title: "Rotate device", body: "Turn your device sideways for the best arcade view." });
      }
    } catch {
      notify({ kind: "info", title: "Rotate device", body: "Your browser blocked orientation lock. Rotate manually." });
    }
  }

  return (
    <button
      aria-label="Rotate screen"
      onClick={rotateScreen}
      className="grid h-11 w-11 place-items-center hud-panel text-paper/70 transition hover:text-paper"
    >
      <RotateCw size={17} />
    </button>
  );
}

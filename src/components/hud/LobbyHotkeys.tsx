"use client";

import { useEffect } from "react";
import { useArcadeStore } from "@/stores/arcadeStore";

export function LobbyHotkeys() {
  const activeGame = useArcadeStore((state) => state.activeGame);
  const setActiveGame = useArcadeStore((state) => state.setActiveGame);
  const notify = useArcadeStore((state) => state.notify);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      const key = event.key.toLowerCase();
      if (activeGame !== "lobby" && key === "escape") {
        setActiveGame("lobby");
        return;
      }

      if (activeGame !== "lobby") return;

      if (key === "1") setActiveGame("roulette");
      if (key === "2") setActiveGame("rps");
      if (key === "3") setActiveGame("poker");
      if (key === "4") setActiveGame("updown");
      if (key === "c") {
        notify({
          kind: "info",
          title: "Chip Master",
          body: "Chip purchase and withdraw support will arrive in a future update."
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeGame, notify, setActiveGame]);

  return null;
}

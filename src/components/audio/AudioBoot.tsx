"use client";

import { useEffect } from "react";
import { Volume2 } from "lucide-react";
import { useAudioStore } from "@/stores/audioStore";

export function AudioBoot() {
  const enabled = useAudioStore((state) => state.enabled);
  const muted = useAudioStore((state) => state.muted);
  const toggleEnabled = useAudioStore((state) => state.toggleEnabled);

  useEffect(() => {
    if (!enabled || muted) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 55;
    gain.gain.value = 0.018;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    return () => {
      oscillator.stop();
      context.close();
    };
  }, [enabled, muted]);

  if (enabled) return null;

  return (
    <button
      onClick={toggleEnabled}
      className="absolute bottom-5 left-5 z-30 inline-flex items-center gap-2 rounded-lg border border-cyanGlow/50 bg-black/70 px-4 py-3 text-sm uppercase tracking-widest text-cyanGlow shadow-neon"
    >
      <Volume2 size={16} /> Enable Atmosphere
    </button>
  );
}

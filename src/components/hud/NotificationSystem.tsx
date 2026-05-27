"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useArcadeStore, type ArcadeNotification } from "@/stores/arcadeStore";

export function NotificationSystem() {
  const notifications = useArcadeStore((state) => state.notifications);
  const dismiss = useArcadeStore((state) => state.dismiss);

  return (
    <div className="pointer-events-none absolute left-3 top-32 z-30 flex w-[min(92vw,22rem)] flex-col gap-2 md:left-5">
      <AnimatePresence>
        {notifications.map((notification) => (
          <Toast key={notification.id} notification={notification} dismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toast({ notification, dismiss }: { notification: ArcadeNotification; dismiss: (id: string) => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => dismiss(notification.id), 3600);
    return () => window.clearTimeout(timeout);
  }, [dismiss, notification.id]);

  const color = notification.kind === "win" ? "border-acid text-acid" : notification.kind === "loss" ? "border-magentaGlow text-magentaGlow" : "border-cyanGlow text-cyanGlow";

  return (
    <motion.div
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -30, opacity: 0 }}
      className={`hud-panel pointer-events-auto rounded-lg border p-3 ${color}`}
    >
      <div className="text-sm uppercase tracking-widest">{notification.title}</div>
      {notification.body ? <div className="mt-1 text-xs text-white/60">{notification.body}</div> : null}
    </motion.div>
  );
}

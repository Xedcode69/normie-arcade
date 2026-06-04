"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RPSType } from "@/types/normie";
import { buildPartySocketUrl, initialRpsPvpState, type RPSPvPState } from "@/lib/rpsPvp";

type ServerMessage =
  | { type: "state"; state: RPSPvPState }
  | { type: "full"; message: string }
  | { type: "error"; message: string };

function normalizeAccountKey(accountKey?: string | null) {
  return accountKey?.trim().toLowerCase().replace(/[^a-z0-9:_-]/g, "-") || "guest";
}

function getOrCreatePlayerId(accountKey?: string | null) {
  const key = `normie-rps-player-id:${normalizeAccountKey(accountKey)}`;
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;

  const next = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

function getPlayerName(playerId: string) {
  return `Player ${playerId.slice(0, 4).toUpperCase()}`;
}

type JoinOptions = {
  privyToken: string;
  bet: number;
  accountKey?: string | null;
  name?: string | null;
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
};

export function useRpsPvp(room = "rps-quickplay") {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<RPSPvPState>(initialRpsPvpState);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const url = useMemo(() => buildPartySocketUrl(room), [room]);

  const send = useCallback((payload: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const connect = useCallback((options: JoinOptions) => {
    if (socketRef.current && socketRef.current.readyState <= WebSocket.OPEN) {
      return;
    }

    const nextPlayerId = getOrCreatePlayerId(options.accountKey);
    setPlayerId(nextPlayerId);
    setError(null);

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      send({
        type: "join",
        playerId: nextPlayerId,
        name: options.name || getPlayerName(nextPlayerId),
        privyToken: options.privyToken,
        bet: options.bet,
        isNormieHolder: options.isNormieHolder,
        selectedNormieId: options.selectedNormieId,
        avatarUrl: options.avatarUrl
      });
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as ServerMessage;
      if (data.type === "state") {
        setState(data.state);
      }
      if (data.type === "full" || data.type === "error") {
        setError(data.message);
      }
    };

    socket.onerror = () => {
      setError("Could not connect to the RPS PvP room.");
    };

    socket.onclose = () => {
      setConnected(false);
    };
  }, [send, url]);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    setConnected(false);
    setState(initialRpsPvpState);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const submitPick = useCallback(
    (pick: RPSType) => {
      if (!playerId) return;
      send({ type: "pick", playerId, pick });
    },
    [playerId, send]
  );

  const reset = useCallback(() => {
    if (!playerId) return;
    send({ type: "reset", playerId });
  }, [playerId, send]);

  useEffect(() => () => disconnect(), [disconnect]);

  return {
    connected,
    connect,
    clearError,
    disconnect,
    error,
    playerId,
    reset,
    state,
    submitPick
  };
}

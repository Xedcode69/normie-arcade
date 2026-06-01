"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildPokerSocketUrl, initialPokerPvpState, type PokerPvPState } from "@/lib/pokerPvp";

type ServerMessage =
  | { type: "poker_state"; state: PokerPvPState }
  | { type: "full"; message: string }
  | { type: "error"; message: string };

type JoinOptions = {
  privyToken: string;
  ante: number;
  name?: string | null;
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
};

function getOrCreatePlayerId() {
  const key = "normie-poker-player-id";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;

  const next = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

function getPlayerName(playerId: string) {
  return `Player ${playerId.slice(0, 4).toUpperCase()}`;
}

export function usePokerPvp(room = "poker-quickplay") {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<PokerPvPState>(initialPokerPvpState);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const url = useMemo(() => buildPokerSocketUrl(room), [room]);

  const send = useCallback((payload: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const connect = useCallback((options: JoinOptions) => {
    if (socketRef.current && socketRef.current.readyState <= WebSocket.OPEN) {
      return;
    }

    const nextPlayerId = getOrCreatePlayerId();
    setPlayerId(nextPlayerId);
    setError(null);

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      send({
        type: "poker_join",
        playerId: nextPlayerId,
        name: options.name || getPlayerName(nextPlayerId),
        privyToken: options.privyToken,
        ante: options.ante,
        isNormieHolder: options.isNormieHolder,
        selectedNormieId: options.selectedNormieId,
        avatarUrl: options.avatarUrl
      });
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as ServerMessage;
      if (data.type === "poker_state") {
        setState(data.state);
      }
      if (data.type === "full" || data.type === "error") {
        setError(data.message);
      }
    };

    socket.onerror = () => {
      setError("The DNA Poker table is not reachable. Make sure PartyKit is running, then try again.");
    };

    socket.onclose = () => {
      setConnected(false);
    };
  }, [send, url]);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    setConnected(false);
    setState(initialPokerPvpState);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const toggleReady = useCallback(() => {
    if (!playerId) return;
    send({ type: "poker_ready", playerId });
  }, [playerId, send]);

  const nextHand = useCallback(() => {
    if (!playerId) return;
    send({ type: "poker_next_hand", playerId });
  }, [playerId, send]);

  useEffect(() => () => disconnect(), [disconnect]);

  return {
    connected,
    connect,
    clearError,
    disconnect,
    error,
    playerId,
    nextHand,
    state,
    toggleReady
  };
}

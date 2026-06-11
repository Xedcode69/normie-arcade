"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildTcgSocketUrl, initialTcgPvpState, type TcgPvpState } from "@/lib/tcgPvp";

type ServerMessage =
  | { type: "tcg_state"; state: TcgPvpState }
  | { type: "full"; message: string }
  | { type: "error"; message: string };

type JoinOptions = {
  privyToken: string;
  accountKey?: string | null;
  name?: string | null;
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
};

function normalizeAccountKey(accountKey?: string | null) {
  return accountKey?.trim().toLowerCase().replace(/[^a-z0-9:_-]/g, "-") || "guest";
}

function getOrCreatePlayerId(accountKey?: string | null) {
  const key = `normie-tcg-player-id:${normalizeAccountKey(accountKey)}`;
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;

  const next = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

function getPlayerName(playerId: string) {
  return `Player ${playerId.slice(0, 4).toUpperCase()}`;
}

export function useTcgPvp(room = "tcg-quickplay") {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<TcgPvpState>(initialTcgPvpState);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const url = useMemo(() => buildTcgSocketUrl(room), [room]);

  const send = useCallback((payload: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const connect = useCallback((options: JoinOptions) => {
    if (socketRef.current && socketRef.current.readyState <= WebSocket.OPEN) return;

    const nextPlayerId = getOrCreatePlayerId(options.accountKey);
    setPlayerId(nextPlayerId);
    setError(null);

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      send({
        type: "tcg_join",
        playerId: nextPlayerId,
        name: options.name || getPlayerName(nextPlayerId),
        privyToken: options.privyToken,
        isNormieHolder: options.isNormieHolder,
        selectedNormieId: options.selectedNormieId,
        avatarUrl: options.avatarUrl
      });
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as ServerMessage;
      if (data.type === "tcg_state") {
        setState(data.state);
      }
      if (data.type === "full" || data.type === "error") {
        setError(data.message);
      }
    };

    socket.onerror = () => {
      setError("The TCG table is not reachable. Make sure PartyKit is running, then try again.");
    };

    socket.onclose = () => {
      setConnected(false);
    };
  }, [send, url]);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    setConnected(false);
    setState(initialTcgPvpState);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const playCard = useCallback(
    (cardId: number, lane: number) => {
      if (!playerId) return;
      send({ type: "tcg_play", playerId, cardId, lane });
    },
    [playerId, send]
  );

  const draftPick = useCallback(
    (cardId: number) => {
      if (!playerId) return;
      send({ type: "tcg_draft_pick", playerId, cardId });
    },
    [playerId, send]
  );

  const rematch = useCallback(() => {
    if (!playerId) return;
    send({ type: "tcg_rematch", playerId });
  }, [playerId, send]);

  useEffect(() => () => disconnect(), [disconnect]);

  return {
    connected,
    connect,
    clearError,
    disconnect,
    error,
    draftPick,
    playerId,
    playCard,
    rematch,
    state
  };
}

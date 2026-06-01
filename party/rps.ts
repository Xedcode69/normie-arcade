type RPSType = "Human" | "Cat" | "Alien";
type Phase = "waiting" | "playing" | "revealed" | "finished";
type PartyConnection = {
  id: string;
  send(message: string): void;
};
type PartyRoom = {
  id?: string;
  env?: Record<string, unknown>;
  broadcast(message: string): void;
};

type Player = {
  id: string;
  name: string;
  seat: 0 | 1;
  score: number;
  connected: boolean;
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
  bet: number;
  privyToken: string;
  reserved: boolean;
  serverBalance?: number;
  accountError?: string;
  pick?: RPSType;
};

type RoundReveal = {
  playerA: RPSType;
  playerB: RPSType;
  winner: "playerA" | "playerB" | "draw";
};

type RoundHistoryEntry = RoundReveal & {
  round: number;
  scoreA: number;
  scoreB: number;
};

type MatchState = {
  phase: Phase;
  players: Player[];
  round: number;
  history: RoundHistoryEntry[];
  reveal?: RoundReveal;
  winnerId?: string;
  message: string;
};

type PokerPlayer = {
  id: string;
  name: string;
  seat: number;
  connected: boolean;
  ready: boolean;
  hand?: number[];
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
};

type PokerState = {
  phase: "waiting" | "ready" | "dealt";
  players: PokerPlayer[];
  maxPlayers: number;
  round: number;
  handId?: string;
  message: string;
};

type ClientMessage =
  | {
      type: "join";
      playerId: string;
      name?: string;
      privyToken: string;
      bet: number;
      isNormieHolder?: boolean;
      selectedNormieId?: number | null;
      avatarUrl?: string | null;
    }
  | { type: "pick"; playerId: string; pick: RPSType }
  | { type: "reset"; playerId: string };

type PokerClientMessage =
  | {
      type: "poker_join";
      playerId: string;
      name?: string;
      isNormieHolder?: boolean;
      selectedNormieId?: number | null;
      avatarUrl?: string | null;
    }
  | { type: "poker_ready"; playerId: string };

const picks: RPSType[] = ["Human", "Cat", "Alien"];

function rpsWinner(a: RPSType, b: RPSType) {
  if (a === b) return "draw";
  if ((a === "Human" && b === "Cat") || (a === "Cat" && b === "Alien") || (a === "Alien" && b === "Human")) {
    return "playerA";
  }
  return "playerB";
}

function cleanPlayerName(name?: string) {
  return (name?.trim() || "Normie Player").slice(0, 28);
}

export default class RPSParty {
  private connections = new Map<string, string>();
  private pokerConnections = new Map<string, string>();
  private pokerConnectionObjects = new Map<string, PartyConnection>();
  private staleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private revealTimer?: ReturnType<typeof setTimeout>;
  private matchId = this.createMatchId();
  private state: MatchState = {
    phase: "waiting",
    players: [],
    round: 1,
    history: [],
    message: "Waiting for a second challenger."
  };
  private pokerState: PokerState = {
    phase: "waiting",
    players: [],
    maxPlayers: 5,
    round: 1,
    message: "Waiting for players to sit at the DNA Poker table."
  };

  constructor(readonly room: PartyRoom) {}

  onConnect(connection: PartyConnection) {
    if (this.isPokerRoom()) {
      connection.send(JSON.stringify({ type: "poker_state", state: this.publicPokerState() }));
      return;
    }

    connection.send(JSON.stringify({ type: "state", state: this.publicState() }));
  }

  async onClose(connection: PartyConnection) {
    const pokerPlayerId = this.pokerConnections.get(connection.id);
    if (pokerPlayerId) {
      this.pokerConnections.delete(connection.id);
      this.pokerConnectionObjects.delete(connection.id);
      const pokerPlayer = this.pokerState.players.find((player) => player.id === pokerPlayerId);
      if (pokerPlayer) {
        pokerPlayer.connected = false;
        pokerPlayer.ready = false;
        this.updatePokerPhase();
        this.pokerState.message = `${pokerPlayer.name} disconnected. Their seat is waiting.`;
        this.broadcastPoker();
      }
      return;
    }

    const playerId = this.connections.get(connection.id);
    if (!playerId) return;

    this.connections.delete(connection.id);
    const player = this.state.players.find((item) => item.id === playerId);
    if (player) {
      if (this.state.phase === "waiting" && player.reserved) {
        await this.refundWager(player);
      }
      player.connected = false;
      player.pick = undefined;
      if (this.revealTimer) {
        clearTimeout(this.revealTimer);
        this.revealTimer = undefined;
      }
      this.state.message = `${player.name} disconnected. Waiting for players.`;
      this.state.phase = this.state.players.filter((item) => item.connected).length >= 2 ? this.state.phase : "waiting";
      this.scheduleStaleCleanup(player.id);
      this.broadcast();
    }
  }

  async onMessage(message: string, connection: PartyConnection) {
    const pokerData = this.parsePokerMessage(message);
    if (pokerData) {
      this.handlePokerMessage(pokerData, connection);
      return;
    }

    const data = this.parseMessage(message);
    if (!data) return;

    if (data.type === "join") {
      await this.join(data, connection);
      return;
    }

    if (data.type === "pick") {
      this.pick(data);
      return;
    }

    if (data.type === "reset") {
      await this.reset(data.playerId);
    }
  }

  private parsePokerMessage(message: string): PokerClientMessage | null {
    try {
      const data = JSON.parse(message) as PokerClientMessage;
      if (data.type === "poker_join" && typeof data.playerId === "string") {
        return {
          ...data,
          isNormieHolder: Boolean(data.isNormieHolder),
          selectedNormieId: typeof data.selectedNormieId === "number" ? data.selectedNormieId : null,
          avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl.slice(0, 240) : null
        };
      }
      if (data.type === "poker_ready" && typeof data.playerId === "string") return data;
      return null;
    } catch {
      return null;
    }
  }

  private handlePokerMessage(data: PokerClientMessage, connection: PartyConnection) {
    if (data.type === "poker_join") {
      this.joinPoker(data, connection);
      return;
    }

    if (data.type === "poker_ready") {
      this.togglePokerReady(data.playerId);
    }
  }

  private joinPoker(data: Extract<PokerClientMessage, { type: "poker_join" }>, connection: PartyConnection) {
    const existing = this.pokerState.players.find((player) => player.id === data.playerId);

    if (existing) {
      existing.connected = true;
      existing.name = cleanPlayerName(data.name);
      existing.isNormieHolder = data.isNormieHolder;
      existing.selectedNormieId = data.selectedNormieId;
      existing.avatarUrl = data.avatarUrl;
      this.pokerConnections.set(connection.id, existing.id);
      this.pokerConnectionObjects.set(connection.id, connection);
    } else {
      this.pokerState.players = this.pokerState.players.filter((player) => player.connected);
      const occupiedSeats = new Set(this.pokerState.players.map((player) => player.seat));
      const seat = Array.from({ length: this.pokerState.maxPlayers }, (_, index) => index).find((index) => !occupiedSeats.has(index));

      if (seat === undefined) {
        connection.send(JSON.stringify({ type: "full", message: "This DNA Poker table is full. Create a new room or join another invite." }));
        return;
      }

      this.pokerState.players.push({
        id: data.playerId,
        name: cleanPlayerName(data.name),
        seat,
        connected: true,
        ready: false,
        hand: [],
        isNormieHolder: data.isNormieHolder,
        selectedNormieId: data.selectedNormieId,
        avatarUrl: data.avatarUrl
      });
      this.pokerConnections.set(connection.id, data.playerId);
      this.pokerConnectionObjects.set(connection.id, connection);
    }

    this.pokerState.players.sort((a, b) => a.seat - b.seat);
    this.updatePokerPhase();
    this.pokerState.message = "Table joined. Toggle ready when you want to start.";
    this.broadcastPoker();
  }

  private togglePokerReady(playerId: string) {
    const player = this.pokerState.players.find((item) => item.id === playerId && item.connected);
    if (!player) return;
    if (this.pokerState.phase === "dealt") return;

    player.ready = !player.ready;
    this.updatePokerPhase();
    this.pokerState.message = player.ready ? `${player.name} is ready.` : `${player.name} is no longer ready.`;
    this.broadcastPoker();
  }

  private updatePokerPhase() {
    const connectedPlayers = this.pokerState.players.filter((player) => player.connected);
    if (this.pokerState.phase === "dealt") return;

    const allReady = connectedPlayers.length >= 2 && connectedPlayers.every((player) => player.ready);
    this.pokerState.phase = allReady ? "ready" : "waiting";

    if (allReady) {
      this.dealPokerHands();
    }
  }

  private dealPokerHands() {
    const seatedPlayers = this.pokerState.players.filter((player) => player.connected);
    const requiredCards = seatedPlayers.length * 5;
    const deck = this.createNormieDeck(requiredCards);

    seatedPlayers.forEach((player, playerIndex) => {
      player.hand = deck.slice(playerIndex * 5, playerIndex * 5 + 5);
    });

    this.pokerState.phase = "dealt";
    this.pokerState.handId = `poker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.pokerState.message = `Server dealt 5 private Normie cards to ${seatedPlayers.length} players. Private reveal arrives in Step 3.`;
  }

  private createNormieDeck(count: number) {
    const ids = new Set<number>();
    while (ids.size < count) {
      ids.add(Math.floor(Math.random() * 10_000));
    }
    return [...ids];
  }

  private parseMessage(message: string): ClientMessage | null {
    try {
      const data = JSON.parse(message) as ClientMessage;
      if (
        data.type === "join" &&
        typeof data.playerId === "string" &&
        typeof data.privyToken === "string" &&
        typeof data.bet === "number"
      ) {
        return {
          ...data,
          bet: Math.max(1, Math.round(data.bet)),
          isNormieHolder: Boolean(data.isNormieHolder),
          selectedNormieId: typeof data.selectedNormieId === "number" ? data.selectedNormieId : null,
          avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl.slice(0, 240) : null
        };
      }
      if (data.type === "pick" && typeof data.playerId === "string" && picks.includes(data.pick)) return data;
      if (data.type === "reset" && typeof data.playerId === "string") return data;
      return null;
    } catch {
      return null;
    }
  }

  private async join(data: Extract<ClientMessage, { type: "join" }>, connection: PartyConnection) {
    const existing = this.state.players.find((player) => player.id === data.playerId);

    if (existing) {
      this.clearStaleCleanup(existing.id);
      existing.connected = true;
      existing.name = cleanPlayerName(data.name);
      existing.privyToken = data.privyToken;
      existing.isNormieHolder = data.isNormieHolder;
      existing.selectedNormieId = data.selectedNormieId;
      existing.avatarUrl = data.avatarUrl;
      this.connections.set(connection.id, existing.id);
    } else {
      const openSeat = this.state.players.find((player) => !player.connected)?.seat;
      const seat = openSeat ?? (this.state.players.length === 0 ? 0 : this.state.players.length === 1 ? 1 : null);

      if (seat === null) {
        connection.send(JSON.stringify({ type: "full", message: "This RPS arena is full. Create a new room or ask your friend for a fresh invite." }));
        return;
      }

      this.state.players = this.state.players.filter((player) => player.connected);
      const player: Player = {
        id: data.playerId,
        name: cleanPlayerName(data.name),
        seat,
        score: 0,
        connected: true,
        isNormieHolder: data.isNormieHolder,
        selectedNormieId: data.selectedNormieId,
        avatarUrl: data.avatarUrl,
        bet: data.bet,
        privyToken: data.privyToken,
        reserved: false
      };
      this.state.players.push(player);
      this.connections.set(connection.id, player.id);
    }

    const player = this.state.players.find((item) => item.id === data.playerId);
    if (player && !player.reserved) {
      const reserved = await this.reserveWager(player);
      if (!reserved.ok) {
        this.state.players = this.state.players.filter((item) => item.id !== player.id);
        this.connections.delete(connection.id);
        connection.send(JSON.stringify({ type: "full", message: reserved.error }));
        this.broadcast();
        return;
      }
    }

    this.state.players.sort((a, b) => a.seat - b.seat);

    if (this.state.players.filter((player) => player.connected).length === 2) {
      this.state.phase = "playing";
      this.state.message = "Both challengers seated. Submit your type.";
    } else {
      this.state.phase = "waiting";
      this.state.message = "Waiting for a second challenger.";
    }

    this.broadcast();
  }

  private pick(data: Extract<ClientMessage, { type: "pick" }>) {
    if (this.state.phase !== "playing") return;

    const player = this.state.players.find((item) => item.id === data.playerId && item.connected);
    if (!player || player.pick) return;

    player.pick = data.pick;
    this.state.message = this.state.players.every((item) => item.pick) ? "Both moves locked. Revealing..." : `${player.name} locked a move.`;
    this.broadcast();

    if (this.state.players.length === 2 && this.state.players.every((item) => item.pick)) {
      this.revealTimer = setTimeout(() => this.revealRound(), 3000);
    }
  }

  private revealRound() {
    const [playerA, playerB] = this.state.players;
    if (!playerA?.pick || !playerB?.pick) return;

    const winner = rpsWinner(playerA.pick, playerB.pick);
    if (winner === "playerA") playerA.score += 1;
    if (winner === "playerB") playerB.score += 1;

    this.state.history.push({
      round: this.state.round,
      playerA: playerA.pick,
      playerB: playerB.pick,
      winner,
      scoreA: playerA.score,
      scoreB: playerB.score
    });

    this.state.phase = "revealed";
    this.state.reveal = { playerA: playerA.pick, playerB: playerB.pick, winner };
    this.state.message =
      winner === "draw"
        ? `Draw round: ${playerA.pick} mirrored ${playerB.pick}.`
        : `${winner === "playerA" ? playerA.name : playerB.name} takes the round.`;
    this.broadcast();

    const matchWinner = this.state.players.find((player) => player.score >= 2);
    if (matchWinner) {
      this.state.phase = "finished";
      this.state.winnerId = matchWinner.id;
      this.state.message = `${matchWinner.name} wins the match.`;
      this.clearPicks();
      this.broadcast();
      void this.settleMatch(matchWinner.id);
      return;
    }

    setTimeout(() => {
      this.state.phase = "playing";
      this.state.round += 1;
      this.state.reveal = undefined;
      this.state.message = `Round ${this.state.round}. Submit your next type.`;
      this.clearPicks();
      this.broadcast();
    }, 1800);
  }

  private async reset(playerId: string) {
    if (this.state.phase !== "finished") return;
    if (!this.state.players.some((player) => player.id === playerId)) return;

    if (this.revealTimer) {
      clearTimeout(this.revealTimer);
      this.revealTimer = undefined;
    }
    this.matchId = this.createMatchId();
    this.state.players = this.state.players.map((player) => ({
      ...player,
      score: 0,
      pick: undefined,
      reserved: false,
      accountError: undefined
    }));
    await Promise.all(this.state.players.filter((player) => player.connected).map((player) => this.reserveWager(player)));
    const readyPlayers = this.state.players.filter((player) => player.connected && player.reserved);
    this.state.phase = readyPlayers.length === 2 ? "playing" : "waiting";
    this.state.round = 1;
    this.state.history = [];
    this.state.reveal = undefined;
    this.state.winnerId = undefined;
    this.state.message = this.state.phase === "playing" ? "Rematch ready. Submit your type." : "Waiting for a second challenger.";
    this.broadcast();
  }

  private clearPicks() {
    this.state.players.forEach((player) => {
      player.pick = undefined;
    });
  }

  private scheduleStaleCleanup(playerId: string) {
    this.clearStaleCleanup(playerId);
    const timer = setTimeout(() => {
      void this.cleanupStalePlayer(playerId);
    }, 60_000);
    this.staleTimers.set(playerId, timer);
  }

  private clearStaleCleanup(playerId: string) {
    const timer = this.staleTimers.get(playerId);
    if (timer) clearTimeout(timer);
    this.staleTimers.delete(playerId);
  }

  private async cleanupStalePlayer(playerId: string) {
    const stalePlayer = this.state.players.find((player) => player.id === playerId);
    if (!stalePlayer || stalePlayer.connected) return;

    const matchInterrupted = this.state.phase === "playing" || this.state.phase === "revealed";
    const playersToRefund = matchInterrupted ? this.state.players.filter((player) => player.reserved) : [stalePlayer].filter((player) => player.reserved);
    await Promise.all(playersToRefund.map((player) => this.refundWager(player)));

    this.state.players = this.state.players
      .filter((player) => player.connected)
      .map((player) => ({
        ...player,
        score: matchInterrupted ? 0 : player.score,
        pick: undefined,
        reserved: matchInterrupted ? false : player.reserved
      }));
    if (matchInterrupted) {
      this.matchId = this.createMatchId();
    }
    this.state.phase = this.state.players.length >= 2 ? "playing" : "waiting";
    this.state.round = matchInterrupted ? 1 : this.state.round;
    this.state.history = matchInterrupted ? [] : this.state.history;
    this.state.reveal = undefined;
    this.state.winnerId = undefined;
    this.state.message = matchInterrupted
      ? "Disconnected player timed out. Match was voided and wagers were refunded."
      : "Disconnected player timed out. Seat reopened.";
    this.clearStaleCleanup(playerId);
    this.broadcast();
  }

  private publicState() {
    return {
      ...this.state,
      players: this.state.players.map((player) => ({
        ...player,
        privyToken: undefined,
        pick: player.pick ? "Locked" : undefined
      }))
    };
  }

  private publicPokerState(playerId?: string) {
    const privatePlayer = playerId ? this.pokerState.players.find((player) => player.id === playerId) : undefined;

    return {
      ...this.pokerState,
      privateHand: privatePlayer?.hand,
      players: this.pokerState.players.map((player) => ({
        ...player,
        hand: undefined,
        handCount: player.hand?.length ?? 0
      }))
    };
  }

  private broadcast() {
    this.room.broadcast(JSON.stringify({ type: "state", state: this.publicState() }));
  }

  private broadcastPoker() {
    this.room.broadcast(JSON.stringify({ type: "poker_state", state: this.publicPokerState() }));
    this.pokerConnectionObjects.forEach((connection, connectionId) => {
      const playerId = this.pokerConnections.get(connectionId);
      if (!playerId) return;
      connection.send(JSON.stringify({ type: "poker_state", state: this.publicPokerState(playerId) }));
    });
  }

  private isPokerRoom() {
    return (this.room.id ?? "").startsWith("poker-");
  }

  private createMatchId() {
    return `rps-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private apiBaseUrl() {
    const value = this.room.env?.PARTYKIT_API_BASE_URL;
    return typeof value === "string" ? value : "http://localhost:3000";
  }

  private internalSecret() {
    const value = this.room.env?.PARTYKIT_INTERNAL_SECRET;
    return typeof value === "string" ? value : "dev-internal-secret";
  }

  private async reserveWager(player: Player) {
    try {
      const response = await fetch(`${this.apiBaseUrl()}/api/pvp/rps/reserve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-partykit-secret": this.internalSecret()
        },
        body: JSON.stringify({
          matchId: this.matchId,
          roomId: this.room.id ?? "rps-room",
          playerId: player.id,
          privyToken: player.privyToken,
          bet: player.bet
        })
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; balance?: number };

      if (!response.ok || !data.ok) {
        player.accountError = data.error ?? "Could not reserve chips.";
        return { ok: false as const, error: player.accountError };
      }

      player.reserved = true;
      player.serverBalance = data.balance;
      player.accountError = undefined;
      return { ok: true as const };
    } catch {
      player.accountError = "Chip reserve service unavailable.";
      return { ok: false as const, error: player.accountError };
    }
  }

  private async settleMatch(winnerId: string) {
    const score = `${this.state.players[0]?.score ?? 0}-${this.state.players[1]?.score ?? 0}`;

    await Promise.all(
      this.state.players.map(async (player) => {
        if (!player.reserved) return;

        try {
          const response = await fetch(`${this.apiBaseUrl()}/api/pvp/rps/settle`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-partykit-secret": this.internalSecret()
            },
            body: JSON.stringify({
              matchId: this.matchId,
              roomId: this.room.id ?? "rps-room",
              playerId: player.id,
              privyToken: player.privyToken,
              bet: player.bet,
              outcome: player.id === winnerId ? "WIN" : "LOSS",
              score
            })
          });
          const data = (await response.json()) as { ok?: boolean; balance?: number; error?: string };
          if (!response.ok || !data.ok) {
            player.accountError = data.error ?? "Could not settle chips.";
            return;
          }
          player.serverBalance = data.balance;
          player.accountError = undefined;
        } catch {
          player.accountError = "Chip settle service unavailable.";
        }
      })
    );

    this.broadcast();
  }

  private async refundWager(player: Player) {
    try {
      const response = await fetch(`${this.apiBaseUrl()}/api/pvp/rps/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-partykit-secret": this.internalSecret()
        },
        body: JSON.stringify({
          matchId: this.matchId,
          roomId: this.room.id ?? "rps-room",
          playerId: player.id,
          privyToken: player.privyToken,
          bet: player.bet
        })
      });
      const data = (await response.json()) as { ok?: boolean; balance?: number; error?: string };
      if (!response.ok || !data.ok) {
        player.accountError = data.error ?? "Could not refund chips.";
        return;
      }

      player.serverBalance = data.balance;
      player.reserved = false;
      player.accountError = undefined;
    } catch {
      player.accountError = "Chip refund service unavailable.";
    }
  }
}

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
  private revealTimer?: ReturnType<typeof setTimeout>;
  private matchId = this.createMatchId();
  private state: MatchState = {
    phase: "waiting",
    players: [],
    round: 1,
    history: [],
    message: "Waiting for a second challenger."
  };

  constructor(readonly room: PartyRoom) {}

  onConnect(connection: PartyConnection) {
    connection.send(JSON.stringify({ type: "state", state: this.publicState() }));
  }

  async onClose(connection: PartyConnection) {
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
      this.broadcast();
    }
  }

  async onMessage(message: string, connection: PartyConnection) {
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
        connection.send(JSON.stringify({ type: "full", message: "This RPS arena already has two challengers." }));
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

  private broadcast() {
    this.room.broadcast(JSON.stringify({ type: "state", state: this.publicState() }));
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

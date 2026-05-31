type RPSType = "Human" | "Cat" | "Alien";
type Phase = "waiting" | "playing" | "revealed" | "finished";
type PartyConnection = {
  id: string;
  send(message: string): void;
};
type PartyRoom = {
  broadcast(message: string): void;
};

type Player = {
  id: string;
  name: string;
  seat: 0 | 1;
  score: number;
  connected: boolean;
  pick?: RPSType;
};

type RoundReveal = {
  playerA: RPSType;
  playerB: RPSType;
  winner: "playerA" | "playerB" | "draw";
};

type MatchState = {
  phase: Phase;
  players: Player[];
  round: number;
  reveal?: RoundReveal;
  winnerId?: string;
  message: string;
};

type ClientMessage =
  | { type: "join"; playerId: string; name?: string }
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
  private state: MatchState = {
    phase: "waiting",
    players: [],
    round: 1,
    message: "Waiting for a second challenger."
  };

  constructor(readonly room: PartyRoom) {}

  onConnect(connection: PartyConnection) {
    connection.send(JSON.stringify({ type: "state", state: this.publicState() }));
  }

  onClose(connection: PartyConnection) {
    const playerId = this.connections.get(connection.id);
    if (!playerId) return;

    this.connections.delete(connection.id);
    const player = this.state.players.find((item) => item.id === playerId);
    if (player) {
      player.connected = false;
      player.pick = undefined;
      this.state.message = `${player.name} disconnected. Waiting for players.`;
      this.state.phase = this.state.players.filter((item) => item.connected).length >= 2 ? this.state.phase : "waiting";
      this.broadcast();
    }
  }

  onMessage(message: string, connection: PartyConnection) {
    const data = this.parseMessage(message);
    if (!data) return;

    if (data.type === "join") {
      this.join(data, connection);
      return;
    }

    if (data.type === "pick") {
      this.pick(data);
      return;
    }

    if (data.type === "reset") {
      this.reset(data.playerId);
    }
  }

  private parseMessage(message: string): ClientMessage | null {
    try {
      const data = JSON.parse(message) as ClientMessage;
      if (data.type === "join" && typeof data.playerId === "string") return data;
      if (data.type === "pick" && typeof data.playerId === "string" && picks.includes(data.pick)) return data;
      if (data.type === "reset" && typeof data.playerId === "string") return data;
      return null;
    } catch {
      return null;
    }
  }

  private join(data: Extract<ClientMessage, { type: "join" }>, connection: PartyConnection) {
    const existing = this.state.players.find((player) => player.id === data.playerId);

    if (existing) {
      existing.connected = true;
      existing.name = cleanPlayerName(data.name);
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
        connected: true
      };
      this.state.players.push(player);
      this.connections.set(connection.id, player.id);
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
      this.revealRound();
    }
  }

  private revealRound() {
    const [playerA, playerB] = this.state.players;
    if (!playerA?.pick || !playerB?.pick) return;

    const winner = rpsWinner(playerA.pick, playerB.pick);
    if (winner === "playerA") playerA.score += 1;
    if (winner === "playerB") playerB.score += 1;

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

  private reset(playerId: string) {
    if (this.state.phase !== "finished") return;
    if (!this.state.players.some((player) => player.id === playerId)) return;

    this.state.players = this.state.players.map((player) => ({ ...player, score: 0, pick: undefined }));
    this.state.phase = this.state.players.filter((player) => player.connected).length === 2 ? "playing" : "waiting";
    this.state.round = 1;
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
        pick: player.pick ? "Locked" : undefined
      }))
    };
  }

  private broadcast() {
    this.room.broadcast(JSON.stringify({ type: "state", state: this.publicState() }));
  }
}

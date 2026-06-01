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
  ante: number;
  privyToken: string;
  reserved: boolean;
  serverBalance?: number;
  accountError?: string;
  committed?: number;
  folded?: boolean;
  acted?: boolean;
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
};

type PokerState = {
  phase: "waiting" | "ready" | "dealt" | "betting" | "showdown";
  players: PokerPlayer[];
  maxPlayers: number;
  round: number;
  pot: number;
  currentBet: number;
  minRaise: number;
  turnPlayerId?: string;
  handId?: string;
  history: Array<{
    round: number;
    handId: string;
    winners: string[];
    winnerNames: string[];
    pot: number;
    payoutEach: number;
    summary: string;
  }>;
  showdown?: PokerShowdown;
  message: string;
};

type NormieTraits = {
  Type?: string;
  Gender?: string;
  Age?: string;
  Expression?: string;
  Eyes?: string;
  Accessory?: string;
  "Facial Feature"?: string;
};

type PokerEvaluation = {
  handName: string;
  score: number;
  summary: string;
};

type PokerShowdown = {
  winners: string[];
  pot: number;
  payoutEach: number;
  hands: Array<{
    playerId: string;
    playerName: string;
    cards: number[];
    handName: string;
    score: number;
    summary: string;
  }>;
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
      privyToken: string;
      ante: number;
      isNormieHolder?: boolean;
      selectedNormieId?: number | null;
      avatarUrl?: string | null;
    }
  | { type: "poker_ready"; playerId: string };
// Keep poker messages small and explicit; later action phases can extend this union.
type PokerNextHandMessage = { type: "poker_next_hand"; playerId: string };
type PokerActionMessage = { type: "poker_action"; playerId: string; action: "check" | "call" | "raise" | "fold"; raiseTo?: number };
type PokerAnyClientMessage = PokerClientMessage | PokerNextHandMessage | PokerActionMessage;

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
  private pokerStaleTimers = new Map<string, ReturnType<typeof setTimeout>>();
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
    pot: 0,
    currentBet: 0,
    minRaise: 50,
    history: [],
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
        this.schedulePokerStaleCleanup(pokerPlayer.id);
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

  private parsePokerMessage(message: string): PokerAnyClientMessage | null {
    try {
      const data = JSON.parse(message) as PokerClientMessage;
      if (
        data.type === "poker_join" &&
        typeof data.playerId === "string" &&
        typeof data.privyToken === "string" &&
        typeof data.ante === "number"
      ) {
        return {
          ...data,
          ante: Math.max(1, Math.round(data.ante)),
          isNormieHolder: Boolean(data.isNormieHolder),
          selectedNormieId: typeof data.selectedNormieId === "number" ? data.selectedNormieId : null,
          avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl.slice(0, 240) : null
        };
      }
      if (data.type === "poker_ready" && typeof data.playerId === "string") return data;
      const maybeNextHand = data as unknown as PokerNextHandMessage;
      if (maybeNextHand.type === "poker_next_hand" && typeof maybeNextHand.playerId === "string") {
        return maybeNextHand;
      }
      const maybeAction = data as unknown as PokerActionMessage;
      if (
        maybeAction.type === "poker_action" &&
        typeof maybeAction.playerId === "string" &&
        ["check", "call", "raise", "fold"].includes(maybeAction.action)
      ) {
        return {
          ...maybeAction,
          raiseTo: typeof maybeAction.raiseTo === "number" ? Math.max(0, Math.round(maybeAction.raiseTo)) : undefined
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private handlePokerMessage(data: PokerAnyClientMessage, connection: PartyConnection) {
    if (data.type === "poker_join") {
      this.joinPoker(data, connection);
      return;
    }

    if (data.type === "poker_ready") {
      this.togglePokerReady(data.playerId);
      return;
    }

    if ((data as PokerNextHandMessage).type === "poker_next_hand") {
      this.nextPokerHand((data as PokerNextHandMessage).playerId);
      return;
    }

    if ((data as PokerActionMessage).type === "poker_action") {
      void this.handlePokerAction(data as PokerActionMessage);
    }
  }

  private joinPoker(data: Extract<PokerClientMessage, { type: "poker_join" }>, connection: PartyConnection) {
    const existing = this.pokerState.players.find((player) => player.id === data.playerId);

    if (existing) {
      this.clearPokerStaleCleanup(existing.id);
      existing.connected = true;
      existing.name = cleanPlayerName(data.name);
      existing.privyToken = data.privyToken;
      existing.ante = data.ante;
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
        ante: data.ante,
        privyToken: data.privyToken,
        reserved: false,
        committed: 0,
        folded: false,
        acted: false,
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
    if (this.pokerState.phase === "dealt" || this.pokerState.phase === "betting" || this.pokerState.phase === "showdown") return;

    player.ready = !player.ready;
    this.updatePokerPhase();
    this.pokerState.message = player.ready ? `${player.name} is ready.` : `${player.name} is no longer ready.`;
    this.broadcastPoker();
  }

  private updatePokerPhase() {
    const connectedPlayers = this.pokerState.players.filter((player) => player.connected);
    if (this.pokerState.phase === "dealt" || this.pokerState.phase === "betting" || this.pokerState.phase === "showdown") return;

    const allReady = connectedPlayers.length >= 2 && connectedPlayers.every((player) => player.ready);
    this.pokerState.phase = allReady ? "ready" : "waiting";

    if (allReady) {
      void this.startPokerShowdown();
    }
  }

  private schedulePokerStaleCleanup(playerId: string) {
    this.clearPokerStaleCleanup(playerId);
    const timer = setTimeout(() => {
      void this.cleanupStalePokerPlayer(playerId);
    }, 60_000);
    this.pokerStaleTimers.set(playerId, timer);
  }

  private clearPokerStaleCleanup(playerId: string) {
    const timer = this.pokerStaleTimers.get(playerId);
    if (timer) clearTimeout(timer);
    this.pokerStaleTimers.delete(playerId);
  }

  private async cleanupStalePokerPlayer(playerId: string) {
    const stalePlayer = this.pokerState.players.find((player) => player.id === playerId);
    if (!stalePlayer || stalePlayer.connected) return;

    const activeRound = this.pokerState.phase === "ready" || this.pokerState.phase === "dealt" || this.pokerState.phase === "betting";
    if (activeRound) {
      await Promise.all(this.pokerState.players.filter((player) => player.reserved).map((player) => this.refundPokerAnte(player)));
      this.pokerState.players = this.pokerState.players
        .filter((player) => player.connected)
        .map((player) => ({
          ...player,
          ready: false,
          hand: [],
          reserved: false,
          committed: 0,
          folded: false,
          acted: false,
          accountError: undefined
        }));
      this.pokerState.phase = "waiting";
      this.pokerState.round += 1;
      this.pokerState.pot = 0;
      this.pokerState.currentBet = 0;
      this.pokerState.turnPlayerId = undefined;
      this.pokerState.handId = undefined;
      this.pokerState.showdown = undefined;
      this.pokerState.message = "Disconnected player timed out. Poker hand was voided and reserved antes were refunded.";
    } else {
      if (stalePlayer.reserved) {
        await this.refundPokerAnte(stalePlayer);
      }
      this.pokerState.players = this.pokerState.players.filter((player) => player.connected);
      this.pokerState.message = "Disconnected poker player timed out. Seat reopened.";
      this.updatePokerPhase();
    }

    this.clearPokerStaleCleanup(playerId);
    this.broadcastPoker();
  }

  private async startPokerShowdown() {
    if (this.pokerState.phase === "dealt" || this.pokerState.phase === "betting" || this.pokerState.phase === "showdown") return;
    const seatedPlayers = this.pokerState.players.filter((player) => player.connected);
    this.pokerState.phase = "ready";
    this.pokerState.handId = this.createPokerMatchId();
    this.pokerState.message = "Reserving antes...";
    this.broadcastPoker();

    const reserved = await Promise.all(seatedPlayers.map((player) => this.reservePokerAnte(player)));
    if (reserved.some((result) => !result.ok)) {
      this.pokerState.players.forEach((player) => {
        if (player.accountError) player.ready = false;
      });
      this.pokerState.phase = "waiting";
      this.pokerState.message = "Poker table rejected one or more antes. Check chip balances.";
      this.broadcastPoker();
      return;
    }

    const requiredCards = seatedPlayers.length * 5;
    const deck = this.createNormieDeck(requiredCards);

    seatedPlayers.forEach((player, playerIndex) => {
      player.hand = deck.slice(playerIndex * 5, playerIndex * 5 + 5);
      player.committed = player.ante;
      player.folded = false;
      player.acted = false;
    });

    this.pokerState.phase = "betting";
    this.pokerState.pot = seatedPlayers.reduce((total, player) => total + player.ante, 0);
    this.pokerState.currentBet = seatedPlayers[0]?.ante ?? 0;
    this.pokerState.turnPlayerId = this.nextActivePokerPlayerId();
    this.pokerState.message = "Private hands dealt. Betting round is open.";
    this.broadcastPoker();
  }

  private activePokerPlayers() {
    return this.pokerState.players.filter((player) => player.connected && !player.folded);
  }

  private nextActivePokerPlayerId(afterPlayerId?: string) {
    const active = this.activePokerPlayers().sort((a, b) => a.seat - b.seat);
    if (!active.length) return undefined;
    if (!afterPlayerId) return active[0]?.id;
    const currentIndex = active.findIndex((player) => player.id === afterPlayerId);
    return active[(currentIndex + 1) % active.length]?.id;
  }

  private async handlePokerAction(data: PokerActionMessage) {
    if (this.pokerState.phase !== "betting" || this.pokerState.turnPlayerId !== data.playerId) return;
    const player = this.pokerState.players.find((item) => item.id === data.playerId && item.connected && !item.folded);
    if (!player) return;

    if (data.action === "fold") {
      player.folded = true;
      player.acted = true;
      this.pokerState.message = `${player.name} folded.`;
      if (this.activePokerPlayers().length === 1) {
        await this.finishPokerShowdown();
        return;
      }
      this.advancePokerTurn(player.id);
      return;
    }

    const committed = player.committed ?? 0;
    const callAmount = Math.max(0, this.pokerState.currentBet - committed);

    if (data.action === "check") {
      if (callAmount > 0) return;
      player.acted = true;
      this.pokerState.message = `${player.name} checked.`;
      this.advancePokerTurn(player.id);
      return;
    }

    if (data.action === "call") {
      if (callAmount > 0) {
        const reserved = await this.reservePokerExtraWager(player, callAmount);
        if (!reserved.ok) {
          this.broadcastPoker();
          return;
        }
        player.committed = committed + callAmount;
        this.pokerState.pot += callAmount;
      }
      player.acted = true;
      this.pokerState.message = `${player.name} called.`;
      this.advancePokerTurn(player.id);
      return;
    }

    if (data.action === "raise") {
      const raiseTo = data.raiseTo ?? this.pokerState.currentBet + this.pokerState.minRaise;
      if (raiseTo < this.pokerState.currentBet + this.pokerState.minRaise) return;
      const extra = raiseTo - committed;
      const reserved = await this.reservePokerExtraWager(player, extra);
      if (!reserved.ok) {
        this.broadcastPoker();
        return;
      }
      player.committed = raiseTo;
      player.acted = true;
      this.pokerState.currentBet = raiseTo;
      this.pokerState.pot += extra;
      this.pokerState.players.forEach((item) => {
        if (item.id !== player.id && item.connected && !item.folded) item.acted = false;
      });
      this.pokerState.message = `${player.name} raised to ${raiseTo}.`;
      this.advancePokerTurn(player.id);
    }
  }

  private advancePokerTurn(previousPlayerId: string) {
    if (this.isPokerBettingComplete()) {
      void this.finishPokerShowdown();
      return;
    }
    this.pokerState.turnPlayerId = this.nextActivePokerPlayerId(previousPlayerId);
    this.broadcastPoker();
  }

  private isPokerBettingComplete() {
    const active = this.activePokerPlayers();
    return active.length <= 1 || active.every((player) => player.acted && (player.committed ?? 0) >= this.pokerState.currentBet);
  }

  private async finishPokerShowdown() {
    const showdown = await this.evaluatePokerShowdown(this.activePokerPlayers());
    this.pokerState.phase = "showdown";
    this.pokerState.turnPlayerId = undefined;
    this.pokerState.showdown = showdown;
    this.pokerState.history = [
      {
        round: this.pokerState.round,
        handId: this.pokerState.handId ?? "poker-hand",
        winners: showdown.winners,
        winnerNames: showdown.hands.filter((hand) => showdown.winners.includes(hand.playerId)).map((hand) => hand.playerName),
        pot: showdown.pot,
        payoutEach: showdown.payoutEach,
        summary: this.pokerHistorySummary(showdown)
      },
      ...this.pokerState.history
    ].slice(0, 8);
    this.pokerState.message =
      showdown.winners.length === 1
        ? `${showdown.hands.find((hand) => hand.playerId === showdown.winners[0])?.playerName ?? "Winner"} wins ${showdown.pot} chips.`
        : `Split pot: ${showdown.winners.length} players receive ${showdown.payoutEach} chips.`;
    this.broadcastPoker();
    void this.settlePokerShowdown(showdown);
  }

  private nextPokerHand(playerId: string) {
    if (this.pokerState.phase !== "showdown") return;
    if (!this.pokerState.players.some((player) => player.id === playerId && player.connected)) return;

    this.pokerState.round += 1;
    this.pokerState.phase = "waiting";
    this.pokerState.pot = 0;
    this.pokerState.currentBet = 0;
    this.pokerState.turnPlayerId = undefined;
    this.pokerState.handId = undefined;
    this.pokerState.showdown = undefined;
    this.pokerState.players = this.pokerState.players
      .filter((player) => player.connected)
      .map((player) => ({
        ...player,
        ready: false,
        hand: [],
        reserved: false,
        committed: 0,
        folded: false,
        acted: false,
        accountError: undefined
      }));
    this.pokerState.message = "Next hand ready. Players can adjust ante and ready up.";
    this.broadcastPoker();
  }

  private pokerHistorySummary(showdown: PokerShowdown) {
    const winningHands = showdown.hands.filter((hand) => showdown.winners.includes(hand.playerId));
    const handName = winningHands[0]?.handName ?? "Unknown Hand";
    const names = winningHands.map((hand) => hand.playerName).join(" / ");
    return `${names} won with ${handName}.`;
  }

  private createNormieDeck(count: number) {
    const ids = new Set<number>();
    while (ids.size < count) {
      ids.add(Math.floor(Math.random() * 10_000));
    }
    return [...ids];
  }

  private async fetchNormieTraits(id: number): Promise<NormieTraits> {
    try {
      const response = await fetch(`https://api.normies.art/normie/${id}/traits`, {
        headers: { accept: "application/json" }
      });
      if (!response.ok) return {};
      return (await response.json()) as NormieTraits;
    } catch {
      return {};
    }
  }

  private countValues(values: Array<string | undefined>) {
    return values.reduce<Record<string, number>>((counts, value) => {
      const key = value ?? "Unknown";
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
  }

  private hasCount(counts: Record<string, number>, target: number) {
    return Object.values(counts).some((count) => count >= target);
  }

  private matchingValue(counts: Record<string, number>, target: number) {
    return Object.entries(counts).find(([, count]) => count >= target)?.[0] ?? "Unknown";
  }

  private allSame(values: Array<string | undefined>) {
    const known = values.map((value) => value ?? "Unknown");
    return known.every((value) => value === known[0]);
  }

  private evaluatePokerHand(traits: NormieTraits[]): PokerEvaluation {
    const expressions = traits.map((trait) => trait.Expression);
    const eyes = traits.map((trait) => trait.Eyes);
    const accessories = traits.map((trait) => trait.Accessory);
    const facialFeatures = traits.map((trait) => trait["Facial Feature"]);
    const genders = traits.map((trait) => trait.Gender);
    const ages = traits.map((trait) => trait.Age);
    const expressionCounts = this.countValues(expressions);
    const eyeCounts = this.countValues(eyes);
    const accessoryCounts = this.countValues(accessories);
    const facialFeatureCounts = this.countValues(facialFeatures);
    const eyePerfect = this.hasCount(eyeCounts, 4);
    const accessoryPerfect = this.hasCount(accessoryCounts, 4);
    const facialFeaturePerfect = this.hasCount(facialFeatureCounts, 4);
    const accessoryTriple = this.hasCount(accessoryCounts, 3);
    const eyeTriple = this.hasCount(eyeCounts, 3);
    const expressionPair = this.hasCount(expressionCounts, 2);
    const genderFlush = this.allSame(genders);
    const ageFlush = this.allSame(ages);

    if (eyePerfect || accessoryPerfect || facialFeaturePerfect) {
      return {
        handName: "Perfect DNA",
        score: 60,
        summary: `Four or more cards match ${
          eyePerfect
            ? `Eyes ${this.matchingValue(eyeCounts, 4)}`
            : accessoryPerfect
            ? `Accessory ${this.matchingValue(accessoryCounts, 4)}`
            : `Facial Feature ${this.matchingValue(facialFeatureCounts, 4)}`
        }.`
      };
    }
    if (expressionPair && accessoryTriple) {
      return { handName: "Accessory Full House", score: 50, summary: "Expression pair plus Accessory triple." };
    }
    if (genderFlush || ageFlush) return { handName: "Age/Gender Flush", score: 40, summary: `All cards share ${genderFlush ? "Gender" : "Age"}.` };
    if (eyeTriple) return { handName: "Eye Trips", score: 30, summary: `Three or more cards share Eyes ${this.matchingValue(eyeCounts, 3)}.` };
    if (expressionPair) return { handName: "Expression Pair", score: 20, summary: "Two or more cards share an Expression." };
    return { handName: "No DNA Hand", score: 10, summary: "No scoring DNA combination." };
  }

  private async evaluatePokerShowdown(players: PokerPlayer[]): Promise<PokerShowdown> {
    const hands = await Promise.all(
      players.map(async (player) => {
        const cards = player.hand ?? [];
        const traits = await Promise.all(cards.map((id) => this.fetchNormieTraits(id)));
        const evaluation = this.evaluatePokerHand(traits);
        return {
          playerId: player.id,
          playerName: player.name,
          cards,
          handName: evaluation.handName,
          score: evaluation.score,
          summary: evaluation.summary
        };
      })
    );
    const bestScore = Math.max(...hands.map((hand) => hand.score));
    const winners = hands.filter((hand) => hand.score === bestScore).map((hand) => hand.playerId);
    const pot = this.pokerState.pot || players.reduce((total, player) => total + (player.committed ?? player.ante), 0);
    const payoutEach = Math.floor(pot / Math.max(1, winners.length));

    return { winners, pot, payoutEach, hands };
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
        privyToken: undefined,
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

  private createPokerMatchId() {
    return `poker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private apiBaseUrl() {
    const value = this.room.env?.PARTYKIT_API_BASE_URL;
    return typeof value === "string" ? value : "http://localhost:3000";
  }

  private internalSecret() {
    const value = this.room.env?.PARTYKIT_INTERNAL_SECRET;
    return typeof value === "string" ? value : "dev-internal-secret";
  }

  private async reservePokerAnte(player: PokerPlayer) {
    try {
      const response = await fetch(`${this.apiBaseUrl()}/api/pvp/poker/reserve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-partykit-secret": this.internalSecret()
        },
        body: JSON.stringify({
          matchId: this.pokerState.handId ?? this.createPokerMatchId(),
          roomId: this.room.id ?? "poker-room",
          playerId: player.id,
          privyToken: player.privyToken,
          ante: player.ante
        })
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; balance?: number };

      if (!response.ok || !data.ok) {
        player.accountError = data.error ?? "Could not reserve poker ante.";
        return { ok: false as const, error: player.accountError };
      }

      player.reserved = true;
      player.serverBalance = data.balance;
      player.accountError = undefined;
      return { ok: true as const };
    } catch {
      player.accountError = "Poker ante service unavailable.";
      return { ok: false as const, error: player.accountError };
    }
  }

  private async reservePokerExtraWager(player: PokerPlayer, amount: number) {
    if (amount <= 0) return { ok: true as const };

    try {
      const response = await fetch(`${this.apiBaseUrl()}/api/pvp/poker/wager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-partykit-secret": this.internalSecret()
        },
        body: JSON.stringify({
          matchId: this.pokerState.handId ?? "poker-hand",
          roomId: this.room.id ?? "poker-room",
          playerId: player.id,
          privyToken: player.privyToken,
          ante: player.ante,
          amount
        })
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; balance?: number };

      if (!response.ok || !data.ok) {
        player.accountError = data.error ?? "Could not reserve poker wager.";
        return { ok: false as const, error: player.accountError };
      }

      player.serverBalance = data.balance;
      player.accountError = undefined;
      return { ok: true as const };
    } catch {
      player.accountError = "Poker wager service unavailable.";
      return { ok: false as const, error: player.accountError };
    }
  }

  private async refundPokerAnte(player: PokerPlayer) {
    if (!player.reserved) return;

    try {
      const response = await fetch(`${this.apiBaseUrl()}/api/pvp/poker/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-partykit-secret": this.internalSecret()
        },
        body: JSON.stringify({
          matchId: this.pokerState.handId ?? "poker-hand",
          roomId: this.room.id ?? "poker-room",
          playerId: player.id,
          privyToken: player.privyToken,
          ante: player.ante
        })
      });
      const data = (await response.json()) as { ok?: boolean; balance?: number; error?: string };
      if (!response.ok || !data.ok) {
        player.accountError = data.error ?? "Could not refund poker ante.";
        return;
      }

      player.serverBalance = data.balance;
      player.reserved = false;
      player.accountError = undefined;
    } catch {
      player.accountError = "Poker refund service unavailable.";
    }
  }

  private async settlePokerShowdown(showdown: PokerShowdown) {
    await Promise.all(
      this.pokerState.players.map(async (player) => {
        if (!player.reserved) return;

        const hand = showdown.hands.find((item) => item.playerId === player.id);
        const won = showdown.winners.includes(player.id);
        const payout = won ? showdown.payoutEach : 0;
        const outcome = won ? (showdown.winners.length > 1 ? "DRAW" : "WIN") : "LOSS";

        try {
          const response = await fetch(`${this.apiBaseUrl()}/api/pvp/poker/settle`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-partykit-secret": this.internalSecret()
            },
            body: JSON.stringify({
              matchId: this.pokerState.handId ?? "poker-hand",
              roomId: this.room.id ?? "poker-room",
              playerId: player.id,
              privyToken: player.privyToken,
              ante: player.ante,
              outcome,
              payout,
              handName: hand?.handName ?? "Unknown Hand",
              score: `${hand?.score ?? 0}`
            })
          });
          const data = (await response.json()) as { ok?: boolean; balance?: number; error?: string };
          if (!response.ok || !data.ok) {
            player.accountError = data.error ?? "Could not settle poker pot.";
            return;
          }
          player.serverBalance = data.balance;
          player.accountError = undefined;
        } catch {
          player.accountError = "Poker settle service unavailable.";
        }
      })
    );

    this.broadcastPoker();
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

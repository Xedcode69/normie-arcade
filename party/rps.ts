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
  stake?: number;
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
  buyIn: number;
  stack: number;
  buyInSessionId?: string;
  privyToken: string;
  reserved: boolean;
  serverBalance?: number;
  accountError?: string;
  committed?: number;
  streetCommitted?: number;
  folded?: boolean;
  acted?: boolean;
  lastAction?: string;
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
};

type PokerState = {
  phase: "waiting" | "ready" | "dealt" | "betting" | "showdown";
  players: PokerPlayer[];
  maxPlayers: number;
  round: number;
  buyIn: number;
  ante: number;
  pot: number;
  currentBet: number;
  minRaise: number;
  turnPlayerId?: string;
  street?: "preflop" | "flop" | "turn" | "river";
  communityCards: number[];
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
  actionLog: Array<{
    id: string;
    round: number;
    street?: string;
    playerName?: string;
    action: string;
    amount?: number;
    message: string;
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
  [key: string]: string | number | boolean | undefined;
};

type RawNormieTraitsResponse =
  | NormieTraits
  | {
      attributes?: Array<{ trait_type?: string; value?: string | number | boolean }>;
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
    bestCards: number[];
    cardTraits: Array<{ id: number; traits: NormieTraits }>;
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

type TcgPlayer = {
  id: string;
  name: string;
  seat: 0 | 1;
  connected: boolean;
  deck: number[];
  hand: number[];
  drafted: number[];
  score: number;
  privyToken: string;
  isNormieHolder?: boolean;
  selectedNormieId?: number | null;
  avatarUrl?: string | null;
  pendingPlay?: { cardId: number; lane: number };
  lastTypeBonus?: number;
  peaceShield?: boolean;
};

type TcgLane = {
  playerA: number[];
  playerB: number[];
};

type TcgReveal = {
  turn: number;
  playerA?: { cardId: number; lane: number; power: number; effects: string[] };
  playerB?: { cardId: number; lane: number; power: number; effects: string[] };
  laneWinner?: "playerA" | "playerB" | "draw";
  message: string;
};

type TcgState = {
  phase: "waiting" | "drafting" | "playing" | "revealed" | "finished";
  players: TcgPlayer[];
  turn: number;
  maxTurns: number;
  lanes: TcgLane[];
  draftPool: number[];
  draftTurnPlayerId?: string;
  draftTarget: number;
  draftDeadlineAt?: number;
  draftPickSeconds?: number;
  reveal?: TcgReveal;
  winnerId?: string;
  history: TcgReveal[];
  message: string;
};

type TcgClientMessage =
  | {
      type: "tcg_join";
      playerId: string;
      name?: string;
      privyToken: string;
      isNormieHolder?: boolean;
      selectedNormieId?: number | null;
      avatarUrl?: string | null;
    }
  | { type: "tcg_draft_pick"; playerId: string; cardId: number }
  | { type: "tcg_play"; playerId: string; cardId: number; lane: number }
  | { type: "tcg_rematch"; playerId: string };

const picks: RPSType[] = ["Human", "Cat", "Alien"];
const rpsQuickMatchStake = 250;
const pokerTableBuyIn = 1000;
const pokerHandAnte = 100;
const tcgDeckSize = 8;
const tcgDraftPoolSize = 16;
const tcgStartingHand = 3;
const tcgMaxTurns = 5;
const tcgDraftPickMs = 20_000;

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
  private tcgConnections = new Map<string, string>();
  private tcgConnectionObjects = new Map<string, PartyConnection>();
  private tcgTraitCache = new Map<number, NormieTraits>();
  private tcgBurnedIds?: Set<number>;
  private tcgScorches: Array<{ seat: 0 | 1; lane: number; turn: number }> = [];
  private tcgDraftTimer?: ReturnType<typeof setTimeout>;
  private staleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pokerStaleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private revealTimer?: ReturnType<typeof setTimeout>;
  private pokerDeck: number[] = [];
  private matchId = this.createMatchId();
  private state: MatchState = {
    phase: "waiting",
    players: [],
    stake: undefined,
    round: 1,
    history: [],
    message: "Waiting for a second challenger."
  };
  private pokerState: PokerState = {
    phase: "waiting",
    players: [],
    maxPlayers: 5,
    round: 1,
    buyIn: pokerTableBuyIn,
    ante: pokerHandAnte,
    pot: 0,
    currentBet: 0,
    minRaise: 50,
    communityCards: [],
    history: [],
    actionLog: [],
    message: "Waiting for players to sit at the DNA Poker table."
  };
  private tcgState: TcgState = {
    phase: "waiting",
    players: [],
    turn: 1,
    maxTurns: tcgMaxTurns,
    lanes: this.emptyTcgLanes(),
    draftPool: [],
    draftTarget: tcgDeckSize,
    draftPickSeconds: tcgDraftPickMs / 1000,
    history: [],
    message: "Waiting for a second challenger."
  };

  constructor(readonly room: PartyRoom) {}

  onConnect(connection: PartyConnection) {
    if (this.isTcgRoom()) {
      connection.send(JSON.stringify({ type: "tcg_state", state: this.publicTcgState() }));
      return;
    }

    if (this.isPokerRoom()) {
      connection.send(JSON.stringify({ type: "poker_state", state: this.publicPokerState() }));
      return;
    }

    connection.send(JSON.stringify({ type: "state", state: this.publicState() }));
  }

  async onClose(connection: PartyConnection) {
    const tcgPlayerId = this.tcgConnections.get(connection.id);
    if (tcgPlayerId) {
      this.tcgConnections.delete(connection.id);
      this.tcgConnectionObjects.delete(connection.id);
      const tcgPlayer = this.tcgState.players.find((player) => player.id === tcgPlayerId);
      if (tcgPlayer) {
        if (this.tcgState.phase === "waiting") {
          this.tcgState.players = this.tcgState.players.filter((player) => player.id !== tcgPlayer.id);
          this.tcgState.message = `${tcgPlayer.name} left the Circuit table.`;
        } else {
          tcgPlayer.connected = false;
          this.tcgState.message = `${tcgPlayer.name} disconnected. Their seat can reconnect.`;
        }
        this.broadcastTcg();
      }
      return;
    }

    const pokerPlayerId = this.pokerConnections.get(connection.id);
    if (pokerPlayerId) {
      this.pokerConnections.delete(connection.id);
      this.pokerConnectionObjects.delete(connection.id);
      const pokerPlayer = this.pokerState.players.find((player) => player.id === pokerPlayerId);
      if (pokerPlayer) {
        const activeRound = this.pokerState.phase === "ready" || this.pokerState.phase === "dealt" || this.pokerState.phase === "betting";
        if (!activeRound) {
          await this.cashOutPokerStack(pokerPlayer);
          this.pokerState.players = this.pokerState.players.filter((player) => player.id !== pokerPlayer.id);
          this.updatePokerPhase();
          this.pokerState.message = `${pokerPlayer.name} left the table. Their remaining stack was cashed out.`;
        } else {
          pokerPlayer.connected = false;
          pokerPlayer.ready = false;
          this.updatePokerPhase();
          this.pokerState.message = `${pokerPlayer.name} disconnected. Their seat is waiting.`;
          this.schedulePokerStaleCleanup(pokerPlayer.id);
        }
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
    const tcgData = this.parseTcgMessage(message);
    if (tcgData) {
      this.handleTcgMessage(tcgData, connection);
      return;
    }

    const pokerData = this.parsePokerMessage(message);
    if (pokerData) {
      await this.handlePokerMessage(pokerData, connection);
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

  private parseTcgMessage(message: string): TcgClientMessage | null {
    try {
      const data = JSON.parse(message) as TcgClientMessage;
      if (data.type === "tcg_join" && typeof data.playerId === "string" && typeof data.privyToken === "string") {
        return {
          ...data,
          isNormieHolder: Boolean(data.isNormieHolder),
          selectedNormieId: typeof data.selectedNormieId === "number" ? data.selectedNormieId : null,
          avatarUrl: typeof data.avatarUrl === "string" ? data.avatarUrl.slice(0, 240) : null
        };
      }
      if (
        data.type === "tcg_play" &&
        typeof data.playerId === "string" &&
        typeof data.cardId === "number" &&
        typeof data.lane === "number"
      ) {
        return {
          ...data,
          lane: Math.max(0, Math.min(2, Math.round(data.lane))),
          cardId: Math.max(0, Math.round(data.cardId))
        };
      }
      if (data.type === "tcg_draft_pick" && typeof data.playerId === "string" && typeof data.cardId === "number") {
        return { ...data, cardId: Math.max(0, Math.round(data.cardId)) };
      }
      if (data.type === "tcg_rematch" && typeof data.playerId === "string") return data;
      return null;
    } catch {
      return null;
    }
  }

  private handleTcgMessage(data: TcgClientMessage, connection: PartyConnection) {
    if (data.type === "tcg_join") {
      this.joinTcg(data, connection);
      return;
    }

    if (data.type === "tcg_play") {
      this.playTcgCard(data);
      return;
    }

    if (data.type === "tcg_draft_pick") {
      this.draftTcgCard(data);
      return;
    }

    if (data.type === "tcg_rematch") {
      this.rematchTcg(data.playerId);
    }
  }

  private joinTcg(data: Extract<TcgClientMessage, { type: "tcg_join" }>, connection: PartyConnection) {
    const existing = this.tcgState.players.find((player) => player.id === data.playerId);

    if (existing) {
      existing.connected = true;
      existing.name = cleanPlayerName(data.name);
      existing.privyToken = data.privyToken;
      existing.isNormieHolder = data.isNormieHolder;
      existing.selectedNormieId = data.selectedNormieId;
      existing.avatarUrl = data.avatarUrl;
      this.tcgConnections.set(connection.id, existing.id);
      this.tcgConnectionObjects.set(connection.id, connection);
      this.broadcastTcg();
      return;
    }

    if (this.tcgState.players.length >= 2) {
      connection.send(JSON.stringify({ type: "full", message: "This Circuit Clash room is full. Create a new room or join another invite." }));
      return;
    }

    const seat = this.tcgState.players.length as 0 | 1;
    const player: TcgPlayer = {
      id: data.playerId,
      name: cleanPlayerName(data.name),
      seat,
      connected: true,
      deck: [],
      hand: [],
      drafted: [],
      score: 0,
      privyToken: data.privyToken,
      isNormieHolder: data.isNormieHolder,
      selectedNormieId: data.selectedNormieId,
      avatarUrl: data.avatarUrl
    };

    this.tcgState.players.push(player);
    this.tcgConnections.set(connection.id, player.id);
    this.tcgConnectionObjects.set(connection.id, connection);

    if (this.tcgState.players.length >= 2) {
      this.startTcgDraft();
    } else {
      this.tcgState.phase = "waiting";
      this.tcgState.message = "Waiting for a second challenger.";
    }

    this.broadcastTcg();
  }

  private startTcgDraft() {
    this.tcgState.phase = "drafting";
    this.tcgState.turn = 1;
    this.tcgState.lanes = this.emptyTcgLanes();
    this.tcgState.reveal = undefined;
    this.tcgState.winnerId = undefined;
    this.tcgState.history = [];
    this.tcgScorches = [];
    this.tcgState.draftPool = this.createTcgDeck(`${this.room.id ?? "tcg"}-draft-${Date.now()}`, tcgDraftPoolSize);
    this.tcgState.draftTarget = tcgDeckSize;
    this.tcgState.draftPickSeconds = tcgDraftPickMs / 1000;
    this.tcgState.draftTurnPlayerId = this.tcgState.players.find((player) => player.seat === 0)?.id;
    this.tcgState.players = this.tcgState.players.map((player) => ({
      ...player,
      deck: [],
      hand: [],
      drafted: [],
      score: 0,
      pendingPlay: undefined,
      lastTypeBonus: 0,
      peaceShield: false
    }));
    this.tcgState.message = "Draft phase. Pick Normies from the shared pool one at a time.";
    this.scheduleTcgDraftTimer();
  }

  private draftTcgCard(data: Extract<TcgClientMessage, { type: "tcg_draft_pick" }>) {
    if (this.tcgState.phase !== "drafting" || this.tcgState.draftTurnPlayerId !== data.playerId) return;
    this.pickTcgDraftCard(data.playerId, data.cardId, false);
  }

  private pickTcgDraftCard(playerId: string, cardId: number, automatic: boolean) {
    const player = this.tcgState.players.find((item) => item.id === playerId);
    if (player && !player.connected && !automatic) return;
    if (!player || player.drafted.length >= this.tcgState.draftTarget || !this.tcgState.draftPool.includes(cardId)) return;

    this.clearTcgDraftTimer();
    player.drafted.push(cardId);
    this.tcgState.draftPool = this.tcgState.draftPool.filter((id) => id !== cardId);

    const draftComplete = this.tcgState.players.length >= 2 && this.tcgState.players.every((item) => item.drafted.length >= this.tcgState.draftTarget);
    if (draftComplete) {
      this.startTcgBattle();
      this.broadcastTcg();
      return;
    }

    this.tcgState.draftTurnPlayerId = this.nextTcgDraftPlayerId();
    this.tcgState.message = automatic ? `${player.name} timed out. Auto-drafted Normie #${cardId}.` : `${player.name} drafted Normie #${cardId}.`;
    this.scheduleTcgDraftTimer();
    this.broadcastTcg();
  }

  private nextTcgDraftPlayerId() {
    const totalDrafted = this.tcgState.players.reduce((sum, player) => sum + player.drafted.length, 0);
    const snakeSeats: Array<0 | 1> = [0, 1, 1, 0];

    for (let offset = 0; offset < snakeSeats.length; offset += 1) {
      const seat = snakeSeats[(totalDrafted + offset) % snakeSeats.length];
      const player = this.tcgState.players.find((item) => item.seat === seat && item.drafted.length < this.tcgState.draftTarget);
      if (player) return player.id;
    }

    return undefined;
  }

  private startTcgBattle() {
    this.clearTcgDraftTimer();
    this.tcgState.players = this.tcgState.players.map((player) => {
      const deck = this.shuffleTcgDeck(player.drafted, `${this.room.id ?? "tcg"}-${player.id}-${Date.now()}`);
      return {
        ...player,
        deck: deck.slice(tcgStartingHand),
        hand: deck.slice(0, tcgStartingHand),
        pendingPlay: undefined,
        lastTypeBonus: 0,
        peaceShield: false
      };
    });
    this.tcgState.phase = "playing";
    this.tcgState.draftTurnPlayerId = undefined;
    this.tcgState.draftDeadlineAt = undefined;
    this.tcgState.message = "Draft locked. Turn 1: play one Normie into a lane.";
  }

  private scheduleTcgDraftTimer() {
    this.clearTcgDraftTimer();
    if (this.tcgState.phase !== "drafting" || !this.tcgState.draftTurnPlayerId || !this.tcgState.draftPool.length) return;

    const playerId = this.tcgState.draftTurnPlayerId;
    this.tcgState.draftDeadlineAt = Date.now() + tcgDraftPickMs;
    this.tcgDraftTimer = setTimeout(() => {
      if (this.tcgState.phase !== "drafting" || this.tcgState.draftTurnPlayerId !== playerId) return;
      const cardId = this.tcgState.draftPool[0];
      if (typeof cardId !== "number") return;
      this.pickTcgDraftCard(playerId, cardId, true);
    }, tcgDraftPickMs);
  }

  private clearTcgDraftTimer() {
    if (this.tcgDraftTimer) {
      clearTimeout(this.tcgDraftTimer);
      this.tcgDraftTimer = undefined;
    }
  }

  private playTcgCard(data: Extract<TcgClientMessage, { type: "tcg_play" }>) {
    if (this.tcgState.phase !== "playing") return;

    const player = this.tcgState.players.find((item) => item.id === data.playerId && item.connected);
    if (!player || player.pendingPlay || !player.hand.includes(data.cardId)) return;

    player.pendingPlay = { cardId: data.cardId, lane: data.lane };
    this.tcgState.message = `${player.name} locked a card into lane ${data.lane + 1}.`;

    const activePlayers = this.tcgState.players.filter((item) => item.connected);
    if (activePlayers.length >= 2 && activePlayers.every((item) => item.pendingPlay)) {
      void this.resolveTcgTurn();
      return;
    }

    this.broadcastTcg();
  }

  private async resolveTcgTurn() {
    const playerA = this.tcgState.players.find((player) => player.seat === 0);
    const playerB = this.tcgState.players.find((player) => player.seat === 1);
    if (!playerA?.pendingPlay || !playerB?.pendingPlay) return;

    const playA = playerA.pendingPlay;
    const playB = playerB.pendingPlay;
    const evalA = await this.evaluateTcgCard(playerA, playerB, playA, playB);
    const evalB = await this.evaluateTcgCard(playerB, playerA, playB, playA);
    const powerA = evalA.power;
    const powerB = evalB.power;
    let laneWinner: "playerA" | "playerB" | "draw" = "draw";
    let burnedPenalty = "";

    this.tcgState.lanes[playA.lane].playerA.push(playA.cardId);
    this.tcgState.lanes[playB.lane].playerB.push(playB.cardId);
    playerA.hand = playerA.hand.filter((id) => id !== playA.cardId);
    playerB.hand = playerB.hand.filter((id) => id !== playB.cardId);

    if (playA.lane === playB.lane) {
      if (powerA > powerB) {
        playerA.score += 1;
        laneWinner = "playerA";
        burnedPenalty = this.applyTcgBurnedAftermath(playerB, playA, playB, evalA, evalB, powerA - powerB);
      } else if (powerB > powerA) {
        playerB.score += 1;
        laneWinner = "playerB";
        burnedPenalty = this.applyTcgBurnedAftermath(playerA, playB, playA, evalB, evalA, powerB - powerA);
      }
    } else {
      playerA.score += 1;
      playerB.score += 1;
      laneWinner = "draw";
    }

    this.drawTcgCard(playerA);
    this.drawTcgCard(playerB);
    playerA.pendingPlay = undefined;
    playerB.pendingPlay = undefined;
    this.tcgScorches = this.tcgScorches.filter((item) => item.turn > this.tcgState.turn);

    const reveal: TcgReveal = {
      turn: this.tcgState.turn,
      playerA: { ...playA, power: powerA, effects: evalA.effects },
      playerB: { ...playB, power: powerB, effects: evalB.effects },
      laneWinner,
      message:
        (playA.lane === playB.lane
          ? laneWinner === "draw"
            ? `Lane ${playA.lane + 1} tied.`
            : `${laneWinner === "playerA" ? playerA.name : playerB.name} won lane ${playA.lane + 1}.`
          : "Both players claimed separate lanes.") + (burnedPenalty ? ` ${burnedPenalty}` : "")
    };

    this.tcgState.reveal = reveal;
    this.tcgState.history.push(reveal);
    this.tcgState.message = reveal.message;

    if (this.tcgState.turn >= this.tcgState.maxTurns) {
      this.tcgState.phase = "finished";
      this.tcgState.winnerId = playerA.score === playerB.score ? undefined : playerA.score > playerB.score ? playerA.id : playerB.id;
      this.tcgState.message = this.tcgState.winnerId
        ? `${this.tcgState.winnerId === playerA.id ? playerA.name : playerB.name} wins Circuit Clash.`
        : "Circuit Clash ends in a draw.";
      this.broadcastTcg();
      return;
    }

    this.tcgState.turn += 1;
    this.tcgState.phase = "revealed";
    this.broadcastTcg();
    setTimeout(() => {
      if (this.tcgState.phase === "revealed") {
        this.tcgState.phase = "playing";
        this.tcgState.message = `Turn ${this.tcgState.turn}. Play one card into a lane.`;
        this.broadcastTcg();
      }
    }, 1800);
  }

  private rematchTcg(playerId: string) {
    if (!this.tcgState.players.some((player) => player.id === playerId)) return;

    this.tcgState.players = this.tcgState.players.map((player) => {
      return {
        ...player,
        deck: [],
        hand: [],
        drafted: [],
        score: 0,
        pendingPlay: undefined,
        lastTypeBonus: 0,
        peaceShield: false
      };
    });
    this.tcgState.turn = 1;
    this.tcgState.lanes = this.emptyTcgLanes();
    this.tcgState.reveal = undefined;
    this.tcgState.winnerId = undefined;
    this.tcgState.history = [];
    this.tcgState.draftPool = [];
    this.tcgScorches = [];
    if (this.tcgState.players.filter((player) => player.connected).length >= 2) {
      this.startTcgDraft();
    } else {
      this.tcgState.phase = "waiting";
      this.tcgState.message = "Waiting for both players to reconnect.";
    }
    this.broadcastTcg();
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

  private async handlePokerMessage(data: PokerAnyClientMessage, connection: PartyConnection) {
    if (data.type === "poker_join") {
      await this.joinPoker(data, connection);
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

  private async joinPoker(data: Extract<PokerClientMessage, { type: "poker_join" }>, connection: PartyConnection) {
    const existing = this.pokerState.players.find((player) => player.id === data.playerId);

    if (existing) {
      this.clearPokerStaleCleanup(existing.id);
      existing.connected = true;
      existing.name = cleanPlayerName(data.name);
      existing.privyToken = data.privyToken;
      existing.ante = this.pokerState.ante;
      existing.buyIn = this.pokerState.buyIn;
      existing.stack = typeof existing.stack === "number" ? existing.stack : this.pokerState.buyIn;
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

      const player: PokerPlayer = {
        id: data.playerId,
        name: cleanPlayerName(data.name),
        seat,
        connected: true,
        ready: false,
        hand: [],
        ante: this.pokerState.ante,
        buyIn: this.pokerState.buyIn,
        stack: 0,
        privyToken: data.privyToken,
        reserved: false,
        committed: 0,
        streetCommitted: 0,
        folded: false,
        acted: false,
        lastAction: undefined,
        isNormieHolder: data.isNormieHolder,
        selectedNormieId: data.selectedNormieId,
        avatarUrl: data.avatarUrl
      };
      const reserved = await this.reservePokerBuyIn(player);
      if (!reserved.ok) {
        connection.send(
          JSON.stringify({
            type: "full",
            message: reserved.error ?? "Could not reserve poker buy-in.",
            balance: reserved.balance,
            buyIn: player.buyIn
          })
        );
        return;
      }
      this.pokerState.players.push(player);
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
      this.pokerState.players.forEach((player) => {
        if (player.reserved && (player.committed ?? 0) > 0) {
          player.stack += player.committed ?? 0;
        }
      });
      await this.cashOutPokerStack(stalePlayer);
      this.pokerState.players = this.pokerState.players
        .filter((player) => player.connected)
        .map((player) => ({
          ...player,
          ready: false,
          hand: [],
          reserved: false,
          committed: 0,
          streetCommitted: 0,
          folded: false,
          acted: false,
          lastAction: undefined,
          accountError: undefined
        }));
      this.pokerState.phase = "waiting";
      this.pokerState.round += 1;
      this.pokerState.pot = 0;
      this.pokerState.currentBet = 0;
      this.pokerState.turnPlayerId = undefined;
      this.pokerState.street = undefined;
      this.pokerState.communityCards = [];
      this.pokerDeck = [];
      this.pokerState.handId = undefined;
      this.pokerState.showdown = undefined;
      this.pokerState.message = "Disconnected player timed out. Poker hand was voided and active commitments returned to table stacks.";
    } else {
      if (stalePlayer.reserved) {
        await this.cashOutPokerStack(stalePlayer);
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
    this.pokerState.message = "Collecting table antes...";
    this.pokerState.actionLog = [];
    this.appendPokerActionLog({
      action: "HAND",
      message: `Round ${this.pokerState.round} started. Collecting ${this.pokerState.ante} ante from each player.`
    });
    this.broadcastPoker();

    const blockedPlayers = seatedPlayers.filter((player) => player.stack < this.pokerState.ante);
    if (blockedPlayers.length) {
      this.pokerState.players.forEach((player) => {
        if (blockedPlayers.some((blocked) => blocked.id === player.id)) {
          player.ready = false;
          player.accountError = "Not enough table stack for the next ante.";
        }
      });
      this.pokerState.phase = "waiting";
      this.pokerState.message = "One or more players need more table stack for the ante.";
      this.broadcastPoker();
      return;
    }

    const requiredCards = seatedPlayers.length * 2 + 5;
    const deck = this.createNormieDeck(requiredCards);

    seatedPlayers.forEach((player, playerIndex) => {
      player.hand = deck.slice(playerIndex * 2, playerIndex * 2 + 2);
      player.stack -= this.pokerState.ante;
      player.ante = this.pokerState.ante;
      player.committed = this.pokerState.ante;
      player.streetCommitted = 0;
      player.folded = false;
      player.acted = false;
    });

    this.pokerDeck = deck.slice(seatedPlayers.length * 2);
    this.pokerState.phase = "betting";
    this.pokerState.pot = seatedPlayers.reduce((total, player) => total + player.ante, 0);
    this.pokerState.currentBet = 0;
    this.pokerState.street = "preflop";
    this.pokerState.communityCards = [];
    this.pokerState.turnPlayerId = this.nextActivePokerPlayerId();
    this.pokerState.message = "Two private Normies dealt. Preflop betting is open.";
    this.appendPokerActionLog({
      action: "ANTE",
      amount: this.pokerState.pot,
      message: `${seatedPlayers.length} players anted. Pot is ${this.pokerState.pot}.`
    });
    this.appendPokerActionLog({
      action: "DEAL",
      message: "Private Normies dealt. Preflop betting opened."
    });
    this.broadcastPoker();
  }

  private appendPokerActionLog(entry: {
    playerName?: string;
    action: string;
    amount?: number;
    message: string;
  }) {
    this.pokerState.actionLog = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        round: this.pokerState.round,
        street: this.pokerState.street,
        ...entry
      },
      ...this.pokerState.actionLog
    ].slice(0, 12);
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
      player.lastAction = "FOLD";
      this.pokerState.message = `${player.name} folded.`;
      this.appendPokerActionLog({
        playerName: player.name,
        action: "FOLD",
        message: `${player.name} folded.`
      });
      if (this.activePokerPlayers().length === 1) {
        await this.finishPokerShowdown();
        return;
      }
      this.advancePokerTurn(player.id);
      return;
    }

    const streetCommitted = player.streetCommitted ?? 0;
    const totalCommitted = player.committed ?? 0;
    const callAmount = Math.max(0, this.pokerState.currentBet - streetCommitted);

    if (data.action === "check") {
      if (callAmount > 0) return;
      player.acted = true;
      player.lastAction = "CHECK";
      this.pokerState.message = `${player.name} checked.`;
      this.appendPokerActionLog({
        playerName: player.name,
        action: "CHECK",
        message: `${player.name} checked.`
      });
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
        player.streetCommitted = streetCommitted + callAmount;
        player.committed = totalCommitted + callAmount;
        this.pokerState.pot += callAmount;
      }
      player.acted = true;
      player.lastAction = callAmount > 0 ? `CALL ${callAmount}` : "CALL";
      this.pokerState.message = `${player.name} called.`;
      this.appendPokerActionLog({
        playerName: player.name,
        action: "CALL",
        amount: callAmount,
        message: callAmount > 0 ? `${player.name} called ${callAmount}.` : `${player.name} called.`
      });
      this.advancePokerTurn(player.id);
      return;
    }

    if (data.action === "raise") {
      const raiseTo = data.raiseTo ?? this.pokerState.currentBet + this.pokerState.minRaise;
      if (raiseTo < this.pokerState.currentBet + this.pokerState.minRaise) return;
      if (raiseTo > this.maxPokerRaiseTo()) {
        player.accountError = "Raise exceeds the table stack cap for active players.";
        this.broadcastPoker();
        return;
      }
      const extra = raiseTo - streetCommitted;
      const reserved = await this.reservePokerExtraWager(player, extra);
      if (!reserved.ok) {
        this.broadcastPoker();
        return;
      }
      player.streetCommitted = raiseTo;
      player.committed = totalCommitted + extra;
      player.acted = true;
      player.lastAction = `RAISE ${raiseTo}`;
      this.pokerState.currentBet = raiseTo;
      this.pokerState.pot += extra;
      this.pokerState.players.forEach((item) => {
        if (item.id !== player.id && item.connected && !item.folded) item.acted = false;
      });
      this.pokerState.message = `${player.name} raised to ${raiseTo}.`;
      this.appendPokerActionLog({
        playerName: player.name,
        action: "RAISE",
        amount: raiseTo,
        message: `${player.name} raised to ${raiseTo}.`
      });
      this.advancePokerTurn(player.id);
    }
  }

  private advancePokerTurn(previousPlayerId: string) {
    if (this.isPokerBettingComplete()) {
      void this.advancePokerStreetOrShowdown();
      return;
    }
    this.pokerState.turnPlayerId = this.nextActivePokerPlayerId(previousPlayerId);
    this.broadcastPoker();
  }

  private isPokerBettingComplete() {
    const active = this.activePokerPlayers();
    return active.length <= 1 || active.every((player) => player.acted && (player.streetCommitted ?? 0) >= this.pokerState.currentBet);
  }

  private maxPokerRaiseTo() {
    const active = this.activePokerPlayers();
    if (!active.length) return 0;
    return Math.min(...active.map((player) => (player.streetCommitted ?? 0) + player.stack));
  }

  private resetPokerStreet(street: PokerState["street"], revealCount: number, message: string) {
    this.pokerState.street = street;
    this.pokerState.communityCards = [...this.pokerState.communityCards, ...this.pokerDeck.splice(0, revealCount)];
    this.pokerState.currentBet = 0;
    this.pokerState.turnPlayerId = this.nextActivePokerPlayerId();
    this.pokerState.players.forEach((player) => {
      if (player.connected && !player.folded) {
        player.acted = false;
        player.lastAction = undefined;
        player.streetCommitted = 0;
      }
    });
    this.pokerState.message = message;
    this.appendPokerActionLog({
      action: street?.toUpperCase() ?? "STREET",
      message
    });
    this.broadcastPoker();
  }

  private async advancePokerStreetOrShowdown() {
    if (this.activePokerPlayers().length <= 1) {
      await this.finishPokerShowdown();
      return;
    }

    if (this.pokerState.street === "preflop") {
      this.resetPokerStreet("flop", 3, "Flop revealed. Betting is open.");
      return;
    }

    if (this.pokerState.street === "flop") {
      this.resetPokerStreet("turn", 1, "Turn Normie revealed. Betting is open.");
      return;
    }

    if (this.pokerState.street === "turn") {
      this.resetPokerStreet("river", 1, "River Normie revealed. Final betting is open.");
      return;
    }

    await this.finishPokerShowdown();
  }

  private async finishPokerShowdown() {
    const showdown = await this.evaluatePokerShowdown(this.activePokerPlayers());
    showdown.winners.forEach((winnerId) => {
      const winner = this.pokerState.players.find((player) => player.id === winnerId);
      if (winner) winner.stack += showdown.payoutEach;
    });
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
    this.appendPokerActionLog({
      action: "SHOWDOWN",
      amount: showdown.pot,
      message: this.pokerState.message
    });
    this.broadcastPoker();
  }

  private nextPokerHand(playerId: string) {
    if (this.pokerState.phase !== "showdown") return;
    if (!this.pokerState.players.some((player) => player.id === playerId && player.connected)) return;

    this.pokerState.round += 1;
    this.pokerState.phase = "waiting";
    this.pokerState.pot = 0;
    this.pokerState.currentBet = 0;
    this.pokerState.turnPlayerId = undefined;
    this.pokerState.street = undefined;
    this.pokerState.communityCards = [];
    this.pokerDeck = [];
    this.pokerState.handId = undefined;
    this.pokerState.showdown = undefined;
    this.pokerState.actionLog = [];
    this.pokerState.players = this.pokerState.players
      .filter((player) => player.connected)
      .map((player) => ({
        ...player,
        ready: false,
        hand: [],
        reserved: false,
        committed: 0,
        streetCommitted: 0,
        folded: false,
        acted: false,
        lastAction: undefined,
        accountError: undefined
      }));
    this.pokerState.message = "Next hand ready. Players can ready up with the fixed table ante.";
    this.appendPokerActionLog({
      action: "RESET",
      message: "Next hand ready. Players can ready up."
    });
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
      if (!response.ok) return this.fallbackNormieTraits(id);
      const traits = this.normalizeNormieTraits((await response.json()) as RawNormieTraitsResponse);
      return Object.keys(traits).length ? traits : this.fallbackNormieTraits(id);
    } catch {
      return this.fallbackNormieTraits(id);
    }
  }

  private fallbackNormieTraits(id: number): NormieTraits {
    const types = ["Human", "Cat", "Alien", "Agent"];
    const expressions = ["Neutral", "Slight Smile", "Friendly", "Content", "Confident", "Peaceful"];
    return {
      Type: types[id % types.length],
      Expression: expressions[id % expressions.length],
      Age: ["Young", "Middle-Aged", "Old"][id % 3],
      "Hair Style": "Fallback Fade",
      "Facial Feature": "Pixel Smile",
      Eyes: "Bright",
      Accessory: "Neon Pass"
    };
  }

  private normalizeNormieTraits(response: RawNormieTraitsResponse): NormieTraits {
    if ("attributes" in response && Array.isArray(response.attributes)) {
      return response.attributes.reduce<NormieTraits>((traits, attribute) => {
        if (attribute.trait_type && attribute.value !== undefined) {
          traits[attribute.trait_type] = attribute.value;
        }
        return traits;
      }, {});
    }

    return response as NormieTraits;
  }

  private countValues(values: Array<string | undefined>) {
    return values.reduce<Record<string, number>>((counts, value) => {
      if (!value || value === "Unknown") return counts;
      const key = value;
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
  }

  private hasCount(counts: Record<string, number>, target: number) {
    return Object.values(counts).some((count) => count >= target);
  }

  private matchingValue(counts: Record<string, number>, target: number) {
    return Object.entries(counts).find(([, count]) => count >= target)?.[0] ?? "";
  }

  private allSame(values: Array<string | undefined>) {
    return values.length > 0 && values.every((value) => Boolean(value) && value !== "Unknown" && value === values[0]);
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

  private fiveCardCombos(cards: number[]) {
    const combos: number[][] = [];
    for (let a = 0; a < cards.length - 4; a += 1) {
      for (let b = a + 1; b < cards.length - 3; b += 1) {
        for (let c = b + 1; c < cards.length - 2; c += 1) {
          for (let d = c + 1; d < cards.length - 1; d += 1) {
            for (let e = d + 1; e < cards.length; e += 1) {
              combos.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            }
          }
        }
      }
    }
    return combos;
  }

  private async evaluateBestTexasHand(cards: number[]) {
    const combos = this.fiveCardCombos(cards);
    const evaluated = await Promise.all(
      combos.map(async (combo) => {
        const traits = await Promise.all(combo.map((id) => this.fetchNormieTraits(id)));
        return {
          cards: combo,
          evaluation: this.evaluatePokerHand(traits)
        };
      })
    );

    return evaluated.reduce((best, current) => (current.evaluation.score > best.evaluation.score ? current : best));
  }

  private async evaluatePokerShowdown(players: PokerPlayer[]): Promise<PokerShowdown> {
    const hands = await Promise.all(
      players.map(async (player) => {
        const cards = [...(player.hand ?? []), ...this.pokerState.communityCards];
        const cardTraits = await Promise.all(cards.map(async (id) => ({ id, traits: await this.fetchNormieTraits(id) })));
        const best = cards.length >= 5 ? await this.evaluateBestTexasHand(cards) : { cards, evaluation: this.evaluatePokerHand([]) };
        return {
          playerId: player.id,
          playerName: player.name,
          cards,
          bestCards: best.cards,
          cardTraits,
          handName: best.evaluation.handName,
          score: best.evaluation.score,
          summary: best.evaluation.summary
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
      const stake = this.rpsStakeForJoin(data.bet);
      if (this.state.stake !== undefined && stake !== this.state.stake) {
        connection.send(
          JSON.stringify({
            type: "full",
            message: `This RPS room stake is ${this.state.stake} chips. Match that stake or create a new room.`,
            stake: this.state.stake
          })
        );
        return;
      }

      this.state.stake = this.state.stake ?? stake;
      const player: Player = {
        id: data.playerId,
        name: cleanPlayerName(data.name),
        seat,
        score: 0,
        connected: true,
        isNormieHolder: data.isNormieHolder,
        selectedNormieId: data.selectedNormieId,
        avatarUrl: data.avatarUrl,
        bet: this.state.stake,
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
    const stake = this.state.stake;
    this.state.players = this.state.players.map((player) => ({
      ...player,
      bet: stake ?? player.bet,
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
      this.state.stake = this.state.players.find((player) => player.connected)?.bet;
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

  private publicTcgState(playerId?: string) {
    const privatePlayer = playerId ? this.tcgState.players.find((player) => player.id === playerId) : undefined;

    return {
      ...this.tcgState,
      privateHand: privatePlayer?.hand,
      privateDrafted: privatePlayer?.drafted,
      players: this.tcgState.players.map((player) => ({
        ...player,
        privyToken: undefined,
        deck: undefined,
        hand: undefined,
        drafted: undefined,
        draftedCount: player.drafted.length,
        handCount: player.hand.length,
        deckCount: player.deck.length,
        pendingPlay: player.pendingPlay ? { cardId: 0, lane: player.pendingPlay.lane } : undefined
      }))
    };
  }

  private publicPokerState(playerId?: string) {
    const privatePlayer = playerId ? this.pokerState.players.find((player) => player.id === playerId) : undefined;

    return {
      ...this.pokerState,
      pokerDeck: undefined,
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

  private broadcastTcg() {
    this.tcgConnectionObjects.forEach((connection, connectionId) => {
      const playerId = this.tcgConnections.get(connectionId);
      if (!playerId) return;
      connection.send(JSON.stringify({ type: "tcg_state", state: this.publicTcgState(playerId) }));
    });
  }

  private broadcastPoker() {
    this.pokerConnectionObjects.forEach((connection, connectionId) => {
      const playerId = this.pokerConnections.get(connectionId);
      if (!playerId) return;
      connection.send(JSON.stringify({ type: "poker_state", state: this.publicPokerState(playerId) }));
    });
  }

  private isPokerRoom() {
    return (this.room.id ?? "").startsWith("poker-");
  }

  private isTcgRoom() {
    return (this.room.id ?? "").startsWith("tcg-");
  }

  private emptyTcgLanes(): TcgLane[] {
    return [
      { playerA: [], playerB: [] },
      { playerA: [], playerB: [] },
      { playerA: [], playerB: [] }
    ];
  }

  private createTcgDeck(seed: string, count = tcgDeckSize) {
    let state = Array.from(seed).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
    const next = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state;
    };
    const ids = new Set<number>();
    while (ids.size < count) ids.add(next() % 10_000);
    return [...ids];
  }

  private shuffleTcgDeck(ids: number[], seed: string) {
    let state = Array.from(seed).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
    const next = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state;
    };
    const deck = [...ids];
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const swap = next() % (index + 1);
      [deck[index], deck[swap]] = [deck[swap], deck[index]];
    }
    return deck;
  }

  private tcgCardPower(id: number) {
    return 5 + (id % 9) + (String(id).split("").reduce((sum, digit) => sum + Number(digit), 0) % 5);
  }

  private async fetchTcgTraits(id: number) {
    if (this.tcgTraitCache.has(id)) return this.tcgTraitCache.get(id)!;
    const traits = await this.fetchNormieTraits(id);
    this.tcgTraitCache.set(id, traits);
    return traits;
  }

  private cleanTcgTrait(value: unknown) {
    return String(value ?? "").trim();
  }

  private async evaluateTcgCard(player: TcgPlayer, opponent: TcgPlayer, play: { cardId: number; lane: number }, opponentPlay: { cardId: number; lane: number }) {
    const base = this.tcgCardPower(play.cardId);
    const traits = await this.fetchTcgTraits(play.cardId);
    const expression = this.cleanTcgTrait(traits.Expression);
    const type = this.cleanTcgTrait(traits.Type);
    const boardCards = this.tcgBoardCards(player.seat);
    const boardTraits = await Promise.all(boardCards.map((id) => this.fetchTcgTraits(id)));
    const effects: string[] = [];
    let power = base;
    let typeBonus = 0;
    let negative = 0;

    if (expression === "Neutral" && play.lane === opponentPlay.lane) {
      power += 1;
      effects.push("Neutral: wins a tied lane by +1 virtual power.");
    } else if (expression === "Slight Smile" && this.hasTcgAdjacentCard(player.seat, play.lane)) {
      power += 2;
      effects.push("Slight Smile: +2 near an allied adjacent lane.");
    } else if (expression === "Friendly" && this.tcgLaneCount(player.seat, play.lane) < this.tcgLaneCount(opponent.seat, play.lane)) {
      power += 2;
      effects.push("Friendly: +2 when played into a lane where you trail.");
    } else if (expression === "Content") {
      power += 1;
      effects.push("Content: +1 and ignores penalties below base.");
    } else if (expression === "Confident" && play.lane === opponentPlay.lane) {
      power += 3;
      effects.push("Confident: +3 in a contested lane.");
    } else if (expression === "Peaceful") {
      player.peaceShield = true;
      effects.push("Peaceful: cancels one burned score penalty.");
    } else if (expression) {
      power += 1;
      effects.push(`${expression}: +1 wildcard expression bonus.`);
    }

    if (type === "Human") {
      typeBonus = boardTraits.filter((item) => this.cleanTcgTrait(item.Type) === "Human").length;
      if (typeBonus) effects.push(`Human: +${typeBonus} for other Human cards on board.`);
    } else if (type === "Cat" && this.tcgLaneCount(player.seat, play.lane) + this.tcgLaneCount(opponent.seat, play.lane) === 0) {
      typeBonus = 3;
      effects.push("Cat: +3 into an empty lane.");
    } else if (type === "Alien" && play.lane !== opponentPlay.lane) {
      typeBonus = 2;
      effects.push("Alien: +2 when opponent chooses another lane.");
    } else if (type === "Agent") {
      typeBonus = player.lastTypeBonus ?? 0;
      effects.push(`Agent: copies previous type bonus${typeBonus ? ` (+${typeBonus})` : ""}.`);
    }
    power += typeBonus;

    const expressionCount = boardTraits.filter((item) => this.cleanTcgTrait(item.Expression) === expression).length;
    if (expression && expressionCount >= 1) {
      power += 2;
      effects.push("2 combo: same Expression pair gives +2.");
    }

    const types = new Set([...boardTraits.map((item) => this.cleanTcgTrait(item.Type)), type]);
    if (types.has("Human") && types.has("Cat") && types.has("Alien")) {
      power += 3;
      effects.push("2 combo: Human/Cat/Alien spread gives +3.");
    }

    if (await this.isTcgBurned(play.cardId)) {
      power += 6;
      effects.push("Burned: +6, but losing a contested lane costs score.");
    }

    const scorch = this.tcgScorches.find((item) => item.seat === player.seat && item.lane === play.lane && item.turn === this.tcgState.turn);
    if (scorch) {
      negative -= 2;
      effects.push("Scorched lane: -2 this turn.");
    }

    player.lastTypeBonus = typeBonus;
    power += negative;
    if (expression === "Content" && power < base) power = base;

    return { power, effects, burned: await this.isTcgBurned(play.cardId), expression };
  }

  private applyTcgBurnedAftermath(
    loser: TcgPlayer,
    winningPlay: { lane: number },
    losingPlay: { lane: number },
    winningEval: { burned: boolean },
    losingEval: { burned: boolean; expression: string },
    margin: number
  ) {
    let message = "";
    if (winningEval.burned) {
      this.tcgScorches.push({ seat: loser.seat, lane: winningPlay.lane, turn: this.tcgState.turn + 1 });
      message = "Burned winner scorched that lane.";
    }
    if (losingEval.burned && winningPlay.lane === losingPlay.lane) {
      const penalty = margin >= 5 ? 2 : 1;
      if (loser.peaceShield || losingEval.expression === "Peaceful") {
        loser.peaceShield = false;
        return message ? `${message} Peaceful shield blocked burned backlash.` : "Peaceful shield blocked burned backlash.";
      }
      loser.score = Math.max(0, loser.score - penalty);
      return `${message ? `${message} ` : ""}Burned loser lost ${penalty} score.`;
    }
    return message;
  }

  private tcgBoardCards(seat: 0 | 1) {
    const key = seat === 0 ? "playerA" : "playerB";
    return this.tcgState.lanes.flatMap((lane) => lane[key]);
  }

  private tcgLaneCount(seat: 0 | 1, lane: number) {
    const key = seat === 0 ? "playerA" : "playerB";
    return this.tcgState.lanes[lane]?.[key].length ?? 0;
  }

  private hasTcgAdjacentCard(seat: 0 | 1, lane: number) {
    return [lane - 1, lane + 1].some((index) => index >= 0 && index <= 2 && this.tcgLaneCount(seat, index) > 0);
  }

  private async isTcgBurned(id: number) {
    if (!this.tcgBurnedIds) {
      try {
        const response = await fetch("https://api.normies.art/history/burned-tokens?limit=500", { headers: { accept: "application/json" } });
        const data = response.ok ? await response.json() : [];
        this.tcgBurnedIds = new Set(this.extractNormieIds(data));
      } catch {
        this.tcgBurnedIds = new Set();
      }
    }
    return this.tcgBurnedIds.has(id);
  }

  private extractNormieIds(value: unknown): number[] {
    if (typeof value === "number" && Number.isFinite(value)) return [value];
    if (typeof value === "string" && Number.isFinite(Number(value))) return [Number(value)];
    if (Array.isArray(value)) return value.flatMap((item) => this.extractNormieIds(item));
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      return this.extractNormieIds(record.tokenId ?? record.id ?? record.normieId ?? record.token_id ?? record.tokens ?? record.burnedTokens ?? record.items ?? record.data);
    }
    return [];
  }

  private drawTcgCard(player: TcgPlayer) {
    const next = player.deck.shift();
    if (typeof next === "number") player.hand.push(next);
  }

  private createMatchId() {
    return `rps-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private isQuickRpsRoom() {
    return (this.room.id ?? "").toLowerCase() === "rps-quickplay";
  }

  private rpsStakeForJoin(requestedBet: number) {
    return this.isQuickRpsRoom() ? rpsQuickMatchStake : Math.max(1, Math.round(requestedBet));
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

  private async reservePokerBuyIn(player: PokerPlayer) {
    player.buyInSessionId = player.buyInSessionId ?? this.createPokerMatchId();
    try {
      const response = await fetch(`${this.apiBaseUrl()}/api/pvp/poker/reserve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-partykit-secret": this.internalSecret()
        },
        body: JSON.stringify({
          matchId: player.buyInSessionId,
          roomId: this.room.id ?? "poker-room",
          playerId: player.id,
          privyToken: player.privyToken,
          ante: player.buyIn
        })
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; balance?: number };

      if (!response.ok || !data.ok) {
        player.accountError = data.error ?? "Could not reserve poker buy-in.";
        return { ok: false as const, error: player.accountError, balance: data.balance };
      }

      player.reserved = true;
      player.stack = player.buyIn;
      player.serverBalance = data.balance;
      player.accountError = undefined;
      return { ok: true as const, balance: data.balance };
    } catch {
      player.accountError = "Poker buy-in service unavailable.";
      return { ok: false as const, error: player.accountError };
    }
  }

  private async reservePokerExtraWager(player: PokerPlayer, amount: number) {
    if (amount <= 0) return { ok: true as const };

    if (player.stack < amount) {
      player.accountError = "Not enough table stack for that wager.";
      return { ok: false as const, error: player.accountError };
    }

    player.stack -= amount;
    player.accountError = undefined;
    return { ok: true as const };
  }

  private async cashOutPokerStack(player: PokerPlayer) {
    if (!player.reserved) return;
    const amount = Math.max(0, Math.floor(player.stack));

    try {
      const response = await fetch(`${this.apiBaseUrl()}/api/pvp/poker/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-partykit-secret": this.internalSecret()
        },
        body: JSON.stringify({
          matchId: player.buyInSessionId ?? this.pokerState.handId ?? "poker-hand",
          roomId: this.room.id ?? "poker-room",
          playerId: player.id,
          privyToken: player.privyToken,
          ante: player.buyIn,
          amount
        })
      });
      const data = (await response.json()) as { ok?: boolean; balance?: number; error?: string };
      if (!response.ok || !data.ok) {
        player.accountError = data.error ?? "Could not cash out poker stack.";
        return;
      }

      player.serverBalance = data.balance;
      player.stack = 0;
      player.reserved = false;
      player.buyInSessionId = undefined;
      player.accountError = undefined;
    } catch {
      player.accountError = "Poker cash-out service unavailable.";
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

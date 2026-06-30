# Normie Arcade

A browser-based Normies city arcade built with Next.js, TailwindCSS, Framer Motion, Zustand, TanStack Query, PartyKit, Prisma, and the official Normies API.

## Stack

- Next.js App Router with TypeScript
- Responsive bitmap city-map lobby with HUD-driven game panels
- Zustand for chip economy, current table, audio, and notifications
- TanStack Query for Normies API preload lifecycle
- TailwindCSS for HUD/game UI
- Framer Motion for panel, card, and toast animation
- Web Audio API for browser-safe synthesized arcade feedback
- Privy for wallet/email login
- PostgreSQL with Prisma for user profiles, wallets, chip accounts, sessions, and leaderboard data
- PartyKit for realtime PvP RPS, DNA Poker, and Circuit Clash rooms
- Normie holder verification through the official `/holders/{address}` API
- In-HUD profile editing for username, display name, holder badge, and verified Normie avatar selection
- Community game submissions with admin approval before public display

## Run Locally

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
NEXT_PUBLIC_PRIVY_APP_ID="your-privy-app-id"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/normie_arcade?schema=public"
NEXT_PUBLIC_PARTYKIT_HOST="localhost:1999"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
PARTYKIT_API_BASE_URL="http://localhost:3000"
PARTYKIT_INTERNAL_SECRET="dev-internal-secret"
PRIVY_VERIFICATION_KEY="your-privy-jwt-verification-key"
COMMUNITY_GAMES_ADMIN_TOKEN="your-local-admin-token"
# Optional in production. Leave unset unless you intentionally want the test faucet enabled.
ENABLE_TEST_FAUCET="true"
```

Generate Prisma Client:

```bash
npm run db:generate
```

Run a migration after your PostgreSQL database exists:

```bash
npm run db:migrate
```

This creates the user, wallet, chip, PvP, profile, and Normie holder tables. Holder verification refreshes on login when the cached wallet check is stale, so users who sell their Normies lose the holder badge/avatar after the next refresh.

Start the dev server:

```bash
npm run dev
```

Start the PartyKit PvP room server in another terminal:

```bash
npm run party:dev
```

Then open `http://localhost:3000`.

## Project Structure

```txt
src/
  app/
    layout.tsx
    page.tsx
    providers.tsx
    globals.css
  components/
    auth/
      AuthSync.tsx
    arcade/
      ArcadeLobby.tsx
    audio/
      AudioBoot.tsx
    games/
      BetControls.tsx
      GameDock.tsx
      PixelDetectiveGame.tsx
      PokerGame.tsx
      RPSGame.tsx
      RouletteGame.tsx
      SortSprintGame.tsx
      TcgClashGame.tsx
      UpDownGame.tsx
      WhackRushGame.tsx
    hud/
      CommunityGames.tsx
      CreditSystem.tsx
      HUD.tsx
      Leaderboard.tsx
      LobbyHelp.tsx
      PlayerControls.tsx
      NotificationSystem.tsx
  hooks/
    useNormiePreload.ts
  lib/
    accountSchema.ts
    audio.ts
    communityGamesSchema.ts
    gameMath.ts
    pokerPvp.ts
    prisma.ts
    pvpPokerSchema.ts
    pvpRpsSchema.ts
    rateLimiter.ts
    rpsPvp.ts
    tcgPvp.ts
  services/
    NormieAPIService.ts
  stores/
    arcadeStore.ts
    audioStore.ts
    chipStore.ts
    playerStore.ts
  types/
    audio.d.ts
    normie.ts
prisma/
  schema.prisma
```

## Normies API

The centralized service is `src/services/NormieAPIService.ts`.

Implemented:

- `fetchNormieTraits(id)`
- `fetchNormieImage(id)`
- `fetchNormieMetadata(id)`
- `fetchNormiePixels(id)`
- `fetchBurnedNormieIds(limit)`
- `getRandomNormie()`
- `getRandomNormies(count)`
- `preloadNormies(count)`

It includes:

- 56 request/minute queue, below the public 60 request/minute limit
- request deduplication
- in-memory caching
- retry logic
- graceful fallback traits/metadata
- optimized parallel fetching where safe

## Games

### Normie Expression Roulette

Users choose Easy, Medium, or Hard, set a chip bet, then reveal 3-5 live Normie reels. Each reel fetches a real Normie and stops on that Normie's API Expression trait. Matching every revealed Expression wins the mode payout.

### Normie Type RPS

Human, Cat, and Alien form a best-of-3 arena:

- Cat beats Alien
- Human beats Cat
- Alien beats Human

Every round resolves the selected type against an NPC type and displays the matching local Normies-style type art.

The RPS panel also includes a PartyKit-powered PvP mode for 1v1 quick matches. Run `npm run party:dev`
alongside `npm run dev`, then choose `PvP 1v1` in the RPS game. PvP supports room codes,
copyable invite links, canceling matchmaking while waiting, clear match states, and opponent
disconnect/reconnect messaging. PvP chip reservation, refund, and final payout are handled by
PartyKit through protected Next.js API routes backed by Prisma.

### Normie DNA Poker

PartyKit-powered PvP poker rooms support 2-5 players, buy-in reservation, antes from table stacks, betting streets, reconnects, chip settlement, and a 30-second turn timer that auto-folds idle players. Each player receives two private Normies and shares a five-card board.

Showdown evaluates the best five-card DNA hand:

- Pair: two or more cards share Hair Style
- Three of a Kind: three or more cards share Eyes
- Flush: all five cards share Expression
- Full House: three cards share Accessory and the other two cards share Facial Feature
- Perfect DNA: all five cards share Eyes, Accessory, or Facial Feature

If multiple players share the highest hand tier, the highest token ID sum among that best five-card combo wins. If both hand tier and token sum tie, the pot splits.

### Up or Down

The terminal starts at 5000. Users predict whether the next random Normie ID will be higher or lower. Correct reads advance the base number; wrong reads end the run. Easy, Medium, and Hard require different survival counts and pay different multipliers.

### Normie Sort Sprint

A 30-second skill game. Players sort live Normies into bins based on the active trait rule. Correct sorts build combo, wrong bins reset combo, and results post to the skill leaderboard.

### Pixel Detective

A 60-second identification game. The cabinet fetches a real Normie pixel payload, shows a cropped fragment, and asks the player to pick the matching suspect. Keyboard shortcuts 1-4 support quick selection.

### Whack-A-Normie

A 60-second reaction game using live Normies and burned-token history. Clean hits score points and build combo. Burned hits deduct points and break combo.

### Normie Shells

A lightweight shell-tracking skill game. A real Normie flashes under one of three shell pods, the pods shuffle faster after every correct guess, and the highest consecutive level posts to the skill leaderboard.

### Normie Circuit Clash

PartyKit-powered 1v1 lane-control battler. Players draft from a shared Normie pool, play cards into three lanes over five turns, and resolve lane power using traits, burned status, combo effects, one skip, and one redraw per match. Winning 2 of 3 lanes wins the match; total board power and highest single-card power break tied lane control.

## Community Games

Players can submit external Normie-themed games through the Community Games panel. Submissions are saved as `PENDING` and do not appear publicly until approved.

Admin review is available in the Community Games modal:

1. Click `Admin`.
2. Enter `COMMUNITY_GAMES_ADMIN_TOKEN`.
3. Load pending submissions.
4. Approve or reject each game.

Approved games are returned by `GET /api/community-games`. Admin review uses protected `GET` and `PATCH` requests at `/api/community-games/admin` with the `x-admin-token` header.

## Notes

- Normie images, avatars, traits, pixels, and burned-token data are fetched from `https://api.normies.art`.
- The lobby is a custom bitmap city map with hard-edged district panels and HUD overlays.
- Realtime PvP currently runs through PartyKit rooms.
- The visual direction is Normies-native: monochrome bitmap surfaces, hard-edged pixel panels, scanline UI, on-chain terminal labels, and selective cyan/magenta/acid lighting accents.

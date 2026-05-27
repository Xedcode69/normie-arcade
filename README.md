# Normie Arcade

A browser-based 3D Normies casino arcade built with Next.js, React Three Fiber, TailwindCSS, Framer Motion, Zustand, TanStack Query, and the official Normies API.

## Stack

- Next.js App Router with TypeScript
- Three.js through `@react-three/fiber`
- `@react-three/drei` for scene helpers, HTML overlays, environment lighting, and camera utilities
- Zustand for chip economy, current table, audio, and notifications
- TanStack Query for Normies API preload lifecycle
- TailwindCSS for HUD/game UI
- Framer Motion for panel, card, and toast animation
- Web Audio API for browser-safe synthesized arcade feedback

## Run Locally

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
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
    arcade/
      ArcadeLobby.tsx
      GameTable.tsx
      HologramSign.tsx
      NormieDealer.tsx
      PlayerAvatar.tsx
    audio/
      AudioBoot.tsx
    games/
      BetControls.tsx
      GameDock.tsx
      RPSGame.tsx
      RouletteGame.tsx
      UpDownGame.tsx
    hud/
      CreditSystem.tsx
      HUD.tsx
      Leaderboard.tsx
      PlayerControls.tsx
      NotificationSystem.tsx
  hooks/
    useNormiePreload.ts
  lib/
    audio.ts
    gameMath.ts
    rateLimiter.ts
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
```

## Normies API

The centralized service is `src/services/NormieAPIService.ts`.

Implemented:

- `fetchNormieTraits(id)`
- `fetchNormieImage(id)`
- `fetchNormieMetadata(id)`
- `getRandomNormie()`
- `getRandomNormies(count)`
- `getRouletteNormies(count)`
- `preloadNormies(count)`

It includes:

- 56 request/minute queue, below the public 60 request/minute limit
- request deduplication
- in-memory caching
- retry logic
- graceful fallback traits/metadata
- optimized parallel fetching where safe

## Gamess

### Normie Expression Roulette

Users choose Easy, Medium, or Hard, set a chip bet, then reveal 3-5 live Normie cards. The table uses a seven-expression roulette reel with equal outcome probability while still displaying each fetched Normie's API expression trait for transparency.

### Normie Type RPS

Human, Cat, and Alien form a best-of-3 arena:

- Cat beats Alien
- Human beats Cat
- Alien beats Human

Every round fetches fresh Normie fighters and animates the reveal in the interface.

### Up or Down

The terminal starts at 5000. Users predict whether the next random Normie ID will be higher or lower. Correct reads advance the base number; wrong reads end the run. Surviving 10 rounds pays a bonus.

## Notes

- All NPC portraits, machine screens, cashier art, and leaderboard avatars are fetched from `https://api.normies.art`.
- The scene uses custom procedural geometry rather than copying the reference image.
- The first version is multiplayer-ready-feeling through animated NPCs, leaderboards, and ambient state. Real-time multiplayer can be layered in later with PartyKit, Liveblocks, or Socket.IO.

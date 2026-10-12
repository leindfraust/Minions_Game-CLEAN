# MOTE MAYHEM: LAB ESCAPE

> ## ⚠️ Decontaminated fork — read this first
>
> The upstream repository `icateNFT/Minions_Game` that this code came from is
> **malware**. It is not "probably" malware: it shipped an active remote-code
> execution backdoor that ran on `npm install`-adjacent commands and installed a
> full infostealer (keylogger, clipboard and browser-wallet theft, filesystem
> exfiltration, registry dumps) with a live command-and-control server.
>
> That backdoor has been stripped from this copy. See
> [Security notes](#security-note-corrected) at the bottom for the technical
> detail and the exact files removed. **Do not clone the original.** If you
> already ran it, assume every credential on that machine is compromised.
>
> The game itself is harmless and playable: `npm install && npm run dev`.

A polished, playable frontend game prototype built with **Next.js (App Router)**,
**React**, and **Phaser 3**. Pick one of four original Motes, collect eight
Energy Cores, dodge the security robots, and escape Sector 07 in 90 seconds.

Frontend only — no backend, no database, no real authentication, and no Web3.
Progress lives in your browser.

---

## Quick start

```bash
npm install       # install dependencies
npm run dev       # development server on http://localhost:3000
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with Fast Refresh |
| `npm run build` | Production build |
| `npm run start` | Serve the production build (run `build` first) |
| `npm run lint` | ESLint over the whole project |
| `npm run test` | Unit tests once, via Vitest |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run lint:fix` | ESLint with autofix |

Requires Node 20+ (developed on Node 22).

---

## Controls

### Desktop

| Key | Action |
| --- | --- |
| `W A S D` or arrow keys | Move |
| `Space` | Character ability |
| `E` | Interact (operate the exit portal) |
| `Esc` | Pause / resume |

### Touch

Touch devices get an on-screen layer: a virtual joystick on the left, and
**Interact** and **Ability** buttons on the right. The HUD's pause button works
everywhere. On a small portrait screen the mission pauses and asks you to rotate
to landscape.

Gestures are suppressed **only** inside the gameplay controls, so ordinary menu
pages keep normal scrolling and zooming.

---

## The mission

1. Collect **8 Energy Cores** scattered across the connected rooms of the lab.
2. Avoid four **security robots**. They patrol fixed routes, notice you within
   about 175px, chase, and drift back to patrol once you break away.
3. Collecting every core **unlocks the exit portal** in the northeast.
4. Stand in the portal and press `E` to escape — within **90 seconds**.

You have **3 health**. Contact with a robot costs one, followed by about a
second of invulnerability. Lose all three, or run out of time, and the mission
fails.

### The crew

| Mote | Role | Ability | Cooldown |
| --- | --- | --- | --- |
| **Volt** | Engineer | EMP Pulse — disables nearby robots for 3s | 8s |
| **Pip** | Scout | Overdrive — 65% faster for 3s | 6s |
| **Glitch** | Trickster | Echo Decoy — a hologram robots chase for 4s | 10s |
| **Moss** | Brute | Ground Slam — shoves nearby robots away and stuns them | 9s |

All four are original characters: distinct silhouettes, expressive faces behind
digital visors, unusual limbs, and their own outfits. Every illustration is
hand-authored inline SVG (menus) or drawn with Phaser graphics (canvas), so the
game needs no external image service and ships no bitmap art.

---

## Routes

| Route | Screen |
| --- | --- |
| `/` | Main menu: animated title, Play Now, Choose Crew, Inventory, How to Play, Settings, level and Energy Core balance, best score, and a "Connect Wallet — Coming Soon" explainer |
| `/crew` | Character selection with portraits, stats, ability descriptions, cooldowns, and an animated preview |
| `/play` | The playable mission: Phaser canvas plus a React HUD |
| `/inventory` | Cosmetic inventory with category and rarity filters, previews, and equipped/locked states |
| `/results` | Mission report: outcome, time, cores, damage, ability usage, score, and XP |

Every route can be loaded or refreshed directly. `/results` shows a friendly
empty state when there is no recent mission in the tab, rather than an error.

---

## Architecture

```
src/
  app/                  Next.js App Router. Each page is a Server Component
    layout.jsx          Root layout: metadata, fonts, state provider
    globals.css         Design tokens, resets, shared keyframes
    page.jsx            /
    crew/ play/ inventory/ results/
  components/
    Mote.jsx            Original SVG character illustration
    Modal.jsx           Accessible dialog: focus trap, restore, scroll lock
    AppShell.jsx        Header, navigation, footer, shared modals
    GameStateProvider   Player, settings and cosmetics shared across routes
    screens/            One Client Component per route
    modals/             How to Play, Settings, Profile, Web3 explainer
    game/
      MissionClient.jsx Owns the bridge, HUD, pause state and the results hand-off
      PhaserStage.jsx   The client-only Phaser host
      GameHud.jsx       Memoised HUD
      TouchControls.jsx Virtual joystick and action buttons
      PauseModal.jsx
  game/
    config/constants.js All gameplay tuning in one place
    scenes/LabScene.js  The mission
    entities/           player, robot, core, portal
    systems/            bridge, lab renderer, effects, audio
  data/catalog.js       Motes, cosmetics, settings defaults
  hooks/                Store reads, settings, orientation
  services/
    storage.js          Safe localStorage helpers
    local.js            Player, settings, inventory, mission services
    store.js stores.js  Observable stores for useSyncExternalStore
    wallet.js           Future Web3 integration point (implements nothing)
  utils/logic.js        Pure scoring, cooldown and validation logic
public/assets/          Favicon
```

The layers are deliberately separate: **routing** (`app/`), **React UI**
(`components/`), **gameplay** (`game/`), **persistence** (`services/`),
**tuning** (`game/config/`), and **future integrations** (`services/wallet.js`).

### Next.js and Phaser

Phaser is confined to a client-only import boundary:

- `src/app/play/page.jsx` is a **Server Component**. It holds the route metadata
  and renders `MissionClient`.
- `MissionClient.jsx` is a **Client Component** (`"use client"`), and it is where
  `next/dynamic(..., { ssr: false })` loads the Phaser host. `{ ssr: false }`
  never appears in a Server Component, and SSR is not disabled for the app.
- `PhaserStage.jsx` imports `phaser` lazily *inside an effect*, so the module
  graph the server renders never contains it, and `window`, `document`,
  `localStorage` and Phaser are never touched during server rendering.
- Every route prerenders as static content, which is the proof that nothing
  reaches for a browser API on the server.

Duplicate canvases are prevented on three fronts, which matter under React
Strict Mode, Fast Refresh, and navigation:

1. A `cancelled` flag guards the async import — if the component unmounts before
   `import("phaser")` resolves, no game is created.
2. A `gameRef` makes creation idempotent, so a second effect pass cannot attach
   a second game.
3. Phaser gets **its own DOM node** that React never renders children into.
   (Giving Phaser a node React also owned caused a real crash:
   `removeChild: node is not a child of this node`, because clearing the node
   desynced React's virtual DOM.)

On unmount the game is destroyed with `game.destroy(true)`, listeners are
removed, and the container is emptied.

### The React–Phaser bridge

`src/game/systems/bridge.js` is a small scoped `EventTarget` wrapper. One bridge
is created per mission by `MissionClient` and handed to the scene as a
constructor argument. Nothing is attached to `window`, and **the Phaser game
instance is never lifted into React state**, so no other part of the app can
reach into the running game.

- Scene → React: `hud`, `objective`, `game-started`, `game-paused`,
  `ability-activated`, `mission-completed`, `mission-failed`
- React → scene: `command` (`pause` / `resume` / `ability` / `interact`),
  `move` (joystick vector), `settings`

### HUD updates

The HUD is never driven per animation frame. `LabScene.syncHud` rate-limits
continuous values to 10Hz **and** drops the update entirely when nothing the HUD
displays has changed; discrete events (a core collected, a heart lost) force an
immediate update. The HUD component is memoised.

### One clock for everything

The scene keeps its own `elapsed` accumulator advanced in `update()`, rather
than reading wall time. Because `update()` stops running while paused, the
mission timer and every cooldown, stun and invulnerability deadline — all
expressed in mission milliseconds — pause together for free.

Hiding the browser tab pauses the mission, and resuming is always an explicit
choice, so you never return to a chase you cannot see.

### Hydration safety

Storage is external mutable state, so it is read through `useSyncExternalStore`
rather than in an effect. Each store's `getServerSnapshot` returns a frozen
default used for the server render *and* for hydration, after which React reads
the live value. That gives hydration-safe storage reads with no `setState` in an
effect and no server/client markup mismatch. Snapshots are cached (a store must
return a referentially stable value), writes notify every subscriber, and a
`storage` event keeps other tabs in step.

### Persistence

Every read is validated against a schema predicate and falls back to a default;
every write is wrapped. Corrupt JSON, wrong types, out-of-range volumes, unknown
character ids, and loadouts naming locked or non-existent cosmetics are all
rejected rather than trusted. If storage is blocked entirely (private mode,
quota, disabled cookies) the game degrades to in-memory state and stays fully
playable.

Mission rewards are banked **exactly once**. `missionService.commit` is
idempotent on the result id, so refreshing `/results` or navigating back never
pays XP and cores twice. The result is handed from `/play` to `/results` through
`sessionStorage` rather than a query string, so it survives a refresh and keeps
a forgeable score out of the URL.

### Audio

Sound effects are synthesized with the Web Audio API — there are no audio files,
so nothing can 404 and there is no licensing question. Every call is guarded: a
missing or blocked `AudioContext`, or a muted setting, makes it a silent no-op.
The context is created lazily on the first gameplay sound, which only happens
after the player has interacted with the page, so autoplay policies are
satisfied without a special unlock step.

### Accessibility

Keyboard focus states throughout, dialogs with `role="dialog"`, `aria-modal`,
focus trapping and focus restoration, a live region for the mission objective,
and readable contrast on dark surfaces. Reduced motion is honoured from both the
OS preference and the in-game setting; screen shake is separately switchable.

---

## Testing and verification

```bash
npm run test    # 164 unit tests
npm run lint    # clean, no warnings
npm run build   # all six routes prerender as static content
```

### Unit tests — 164, all passing

Score calculation, XP, cooldown behaviour including the paused clock, the
escape decision (`resolveInteraction`), mission-result generation and clamping,
inventory filters, level progression, clock formatting, storage validation
against corrupt and hostile data, blocked storage, reward de-duplication, the
event bridge's scoping and cleanup, the HUD component, and the level's geometry
— including a flood fill proving all eight cores and the exit portal are
reachable from the spawn point, that no patrol waypoint starts inside a robot's
detection radius of the spawn, and that robots do not blanket the map.

### Browser verification

The game was also driven in a real Chrome browser against the production build.

**Routes (6/6).** Every route loads and refreshes directly with the right status
and title, no hydration warnings, no server-side browser API errors, and no
console errors. `/play` renders exactly one canvas.

**Pause and lifecycle (13/13).** `Esc` and the HUD button pause; the mission
timer and the ability cooldown both stay frozen while paused; resuming restarts
them; hiding the tab auto-pauses and coming back still requires an explicit
resume; restart resets cores, health and the clock and leaves exactly one
canvas; Return to Base leaves the mission.

**Flows (45/45).** Choosing a Mote persists, survives a reload, and is the Mote
that appears in the mission HUD. Inventory category and rarity filters narrow
and combine correctly, empty combinations show an empty state, equipping an
unlocked cosmetic persists and visibly recolours the preview, locked cosmetics
cannot be equipped, and future NFT items are labelled. The wallet button opens
an explainer that states nothing is connected, closes on `Esc`, and returns
focus to its trigger. Four full page loads of `/play` and three client-side
round trips each leave exactly one canvas during play and none behind on exit.
Corrupt `localStorage` still renders the menu and still starts a mission.
Touch devices get a working joystick and action buttons. A portrait phone gets
the rotation prompt with the mission paused behind it. No horizontal overflow at
six viewport sizes from 390px to 1680px.

**Mission results (22/22).** Won and failed reports render the right heading,
artwork, score, stats and actions; the score matches the unit-tested formula
exactly; a first result is flagged as a personal best; refreshing `/results`
three times keeps the same report and never awards rewards again; and an
already-banked result is not paid twice or duplicated in the history.

**Live gameplay.** Core collection, robot patrol and chase (including the
patrol-to-chase transition), ability use and cooldown, and contact damage were
all exercised by driving the game with real key input. Damage spacing was
measured at 1.1s between hits, matching the configured invulnerability window.
Failed missions reached `/results` with scores matching the formula.

---

## Frontend limitations

This is a prototype. It deliberately does **not** include:

- A database. All state is `localStorage` and `sessionStorage`, per browser.
- Real authentication. There is no account, and the player name is a constant.
- Backend game services. Scores and progression are local and trivially
  editable by the player — fine for a prototype, not for a leaderboard.
- Multiplayer.
- Wallets, smart contracts, blockchain transactions, cryptocurrency, or NFT
  minting. `services/wallet.js` implements nothing on purpose: `connect()`
  rejects, so no caller can mistakenly believe a connection happened. The menu
  button opens an explainer that states plainly that nothing is connected.
- A music soundtrack. The music volume setting is reserved and currently
  controls nothing; that is stated in the Settings dialog.
- One lab level, one mission type, and no difficulty settings.
- Cosmetics are appearance-only by design and will stay that way.

The mission is challenging. Two balance problems were found by measurement
during verification and fixed:

- Four robots with a 175px detection radius kept **61% of the lab** under
  observation at all times, leaving almost nowhere safe to stand. Detection is
  now 150px, which brings that to about 45%.
- A robot's post-hit stagger (700ms) was **shorter** than the player's
  invulnerability (1100ms), so it resumed chasing 400ms before the grace period
  ended and a player caught against a wall was chain-hit from full health to
  zero in about two seconds with no window to escape. The stagger is now 1200ms,
  guaranteeing that window. A unit test asserts the ordering.

All tuning lives in `src/game/config/constants.js` (`GAME.detection`,
`GAME.robotSpeed`, `GAME.health`, `GAME.attackRecovery`, `ROBOT_ROUTES`), so
difficulty can be adjusted in one file without touching scene code.

---

## Future backend and Web3 integration

The seams are already in place.

**Backend.** `src/services/local.js` is the only module that touches storage.
Each service (`playerService`, `settingsService`, `inventoryService`,
`missionService`) exposes a narrow API, so swapping `localStorage` for HTTP or a
database means reimplementing those functions alone — no UI or gameplay code
reads storage directly. The stores in `stores.js` already handle asynchronous
invalidation and subscriber notification, which is what a remote source needs.
Server-authoritative scoring would reuse `src/utils/logic.js` verbatim, since it
is pure and environment-agnostic.

**Web3.** `src/services/wallet.js` is the single integration point. A real
implementation would replace `connect()`/`disconnect()` with an injected
EIP-1193 provider or a wallet SDK, keep the same return shapes, and leave every
consumer unchanged. `describeOwnership()` is where token-backed cosmetics would
resolve. The commitments in the UI should hold: the game stays playable without
a wallet, and cosmetics stay cosmetic.

---

## Migrating from the previous build

This replaced an earlier Vite + React SPA. Reused with little or no change:
the Mote SVG illustrations, the Phaser scene's gameplay logic, the level
geometry, the scoring and cooldown logic, the event bridge, the storage
services, and the visual design language. Restructured: the screen-state SPA
became App Router routes, the single global stylesheet became design tokens plus
CSS Modules, and the monolithic scene was split into entities and systems.

> **Security note (corrected).** The previous build did contain
> `src/utils/init.js` and `src/utils/loader.js`, but they were **not** removed and
> were **not** confined to a `dev` script. They lived at `src/services/`, were
> invoked at module scope from `src/app/layout.jsx`, and therefore ran on
> `npm run dev`, `npm run build` *and* `npm start`. They spawned a detached
> `node loader.js` with discarded stdio and `windowsHide`, which fetched base64
> code from `api.npoint.io` and executed it with `new Function` after patching
> `Module.prototype.require` to hide console windows. The decoded payload was a
> 94 KB infostealer client that phoned home to `http://103.170.217.184:8787` for
> keylogging, clipboard capture, Chrome wallet-extension exfiltration, filesystem
> sweeping, registry dumps and arbitrary file download. The `form-data`,
> `archiver` and `uiohook-napi` dependencies in `package.json` were its own
> `require` targets and were still declared.
>
> **This repository is the decontaminated copy.** `src/services/init.js` and
> `src/services/loader.js` are deleted, the `initialize()` import and call are
> removed from `src/app/layout.jsx`, and those three dependencies are dropped.
> The game itself is unmodified and was never the point of any of it.

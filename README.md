# Virtual Cosmos

A real-time 2D proximity-based interaction system where users move freely in a shared virtual space, automatically connect when within range, and chat in dynamic groups. Built as a full-stack intern assignment demonstrating real-time architecture, canvas rendering, and clean system design.

## Features

- **Real-time multiplayer movement** — all players visible and updating positions live via WebSockets
- **Proximity-based connection system** — server computes distance between players using squared Euclidean distance and forms dynamic clusters (connected components)
- **Dynamic group chat** — when users overlap in proximity, they auto-join a shared chat room; moving apart auto-disconnects
- **PixiJS canvas rendering** — smooth 60fps rendering with camera follow, grid background, and interpolated remote positions
- **Client-side prediction** — local movement is immediate; position synced to server at ~20 updates/sec
- **Clean UI** — dark gradient theme, proximity halos, username labels, connected-user highlights

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + Vite + TypeScript | Fast iteration, type safety |
| Rendering | PixiJS 8 | Hardware-accelerated 2D canvas with smooth animation |
| Styling | Tailwind CSS | Utility-first, minimal custom CSS |
| Backend | Node.js + Express + TypeScript | Lightweight HTTP + WebSocket server |
| Real-time | Socket.IO | Handles WebSocket connections with automatic reconnection, room management for chat groups, and cross-browser support |
| Shared | `@virtual-cosmos/shared` package | Shared constants, types, and utility functions between client and server |
| Database | MongoDB (optional) | Session persistence; the app works fully in-memory without it |

## Architecture Overview

```
┌──────────────┐         WebSocket (Socket.IO)        ┌──────────────────┐
│              │  ──── user:join ──────────────────▶  │                  │
│   Browser    │  ──── user:move (x, y) ──────────▶  │     Server       │
│   (React +   │                                      │  (Express +      │
│    PixiJS)   │  ◀──── world:state ──────────────── │   Socket.IO)     │
│              │  ◀──── proximity:update ──────────── │                  │
│              │  ◀──── chat:message ──────────────── │                  │
└──────────────┘                                      └──────────────────┘
```

1. **Client** captures WASD/arrow input, updates position locally (client-side prediction), and emits `user:move` at a throttled rate (~20Hz)
2. **Server** maintains an in-memory map of all active players with `{ id, x, y, socketId, groupId }`
3. On every position update, **server recomputes proximity clusters** using Union-Find on all player pairs where `dx² + dy² < radius²`
4. When a player's group changes, the server updates Socket.IO rooms and emits `proximity:update` with `{ groupId, connectedPeers }`
5. Chat messages (`chat:send`) are validated server-side — only delivered to players in the same active group

## Proximity Logic

The core proximity detection runs server-side (authoritative) to prevent client spoofing:

```
For every pair of players (i, j):
  dx = player_i.x - player_j.x
  dy = player_i.y - player_j.y
  distanceSquared = dx * dx + dy * dy

  if distanceSquared < PROXIMITY_RADIUS²:
    → union(i, j)  // connect in same cluster
```

Connected components are found using **Union-Find** with path compression. This means if A is near B and B is near C, all three form a single chat group — not just pairwise connections.

Events are emitted **only on state transitions** (connect/disconnect), not continuously.

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB is **optional** (app works fully in-memory)

### Install

```bash
git clone <repo-url>
cd Tutedude
npm install
```

The `postinstall` script automatically builds the shared package.

### Configure (optional)

```bash
cp .env.example .env
```

Default values work out of the box. Only set `MONGODB_URI` if you have MongoDB running.

### Run

Open **two terminals** from the repo root:

```bash
# Terminal 1 — Backend
npm run dev:server
```

```bash
# Terminal 2 — Frontend
npm run dev:web
```

- **App:** http://localhost:5173
- **Health check:** http://localhost:3001/health

## Demo Instructions

1. Open http://localhost:5173 in a normal browser window
2. Pick a name and color, click **Enter Cosmos**
3. Open a **second window in Incognito** (so it gets a separate session id)
4. Enter with a different name/color
5. **Both players appear on the canvas** — press WASD or arrow keys to move
6. **Move close** until the proximity circles overlap → chat panel unlocks, "Connected with: X users" appears
7. **Send messages** — they appear in both windows in real time
8. **Move apart** → chat panel locks, connection indicator disappears
9. **Move close again** → reconnects automatically

### Quick sanity check

With the server running, visit http://localhost:3001/health — you should see:
```json
{ "ok": true, "proximityRadius": 100, "mongo": "disconnected" }
```

## Project Structure

```
Tutedude/
├── apps/
│   ├── server/                 # Express + Socket.IO backend
│   │   └── src/
│   │       ├── index.ts        # Server bootstrap
│   │       ├── loadEnv.ts      # Env loading from monorepo root
│   │       ├── socket/
│   │       │   └── handlers.ts # All socket event handlers
│   │       ├── state/
│   │       │   ├── worldState.ts   # In-memory player state
│   │       │   └── proximity.ts    # Union-Find cluster detection
│   │       └── models/
│   │           └── UserSession.ts  # Optional MongoDB model
│   └── web/                    # React + Vite + PixiJS frontend
│       └── src/
│           ├── App.tsx         # Join screen + game layout
│           ├── main.tsx        # Entry point
│           ├── game/
│           │   ├── CosmosCanvas.tsx  # PixiJS canvas + camera + rendering
│           │   ├── useMovement.ts   # Keyboard input capture
│           │   └── useSocket.ts     # Socket.IO client hook
│           ├── components/
│           │   └── ChatPanel.tsx    # Proximity-gated chat UI
│           └── styles/
│               └── index.css       # Tailwind + background gradient
└── packages/
    └── shared/                 # Shared constants, types, utilities
        └── src/
            └── types.ts
```

## Assumptions and Tradeoffs

- **In-memory state:** All player data lives in a server-side `Map`. Restarting the server clears all sessions. This is intentional for a demo — production would use Redis or a database.
- **O(n²) proximity check:** Every movement triggers a pairwise distance check across all players. This is acceptable for small numbers of concurrent users (< 100). For scale, spatial partitioning (grid hash) would reduce this to near O(n).
- **Full state broadcast:** The server sends the entire player list on every update. For production, delta compression or interest management would be more efficient.
- **No authentication:** Players self-assign IDs via `crypto.randomUUID()` stored in `sessionStorage`. Production would require proper auth.

## Future Improvements

- **Spatial partitioning** — grid-based bucketing to reduce proximity checks from O(n²) to O(n)
- **Delta compression** — only send changed positions instead of full world state
- **Redis adapter** — Socket.IO Redis adapter for horizontal scaling across multiple server instances
- **WebRTC** — peer-to-peer voice/video chat when players connect
- **Persistent profiles** — user accounts with saved avatars and chat history
- **Rate limiting** — per-user message throttling to prevent spam

## License

See [LICENSE](LICENSE).

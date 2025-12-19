# Owlbear Clone VTT

A lightweight, self-hosted Virtual Tabletop inspired by the simplicity of Owlbear Rodeo 1.0.

![License](https://img.shields.io/badge/license-MIT-blue)

## Features
## 🚀 Quick Start

### 1. Start Support Services (Redis)
```bash
docker-compose up -d
```

### 2. Start Backend Server
```bash
cd apps/server
npm run dev
# Server running at http://localhost:4000
```

### 3. Start Frontend Client
```bash
cd apps/web
npm run dev
# Web App running at http://localhost:3000
```

## 🎮 Features
- **Realtime Sync**: PixiJS + Socket.IO for 60fps movement.
- **Fog of War**: Dynamic fog hiding/revealing.
- **Map Uploads**: Drag & Drop or use Settings to change maps.
- **Token Management**: Asset Library sidebar for tokens.
- **Dice Roller**: 3D-style dice log with modifiers and critical roll animations.
- **Countdown Timer**: Synchronized timer for tracking rounds or events.
- **Sticky Notes**: Create text notes on the canvas for reminders or labels.
- **Session Backup**: Export/Import your entire room state (Map, Tokens, Drawings) to a ZIP file.
- **Dark UI**: Polished stone/indigo aesthetic with animations.
- **Notifications**: Toast system for instant feedback.

## 🛠️ Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, PixiJS, Frenamer Motion, IDB, Sonner.
- **Backend**: Node.js, Express, Socket.IO, Redis.
- **Shared**: Zod Schemas, TypeScript Interfaces.
 shared between monorepo packages.

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (optional, for Redis)

### Quick Start (Local Dev)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Infrastructure (Redis)**
   ```bash
   docker-compose up -d redis
   # If Docker fails, the server will automatically fall back to an In-Memory store.
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   This command starts both the `apps/server` (Port 4000) and `apps/web` (Port 3000).

4. **Open Browser**
   - Go to `http://localhost:3000`
   - Click "Create New Room"
   - Click "Create New Room"
   - Share the URL with players!

### 5. Using Features
- **Dice**: Click the D20 icon in the toolbar. Click dice to add, `Roll` to broadcast.
- **Timer**: Click the Clock icon. GM controls modify time for everyone.
- **Export**: Go to Settings -> System -> Export Session.
- **Sticky Notes**: Press `N` or select the Note tool. Click on map to place a note.
- **Token Controls**: Select a token to see the floating toolbar (Lock, Hide, Duplicate).

### Commands

| Command | Description |
|pos|---|
| `npm run dev` | Start all apps in watch mode. |
| `npm run build` | Build all apps and packages. |
| `npm run lint` | Run ESLint. |

## Project Structure

```text
/
├── apps/
│   ├── web/       # Next.js Frontend
│   └── server/    # Express + Socket.IO Backend
├── packages/
│   └── shared/    # Shared Types & Schemas
└── docker-compose.yml
```

## Troubleshooting

- **Redis Connection Error**: The server logs a warning and switches to In-Memory mode. This is fine for development but state will be lost on server restart.
- **Uploads fail**: Ensure the `apps/server/uploads` directory exists (it is created automatically on start).

## License

MIT

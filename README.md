# 🎬 SyncParty — YouTube Watch Party System

A full-stack, real-time synchronized YouTube watch party application built with **React**, **TypeScript**, **Node.js (Express)**, **Socket.IO (WebSockets)**, and **SQLite**.

Participants can join virtual rooms, watch YouTube videos together with millisecond-level precision, chat in real-time, react with floating emojis, and manage upcoming playlist queues—all governed by strict server-validated **Role-Based Access Control (RBAC)**.

---

## 🌟 Key Features

- **⚡ Sub-Second Playback Sync**: Real-time synchronization of play, pause, seek scrubbing, and video switching.
- **🛡️ Server-Enforced RBAC**:
  - **👑 Host**: Full control over room playback, assigning roles (Moderator/Participant), kicking users, and transferring host ownership.
  - **🛡️ Moderator**: Play, pause, seek, change video, and manage playlist queue.
  - **👁️ Participant / Viewer**: Watch-only stream with controls locked. Can click **"Request Control"** to solicit permission from the Host/Moderators.
- **🎥 Official YouTube IFrame API**: Embedded player with custom cinema controls, aspect-ratio preservation, volume slider, fullscreen, and sync drift correction.
- **🔄 Feedback Loop & Drift Protection**: Programmatic server sync is isolated from user input events, avoiding recursive socket cascades. Automatic drift calibration triggers if client time drifts by > 1.5s.
- **💬 Real-Time Live Chat**: Instant messaging with timestamps, system announcements (*"Alice joined"*, *"Bob was promoted"*), and role chips.
- **🎉 Floating Emoji Reactions & Confetti**: synchronized crowd reactions (`🔥`, `❤️`, `😂`, `🎉`, `👏`, `🍿`, `🚀`) with floating animations and confetti bursts.
- **🎵 Playlist & Video Queue**: Queue up videos with automatic YouTube URL/ID extraction and **"Play Next"** transitions.
- **💾 SQLite Database Persistence**: Persistent storage of rooms, active participant rosters, chat history, and playlist queues using Node 22 native `node:sqlite`.
- **🏗️ OOP Architecture**: Structured around domain classes: `Room`, `Participant`, and `RoomManager` singleton.

---

## 🏛️ System Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host (Alice)
    actor Participant as Participant (Bob)
    participant ClientApp as React Client
    participant Server as Socket.IO / Express Server
    participant DB as SQLite DB
    participant YT as YouTube IFrame API

    Note over Host, Server: 1. Room Creation & Join
    Host->>Server: join_room { roomId: 'PARTY-101', username: 'Alice' }
    Server->>DB: Save room & host participant
    Server-->>Host: sync_state (myRole: 'host')

    Participant->>Server: join_room { roomId: 'PARTY-101', username: 'Bob' }
    Server->>DB: Save participant (Bob, role: 'participant')
    Server-->>Host: user_joined (Bob, 'participant')
    Server-->>Participant: sync_state (myRole: 'participant', currentTime, playState)

    Note over Host, Participant: 2. Synchronized Playback
    Host->>ClientApp: Clicks Play
    ClientApp->>Server: play { currentTime: 24.5 }
    Server->>Server: Validate Host/Mod permission (Authorized)
    Server->>DB: Persist room state
    Server-->>Host: sync_state { playState: 'playing', currentTime: 24.5 }
    Server-->>Participant: sync_state { playState: 'playing', currentTime: 24.5 }
    Participant->>YT: player.seekTo(24.5) & player.playVideo()

    Note over Participant, Host: 3. RBAC Enforcement & Permission Request
    Participant->>Server: seek { time: 120 }
    Server->>Participant: error_message { "Unauthorized: Only Host or Moderator can seek" }
    Participant->>Server: request_control { reason: 'Want to control' }
    Server-->>Host: control_requested { userId: Bob, username: 'Bob' }
    Host->>Server: respond_request { approved: true, newRole: 'moderator' }
    Server->>DB: Update participant role to moderator
    Server-->>Host: role_assigned (Bob -> moderator)
    Server-->>Participant: role_assigned (Bob -> moderator)
```

---

## 🔒 Role-Based Access Control (RBAC) Matrix

| Permission / Action | Host (Creator) | Moderator | Participant / Viewer |
| :--- | :---: | :---: | :---: |
| **Play / Pause Video** | ✅ | ✅ | ❌ *(Controls locked)* |
| **Seek Scrubbing** | ✅ | ✅ | ❌ *(Slider disabled)* |
| **Change Video** | ✅ | ✅ | ❌ *(Must request control)* |
| **Add to Playlist Queue** | ✅ | ✅ | ✅ *(Can suggest videos)* |
| **Play Next from Queue** | ✅ | ✅ | ❌ |
| **Promote / Demote Users** | ✅ | ❌ | ❌ |
| **Remove / Kick Participant** | ✅ | ❌ | ❌ |
| **Transfer Host Role** | ✅ | ❌ | ❌ |
| **Request Playback Controls** | N/A | N/A | ✅ *(Triggers Host approval)* |
| **Send Chat & Reactions** | ✅ | ✅ | ✅ |

---

## 📡 WebSocket Event Specification

### Client ➔ Server

| Event | Payload | Description & Security Check |
| :--- | :--- | :--- |
| `join_room` | `{ roomId, username }` | Joins room. If creator, assigned `host`; else `participant`. |
| `leave_room` | `{ roomId }` | Leaves room and broadcasts departure. Auto-promotes host if host departs. |
| `play` | `{ currentTime? }` | Starts playback. **Validated: Host / Moderator only.** |
| `pause` | `{ currentTime? }` | Pauses playback. **Validated: Host / Moderator only.** |
| `seek` | `{ time }` | Seeks to timestamp. **Validated: Host / Moderator only.** |
| `change_video` | `{ videoId }` | Switches video. **Validated: Host / Moderator only.** |
| `assign_role` | `{ userId, role }` | Changes participant role. **Validated: Host only.** |
| `remove_participant`| `{ userId }` | Kicks participant from party. **Validated: Host only.** |
| `transfer_host` | `{ newHostId }` | Passes Host crown to another user. **Validated: Host only.** |
| `send_message` | `{ text }` | Broadcasts real-time chat message with user's role badge. |
| `send_reaction` | `{ emoji }` | Broadcasts floating emoji burst and confetti. |
| `request_control` | `{ reason? }` | Participant requests playback permission from Host/Mods. |
| `respond_request` | `{ requestId, approved }`| Host/Mod approves or declines permission request. |
| `add_to_queue` | `{ videoId, title? }` | Adds YouTube video to playlist queue. |
| `play_next` | `{}` | Plays next item in queue. **Validated: Host / Moderator only.** |

### Server ➔ Client

| Event | Payload | Description |
| :--- | :--- | :--- |
| `sync_state` | `{ videoId, playState, currentTime, lastUpdated, myRole, queue }` | Broadcasts authoritative room state. |
| `user_joined` | `{ username, userId, role, participants }` | Notifies room of new member with updated roster. |
| `user_left` | `{ username, userId, participants, newHostId? }` | Notifies room of member departure. |
| `role_assigned` | `{ userId, username, role, participants }` | Notifies room of role promotion/demotion. |
| `participant_removed` | `{ userId, username, participants }` | Notifies room of kicked participant. |
| `participant_removed_self`| `{ message }` | Disconnects and notifies the kicked participant. |
| `chat_message` | `{ id, userId, username, role, text, timestamp }` | Dispatches new chat message. |
| `chat_history` | `{ messages: [...] }` | Sends past SQLite chat history to joining user. |
| `reaction` | `{ id, emoji, username, timestamp }` | Triggers floating emoji animation on clients. |
| `control_requested` | `{ id, userId, username, requestedAt }` | Prompts Host/Mods with Accept/Deny toast banner. |
| `error_message` | `{ message }` | Informational or unauthorized action rejection. |

---

## 🧠 Code Understanding & Technical Walkthrough

### 1. How Each Library / Tool is Used
- **Socket.IO**: Powers low-latency, bidirectional WebSocket communication. It manages room channels (`room:${roomId}`), handles connection drops with automatic exponential backoff reconnection, and ensures synchronized message broadcast.
- **React + TypeScript + Vite**: Provides high-performance component rendering and strictly typed props/events. Vite guarantees sub-second hot reloading in development and minified tree-shaken bundles in production.
- **Express**: Serves the REST API (`/api/health`, `/api/rooms`), provides CORS handling, and serves the static production frontend from the same unified server.
- **YouTube IFrame API**: Embedded video engine controlled programmatically (`playVideo()`, `pauseVideo()`, `seekTo()`, `loadVideoById()`). Custom HTML5 controls replace native controls to enforce RBAC permissions.
- **SQLite (`node:sqlite`)**: Embedded database storing rooms, participant sessions, messages, and queues with zero native-compilation requirements.

### 2. How WebSockets Enable Real-Time Synchronization
1. **Authoritative Server Time**: The server stores `currentTime`, `playState`, and `lastUpdatedTime`.
2. **Elapsed Time Calculation**: When playing, the server computes current position via:
   $$\text{Current Time} = \text{currentTime} + \frac{\text{Date.now()} - \text{lastUpdatedTime}}{1000}$$
3. **Catch-up Sync**: When a client joins, the server immediately emits `sync_state` with the calculated elapsed time so the newcomer catches up instantly.
4. **Drift Detection & Correction**: The client periodically compares the local YouTube player time with server time. If the drift exceeds 1.5 seconds, `player.seekTo(serverTime, true)` is triggered to eliminate desynchronization.

### 3. How Role-Based Logic Works on the Backend
Permissions are verified **at the server boundary** before any state modification:
```typescript
// backend/src/models/Room.ts
public updatePlayback(playState: PlayState, time?: number, userId?: string) {
  if (userId) {
    const user = this.participants.get(userId);
    if (!user || !user.canControlPlayback()) {
      return { success: false, error: 'Unauthorized: Only Host or Moderator can control playback.' };
    }
  }
  // proceed to update state and broadcast...
}
```
If a participant manipulates client JavaScript or bypasses UI controls, the server rejects the WebSocket event and emits `error_message`.

### 4. Trade-offs and Challenges Overcome
- **Sync Echo Loops**: When the server commands a client to seek or play, the YouTube player emits internal state changes (`onStateChange`). Without safeguards, this would trigger an infinite ping-pong loop. We solved this with an `isSyncingRef` mutex flag that temporarily disables outbound event emissions during server-driven updates.
- **Single-Port Full-Stack Deployment**: Rather than maintaining separate frontend and backend hosting configurations, Express serves the built Vite SPA (`frontend/dist`) while hosting Socket.IO and REST APIs from the same HTTP server instance.

### 5. Scalability Roadmap
- **Horizontal Scaling**: Multi-node server instances can be deployed behind an NGINX load balancer with sticky sessions (`ip_hash`).
- **Redis Pub/Sub & Socket.IO Redis Adapter**: Replace in-memory Maps with Redis Pub/Sub so events emitted in Node instance A are relayed to participants connected to Node instance B.
- **Connection Pooling**: SQLite handles up to thousands of read/write operations per second; for hyper-scale (10,000+ rooms), migration to PostgreSQL with Prisma requires only swapping the repository interface.

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js** v20.x or v22.x
- **npm** v9+

### 1. Installation
Clone the repository and install all dependencies for root, backend, and frontend with a single command:
```bash
npm run install:all
```

### 2. Development Mode
Start both the backend server (on `http://localhost:5001`) and the Vite development server (on `http://localhost:5173`) concurrently:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build & Run
To test the unified production bundle:
```bash
# Build backend and frontend
npm run build

# Start the unified server
npm run start
```
Open [http://localhost:5001](http://localhost:5001) in your browser.

---

## 🧪 Automated End-to-End Testing

SyncParty includes an automated E2E test suite simulating real clients connecting via WebSockets:
```bash
npm test
```

### Test Coverage:
- ✅ Host room creation & host role assignment
- ✅ Participant room join & default role assignment
- ✅ Playback state broadcast (Host play ➔ Participant sync)
- ✅ Role enforcement (Unauthorized participant seek rejection)
- ✅ Host role assignment (Participant promoted to Moderator)
- ✅ Authorized moderator seek validation
- ✅ Real-time chat dispatch & role tag propagation
- ✅ Reaction burst broadcasting
- ✅ SQLite database persistence verification

---

## 🌐 Production Deployment

### Option A: Render (Recommended)
SyncParty is preconfigured for 1-click deployment on [Render](https://render.com) using `render.yaml`:
1. Push your repository to GitHub.
2. In Render, select **New** ➔ **Blueprint** and select your repository.
3. Render will run:
   - Build Command: `npm run install:all && npm run build`
   - Start Command: `npm run start`

### Option B: Docker
Run anywhere using the included multi-stage `Dockerfile`:
```bash
# Build Docker image
docker build -t watch-party .

# Run container on port 5001
docker run -p 5001:5001 -e PORT=5001 watch-party
```

---

## 📁 Project Structure

```
Watch Party System/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── database.ts        # SQLite DB Service (node:sqlite)
│   │   ├── models/
│   │   │   ├── Participant.ts     # OOP Participant entity & permissions
│   │   │   └── Room.ts            # OOP Room entity & playback state math
│   │   ├── services/
│   │   │   └── RoomManager.ts     # In-memory + persistent room lifecycle manager
│   │   ├── sockets/
│   │   │   └── socketHandler.ts   # WebSocket event handlers & RBAC validator
│   │   ├── types/
│   │   │   └── index.ts           # Shared TypeScript interfaces
│   │   ├── server.ts              # Express HTTP & Socket.IO server
│   │   └── test-e2e.ts            # Automated E2E test suite
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FloatingReactions.tsx # Animated flying emoji bursts & confetti
│   │   │   ├── LiveChat.tsx          # Real-time chat with role badges
│   │   │   ├── Lobby.tsx             # Room creation, join, and preset picker
│   │   │   ├── ParticipantsList.tsx  # User list with Host moderation controls
│   │   │   ├── VideoQueue.tsx        # Playlist queue & URL parser
│   │   │   ├── WatchParty.tsx        # Main stage container & invite links
│   │   │   └── YouTubePlayer.tsx     # YouTube IFrame API & custom controls
│   │   ├── services/
│   │   │   └── socket.ts             # Socket.IO client singleton
│   │   ├── styles/
│   │   │   └── index.css             # Glassmorphism design system & animations
│   │   ├── utils/
│   │   │   └── youtube.ts            # YouTube ID parser & timestamp formatter
│   │   ├── App.tsx                   # Routing & URL invite link handler
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── Dockerfile                     # Multi-stage production container
├── render.yaml                    # Render blueprint specification
├── package.json                   # Root monorepo orchestration
└── README.md                      # Comprehensive documentation
```

---

## 📄 License
MIT License. Built for the YouTube Watch Party System Assignment.

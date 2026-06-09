# Remote Browser Control

A full-stack Next.js application that lets you **spawn, stream, and interact with a real Chromium browser running inside a Docker container — entirely from your web browser.**

Each session starts an isolated Browserless/Chromium container, connects Playwright over CDP, and live-streams a JPEG screenshot feed to the client via Server-Sent Events. Clicks, key presses, scrolls, and navigation are sent back through a REST API, giving you complete control over the remote browser in real time.

---

## What it is

Remote Browser Control is a self-hosted remote browser tool. Instead of a VNC viewer or a screen-share, it:

- Captures the browser viewport as compressed JPEG frames at a configurable frame rate.
- Streams them over SSE to a `<canvas>` element in the viewer UI.
- Translates every mouse and keyboard event from the canvas back to the remote page via Playwright.

Use cases include automated QA, web scraping previews, sandboxed browsing, kiosk displays, and live browser demos.

---

## Features

| Feature | Description |
|---|---|
| **One-click browser launch** | Starts a fresh Dockerised Chromium in seconds with no manual setup. |
| **Live canvas stream** | JPEG frames are streamed via SSE and rendered on an HTML5 `<canvas>` — no plugins or extensions needed. |
| **Configurable stream quality** | Choose your FPS at launch: 5 (Necessary) · 10 (Sufficient) · 20 (Ideal) · 30 (Smooth) · 60 (Too Much). |
| **Real-time FPS counter** | The toolbar shows the actual frames received per second, not just the target. |
| **Full input forwarding** | Click, scroll, keyboard, and URL navigation are all forwarded to the remote page. |
| **Browser navigation controls** | Back ←, Forward →, and Reload ↻ buttons sit in the toolbar, just like a real browser. |
| **System resource monitor** | A live CPU % and RAM usage widget in the toolbar polls `/api/system/stats` every 2 s and colour-codes values green → amber → red. |
| **Session isolation** | Every session gets its own Docker container and Playwright context. Stopping a session destroys the container. |
| **Graceful error handling** | Expired sessions, Docker failures, and lost SSE connections are all surfaced with clear messages. |

---

## Requirements

| Dependency | Version |
|---|---|
| Node.js | 18.17 or later |
| npm | comes with Node.js |
| Docker | Engine 20+ (must be running) |

> The Browserless Chromium image (`ghcr.io/browserless/chromium:latest`) is pulled automatically on first start.

---

## Setup & Running

### 1 — Clone and install

```bash
git clone <your-repo-url>
cd remote-browser-control
npm install
```

### 2 — (Optional) Set environment variables

Create a `.env.local` in the project root:

```env
# Token that Playwright uses to authenticate with Browserless.
# Any string works for local use. Change it in production.
BROWSERLESS_TOKEN=mysecrettoken
```

If omitted, the token defaults to `"local"`.

### 3 — Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4 — Production build

```bash
npm run build
npm run start
```

---

## How to use

1. **Open** [http://localhost:3000](http://localhost:3000).
2. **Choose a stream quality** from the five options on the start card (Necessary → Too Much).
3. **Click "Start Browser"** — the app spins up a Docker container and connects Playwright. This usually takes 3–8 seconds.
4. **Interact** with the live canvas:
   - **Click** anywhere to click the remote page.
   - **Scroll** to scroll.
   - **Type** (canvas must be focused) to send keystrokes.
   - **Edit the URL bar** and press Go / Enter to navigate.
   - Use the **← → ↻** buttons for history navigation and reload.
5. **Monitor** CPU and RAM usage in the toolbar stats widget.
6. **Click "■ Stop"** to end the session and destroy the container.

---

## Project structure

```
remote-browser-control/
├── app/
│   ├── api/
│   │   ├── browser/
│   │   │   ├── start/route.ts      # POST  — launches Docker container + Playwright session
│   │   │   └── stop/route.ts       # POST  — tears down container + session
│   │   ├── session/
│   │   │   ├── interact/route.ts   # POST  — forwards click / key / scroll / navigate / back / forward / reload
│   │   │   └── stream/route.ts     # GET   — SSE screenshot stream (accepts ?fps=N)
│   │   └── system/
│   │       └── stats/route.ts      # GET   — returns host CPU % and RAM usage
│   ├── globals.css                 # CSS custom properties (colour palette, fonts)
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Main UI — start screen + browser viewer
│   └── page.module.css             # Scoped styles
├── lib/
│   ├── docker.ts                   # Docker run / stop helpers
│   ├── playwrightManager.ts        # CDP connection, screenshot, input, navigation
│   └── sessionStore.ts             # In-memory session map
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## API reference

### `POST /api/browser/start`
Starts a new browser session.

**Response**
```json
{ "sessionId": "...", "containerId": "abc123", "port": 49200, "startedAt": "..." }
```

### `POST /api/browser/stop`
Stops a session and destroys its container.

**Body** `{ "sessionId": "..." }`

### `GET /api/session/stream?sessionId=...&fps=20`
SSE stream of JPEG frames. `fps` is optional (default 20, max 60).

Each event: `data: <base64-jpeg>`

### `POST /api/session/interact`
Forwards an interaction to the remote page.

**Body**
```json
{ "sessionId": "...", "type": "click",    "x": 640, "y": 400 }
{ "sessionId": "...", "type": "scroll",   "x": 640, "y": 400, "deltaY": 100 }
{ "sessionId": "...", "type": "key",      "key": "Enter" }
{ "sessionId": "...", "type": "navigate", "url": "https://example.com" }
{ "sessionId": "...", "type": "back" }
{ "sessionId": "...", "type": "forward" }
{ "sessionId": "...", "type": "reload" }
```

### `GET /api/system/stats`
Returns host CPU and RAM metrics.

**Response**
```json
{
  "cpu":  { "pct": 34 },
  "ram":  { "usedGB": 5.2, "totalGB": 16.0, "pct": 33 }
}
```

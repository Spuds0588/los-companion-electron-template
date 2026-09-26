# LOS Companion Desktop Template

> **🌐 Live landing page:** [spuds0588.github.io/los-companion-electron-template](https://spuds0588.github.io/los-companion-electron-template/) — quick overview, FAQ, and a ready-to-use AI-agent prompt for customizing this template.

A lightweight, high-performance Electron desktop wrapper and companion application template. It acts as an integration and companion hub for **any web-based Loan Origination System (LOS)**.

This template provides a side-by-side workspace: the live LOS on one side and a premium reactive Companion Sidebar on the other. It includes shadow DOM overlay button injection, real-time SPA navigation tracking, and a Node.js-powered secure API bus that bypasses browser-level CORS/CSP limits.

---

## Why This Exists

Most web LOS platforms are complex Single Page Applications with strict Content Security Policies (CSPs) and browser sandbox constraints that block direct connections to third-party CRMs, webhooks, or communication servers.

By wrapping any web LOS inside an Electron environment, this template enables developers to:
1. **Bypass CORS/CSP Restrictions:** Execute third-party requests inside Node.js (via the Electron Main process) where browser CORS limits do not apply.
2. **Dynamic Side-by-Side UI:** Dock a persistent companion tool right next to the LOS without resizing windows manually or fighting browser sidepanel limitations.
3. **Isolate User Authentication:** Run the LOS inside an independent Chromium session partition, keeping the user's personal browser cookies entirely separate.

---

## Core Features

- **Launchpad Entry Screen:** On startup, a sleek prompt asks for your LOS domain URL — no hardcoded config required.
- **Dual-View Layout Engine:** Uses modern `WebContentsView` and `BaseWindow` to render the LOS and the Companion Sidebar side-by-side.
- **Configurable Sidebar Alignment:** Set `sidebarPosition: 'left' | 'right'` in `config.js` to dynamically shift the UI bounds.
- **SPA Routing Tracker:** Native listener hooked to `did-navigate-in-page` capturing SPA router changes in the LOS without scrapers.
- **Declarative Shadow DOM FAB Overlay:** A config array in `config.js` automatically injects Floating Action Buttons into the LOS page under a Shadow DOM boundary, avoiding host CSS bleed. Requires the host app to allow preload injection (Electron `WebContentsView` handles this natively; browser extensions need matching content-script declarations).
- **Session Telemetry (Heartbeat Engine):** Polls active state and extracts session details to report presence metrics every 30 seconds.
- **Local Mock Environment:** A self-contained mock page (`mock-los/mock-los.html`) that simulates LOS routing and `localStorage` for offline testing.

---

## Project Structure

```text
├── config.js               # Unified config: URL patterns, Tab rules, FABs, Sidebar alignment
├── main.js                 # Main Process: Window math, IPC routers, navigation logs
├── preload-los.js          # Injected into LOS: Shadow DOM renderer & telemetry heartbeats
├── preload-sidebar.js      # Injected into Sidebar: Exposes secure contextBridge APIs
├── launchpad/
│   └── launchpad.html      # Startup screen: domain URL entry, sandbox presets
├── sidebar/
│   ├── sidebar.html        # Companion UI markup (Context details, Video, CRM)
│   ├── sidebar.css         # Styling (Premium dark theme, glowing badges, transitions)
│   └── sidebar.js          # Controller: Manages tab state, fetches credentials
├── mock-los/
│   └── mock-los.html       # SPA Mock page simulating LOS routing & localStorage
├── package.json
└── README.md
```

---

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Launch

```bash
npm start
```

The app opens with a **Launchpad** screen. Enter your LOS domain URL (e.g. `https://your-los.com`) and click **Launch Workspace**. The LOS loads in the left pane and the Companion Sidebar activates on the right, immediately tracking navigation state, injecting FABs, and emitting presence heartbeats to the console.

### 3. Local Mock Testing

To test without live LOS credentials, use the built-in sandbox preset on the launchpad screen or load the mock page directly:

```bash
# Open mock page via launchpad preset, or target it manually in the launchpad:
../mock-los/mock-los.html
```

The mock page simulates LOS tab navigation via `history.pushState` and populates `localStorage` with test session values. All IPC heartbeats and context updates will fire normally.

---

## Adapting the Template to Your LOS

All platform specifics live in **`config.js`**. No other file needs to change.

### 1. Match your LOS's URL structure

`urlPatterns` is an ordered list of regexes; the first match wins. Each pattern uses named capture groups that become the context object:

```javascript
urlPatterns: [
    // Live LOS hosts: https://<subdomain>.your-los.com/loan/<id>/<tab>
    /https:\/\/(?<subdomain>[^.]+)\.your-los\.com\/.*loan\/(?<entityId>[^\/]+)\/?(?<entityTab>[^\/?#]+)?/,

    // Localhost test/mock server: http://localhost:<port>/loan/<id>/<tab>
    /http:\/\/localhost:\d+\/.*loan\/(?<entityId>[^\/]+)\/?(?<entityTab>[^\/?#]+)?/
],
```

- `entityId` — the primary record identifier (loan, deal, file, contact, etc.)
- `entityTab` — the active tab/view inside that record (optional)
- `subdomain` — host subdivision shown in the sidebar (optional)

Rename the groups to match your LOS's vocabulary if you prefer — just keep `parseContext()` and the UI consumers in agreement.

### 2. Define your overlays

```javascript
customFABs: [
    {
        id: 'sync-crm',
        label: 'Sync to CRM',
        css: 'bottom: 20px; right: 20px; background: #007bff; color: white;',
        tabRegex: /.*/   // All views
    },
    {
        id: 'start-video',
        label: 'Start Video Room',
        css: 'bottom: 70px; right: 20px; background: #28a745; color: white;',
        tabRegex: /Borrower_Information/i  // Specific view only
    }
]
```

---

## Secure IPC Bridge Architecture

Both views run with `contextIsolation: true` and `nodeIntegration: false`. The sidebar communicates via `preload-sidebar.js`:

```javascript
window.api.getCurrentContext();      // Returns parsed active record metadata
window.api.getLocalStorage();        // Safely retrieves filtered session storage
window.api.actionClicked(id, ctx);   // Signals FAB button clicks to Node backend
window.api.onContextUpdated(fn);     // Subscribes to live context change stream
```

All IPC channels are platform-agnostic (`LOS_CONTEXT_UPDATED`, `GET_CURRENT_CONTEXT`, `GET_LOCAL_STORAGE`, `ACTION_CLICKED`, `PRESENCE_HEARTBEAT`, `FORCE_BEAT`).

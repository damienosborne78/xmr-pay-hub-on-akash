# Project Memory

## Core
Dark mode only. Primary: Monero orange #FF6600 (HSL 24 100% 50%). Bg: zinc-950.
Inter font. JetBrains Mono for code/addresses. No light mode.
App name: MoneroFlow. Browser wallet uses real Monero crypto (ed25519, RingCT via monero-ts).
Zustand for state management. No backend yet — uses IndexedDB persistence.
Send XMR uses monero-ts WASM for real on-chain TX construction. Two modes: proxy (default) and wasm.

## Memories
- [Design tokens](mem://design/tokens) — Full dark palette, orange accent, glow utilities, surface colors
- [App structure](mem://features/routes) — Landing, auth, dashboard (sidebar), public invoice page

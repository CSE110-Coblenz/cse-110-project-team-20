---
- Task ID: CONFIG-251201-01
- Date: 2025-12-01
- Area: Planet exploration assets & naming
- Summary: Switched planet destination icons to load via absolute paths from the Vite public root (matching ISS), ensured all planet PNGs map correctly, and renamed destination-related members to planet-generic names while updating imports to use PlanetExplorationScene.
---

---
- **Task ID**: CONFIG-251126-01
- **Summary**: Migrated ESLint to flat config with TypeScript+Prettier stack, reformatted the entire `src/` tree via Prettier to remove CRLF noise, tightened scenes/UI code (error logging, UI layer lifecycle, GameOver resets, typed tests), and downgraded `jsdom` so Vitest can execute under Node 20.18 without ERR_REQUIRE_ESM.
- **Status**: done
- **Next**: Raise Node/npm toolchain to >=20.19 soon so we can move back to `jsdom@27` for longer-term support.



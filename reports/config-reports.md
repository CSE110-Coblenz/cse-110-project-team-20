---
- **Task ID**: CONFIG-251126-01
- **Summary**: Migrated ESLint to flat config with TypeScript+Prettier stack, reformatted the entire `src/` tree via Prettier to remove CRLF noise, tightened scenes/UI code (error logging, UI layer lifecycle, GameOver resets, typed tests), and downgraded `jsdom` so Vitest can execute under Node 20.18 without ERR_REQUIRE_ESM.
- **Status**: done
- **Next**: Raise Node/npm toolchain to >=20.19 soon so we can move back to `jsdom@27` for longer-term support.



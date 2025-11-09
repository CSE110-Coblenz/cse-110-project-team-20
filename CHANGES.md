# Refactoring Changes

## Baseline (Before Changes)
- TypeScript strict mode: enabled
- `noUncheckedIndexedAccess`: not enabled
- System interface: duplicated in `loop.ts` and `types.ts`
- Event topics: string literals (typo-prone)
- Keyboard: `getState()` created new object each call, `dispose()` didn't properly remove listeners
- Missing scripts: `typecheck`, `lint:fix`, `preview`

## Changes Made

### A) Lint & Type Hygiene
- ✅ Enabled `noUncheckedIndexedAccess` in `tsconfig.json`
- ✅ Removed duplicate `System` interface (kept in `types.ts`, removed from `loop.ts`)
- ✅ Updated all system imports to use `types.ts`
- ✅ No `any` types found (verified)

### B) Folder & Naming Consistency
- ✅ All systems now import `System` from `../types.js` consistently

### C) Dead Code & Redundancy
- ✅ Removed duplicate `System` interface definition

### D) Simulation Loop & Systems
- ✅ System interface centralized in `types.ts`
- ✅ All systems use consistent import path

### E) Konva Rendering
- (No changes needed - already well-structured)

### F) Events & Input
- ✅ Created `src/engine/events/topics.ts` with typed event topic constants
- ✅ Updated all event emits/ons to use `EventTopics` constants
- ✅ Fixed `keyboard.getState()` to return reused object (no allocation)
- ✅ Fixed `keyboard.dispose()` to properly remove bound listeners

### G) Persistence
- ✅ Updated `SaveRepository` to use `EventTopics`

### H) Data-Driven Content
- (No changes needed - already loads from JSON)

### I) Build & Perf
- ✅ Keyboard `getState()` now returns reused object (performance improvement)
- ✅ All event topics use constants (prevents typos, better tree-shaking)

## Scripts Added
- `typecheck`: `tsc --noEmit`
- `lint:fix`: `eslint src --ext .ts --fix`
- `preview`: `vite preview`
- Updated `test`: `vitest run` (was `vitest`)

## Files Changed
- `package.json`: Added scripts
- `tsconfig.json`: Added `noUncheckedIndexedAccess`
- `src/engine/loop.ts`: Removed duplicate System interface, import from types.ts
- `src/engine/ecs/types.ts`: (no changes, already had System)
- `src/engine/ecs/systems/*.ts`: Updated System imports
- `src/engine/events.ts`: Use EventTopics in type definition, re-export
- `src/engine/events/topics.ts`: NEW - typed event topic constants
- `src/input/keyboard.ts`: Fixed getState() and dispose()
- `src/engine/ecs/systems/fuelSystem.ts`: Use EventTopics
- `src/persistence/SaveRepository.ts`: Use EventTopics
- `src/engine/sceneManager.ts`: Use EventTopics
- `src/scenes/ISSScene.ts`: Use EventTopics
- `src/ui/quiz.ts`: Use EventTopics
- `src/tests/*.test.ts`: Updated to use EventTopics

## Verification Checklist
- [ ] Game flow unchanged: Title → Name → ISS (move, fuel drain/refuel, quiz+retry) → Cutscene → Moon
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes (bundle size not increased)
- [ ] No public API/file path changes
- [ ] No schema changes for save/quizzes/facts


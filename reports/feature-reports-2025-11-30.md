---
- **Task ID**: FEATURE-251130-01
- **Summary**: Implemented interactive Moon exploration scene with collectibles, moving hazards, and gated quiz flow.
- **Details**: Added `MoonExplorationScene` with moving asteroids, data capsules tied to quiz question ids, HUD intel panel, quiz confirmation dialog, and integration into the scene graph plus cutscene routing. Extended ECS (data capsule component/system), UI (quiz confirmation, quiz ids), assets, and quiz metadata to support the new flow. Updated tests remain green.
- **Status**: Completed
- **Artifacts**: `src/scenes/MoonExplorationScene.ts`, `src/engine/ecs/systems/dataCapsules.ts`, `src/ui/quizConfirmation.ts`, `src/main.ts`, `src/scenes/CutsceneScene.ts`
---


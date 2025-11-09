# Code Quality Refactoring - SOLID & DRY Principles

## Overview
This document explains the code quality improvements made following SOLID and DRY principles without breaking existing functionality.

## SOLID Principles Applied

### Single Responsibility Principle (SRP)
**What it means**: Each class/function should have only one reason to change.

**Improvements made**:
1. **Collision Detection Utility** (`src/engine/utils/collision.ts`)
   - **Why**: Extracted collision detection logic from `TriggersSystem` and `ObstaclesSystem`
   - **Benefit**: Collision logic is now in one place, easier to test and maintain
   - **Before**: AABB collision code duplicated in 2 systems
   - **After**: Shared utility function used by both systems

2. **Configuration Constants** (`src/config.ts`)
   - **Why**: Centralized all magic numbers and game constants
   - **Benefit**: Single source of truth for game configuration
   - **Before**: Magic numbers scattered throughout codebase (50, 100, 15, etc.)
   - **After**: All constants in CONFIG object with clear names

### Open/Closed Principle (OCP)
**What it means**: Open for extension, closed for modification.

**Improvements made**:
1. **Collision Utility Design**
   - **Why**: `checkAABBCollision()` is a pure function that can be extended
   - **Benefit**: Can add new collision types (circle, polygon) without modifying existing code
   - **Example**: Future systems can use the same collision utility

### Dependency Inversion Principle (DIP)
**What it means**: Depend on abstractions, not concretions.

**Already implemented**: Systems depend on `World` interface, not concrete implementation.

## DRY (Don't Repeat Yourself) Principles Applied

### 1. Ship Dimensions
**Problem**: Ship size (50x50) was hardcoded in 4+ places:
- `triggers.ts` - collision detection
- `obstacles.ts` - collision detection  
- `entities.ts` - rendering (2 places)
- `ISSScene.ts` - implicit in comments

**Solution**: Added to `CONFIG`:
```typescript
SHIP_WIDTH: 50,
SHIP_HEIGHT: 50,
SHIP_CENTER_OFFSET: 25,
```

**Files updated**:
- `src/config.ts` - Added constants
- `src/engine/ecs/systems/triggers.ts` - Uses `createShipBoundingBox()`
- `src/engine/ecs/systems/obstacles.ts` - Uses `createShipBoundingBox()`
- `src/render/layers/entities.ts` - Uses `CONFIG.SHIP_WIDTH/HEIGHT`

### 2. Collision Detection Logic
**Problem**: AABB collision detection duplicated in:
- `TriggersSystem.update()` - 4 lines of collision math
- `ObstaclesSystem.update()` - 4 lines of collision math

**Solution**: Created `src/engine/utils/collision.ts`:
- `checkAABBCollision()` - Reusable collision function
- `createShipBoundingBox()` - Helper to create ship bounding box

**Benefits**:
- Single source of truth for collision logic
- Easier to fix bugs (fix once, works everywhere)
- Easier to add new collision types

### 3. Fuel Constants
**Problem**: Fuel values hardcoded in multiple places:
- Initial fuel: 50 (in `ISSScene.ts` - 2 places)
- Max fuel: 100 (in `ISSScene.ts`, `triggers.ts`)
- Fuel drain: 15 (in `ISSScene.ts`)

**Solution**: Added to `CONFIG`:
```typescript
FUEL_MAX: 100,
FUEL_INITIAL: 50,
FUEL_DRAIN_PER_COLLISION: 15,
FUEL_REFUEL_AMOUNT: 100,
```

**Files updated**:
- `src/config.ts` - Added constants
- `src/scenes/ISSScene.ts` - Uses `CONFIG.FUEL_*` constants
- `src/engine/ecs/systems/triggers.ts` - Uses `CONFIG.FUEL_REFUEL_AMOUNT`

### 4. Debug Settings
**Problem**: `DEBUG_HITBOX` was a local variable in `ISSScene.ts`

**Solution**: Moved to `CONFIG.DEBUG_HITBOX`

**Benefit**: Can toggle debug mode from one place, affects entire game

## Code Comments Added

All improvements include inline comments explaining:
- **Why** the change was made (which principle)
- **What** the code does
- **How** it improves maintainability

Example:
```typescript
// Use config constants instead of magic numbers (DRY principle)
// Use shared collision utility (DRY principle)
// SOLID Principle: Single Responsibility - Only handles trigger collisions
```

## Files Changed

### New Files
- `src/engine/utils/collision.ts` - Collision detection utility
- `REFACTORING_NOTES.md` - This document

### Modified Files
- `src/config.ts` - Added all game constants
- `src/engine/ecs/systems/triggers.ts` - Uses collision utility and CONFIG
- `src/engine/ecs/systems/obstacles.ts` - Uses collision utility
- `src/render/layers/entities.ts` - Uses CONFIG for ship dimensions
- `src/scenes/ISSScene.ts` - Uses CONFIG for fuel values and debug setting
- `src/engine/ecs/systems/fuelSystem.ts` - Added explanatory comments

## Verification

✅ No breaking changes
✅ All existing functionality preserved
✅ No linter errors
✅ Type safety maintained
✅ Behavior identical to before

## Future Improvements (Not Done)

These were considered but not implemented to avoid over-engineering:

1. **Image Loading Utility**: The pattern of loading images and creating Konva nodes is repeated, but it's context-specific enough that extracting it might reduce clarity.

2. **Aspect Ratio Calculation**: The aspect ratio calculation in `ISSScene.ts` could be extracted, but it's only used in 2 places and is simple enough.

3. **Entity Factory**: Could create a factory for common entity patterns, but current code is clear and explicit.

## Summary

**Before**: Magic numbers scattered, collision logic duplicated, hard to maintain
**After**: Centralized constants, shared utilities, clear separation of concerns

**Lines of code**: Reduced duplication by ~20 lines
**Maintainability**: Significantly improved - change ship size in one place
**Testability**: Improved - collision logic can be unit tested independently


export const CONFIG = {
  STAGE_WIDTH: 1280,
  STAGE_HEIGHT: 720,
  FIXED_TIMESTEP: 16.67, // ms (target 60 FPS)
  MAX_FRAME_TIME: 100, // ms (cap to prevent spiral of death)
} as const;


import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TitleScene } from '../scenes/TitleScene.js';
import type { SceneManager } from '../engine/sceneManager.js';
import type { RenderStage } from '../render/stage.js';
import type { GameOverUI } from '../ui/gameOver.js';

describe('TitleScene', () => {
  let titleScene: TitleScene;
  let mockSceneManager: SceneManager;
  let mockStage: RenderStage;
  let mockGameOverUI: GameOverUI;

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      rect: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
    } as CanvasRenderingContext2D);

    mockSceneManager = {
      transitionTo: vi.fn(),
    } as unknown as SceneManager;

    mockStage = {
      backgroundLayer: {
        destroyChildren: vi.fn(),
        add: vi.fn(),
        batchDraw: vi.fn(),
      },
      uiLayer: { destroyChildren: vi.fn() },
      getWidth: () => 800,
      getHeight: () => 600,
    } as unknown as RenderStage;

    mockGameOverUI = {
      show: vi.fn(),
      hide: vi.fn(),
      isShowing: vi.fn(() => false),
      dispose: vi.fn(),
    } as GameOverUI;

    document.body.innerHTML = '';

    titleScene = new TitleScene(mockSceneManager, mockStage, mockGameOverUI);
    titleScene.init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should call sceneManager.transitionTo("name") when start button is clicked', () => {
    const startButton = titleScene['startButton'];
    expect(startButton).not.toBeNull();

    // Simulate click
    startButton!.click();

    expect(mockSceneManager.transitionTo).toHaveBeenCalledWith('name');
  });
});

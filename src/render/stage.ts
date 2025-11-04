/**
 * Konva Stage setup and layer management
 */
import Konva from 'konva';
import { CONFIG } from '../config.js';

export class RenderStage {
  public stage: Konva.Stage;
  public backgroundLayer: Konva.Layer;
  public entitiesLayer: Konva.Layer;
  public uiLayer: Konva.Layer;

  constructor(container: HTMLElement) {
    this.stage = new Konva.Stage({
      container: container as HTMLDivElement,
      width: CONFIG.STAGE_WIDTH,
      height: CONFIG.STAGE_HEIGHT,
    });

    // Create layers
    this.backgroundLayer = new Konva.Layer();
    this.entitiesLayer = new Konva.Layer();
    this.uiLayer = new Konva.Layer();

    // Add layers to stage
    this.stage.add(this.backgroundLayer);
    this.stage.add(this.entitiesLayer);
    this.stage.add(this.uiLayer);
  }

  /**
   * Batch draw all layers (call once per frame)
   */
  batchDraw(): void {
    this.backgroundLayer.batchDraw();
    this.entitiesLayer.batchDraw();
    this.uiLayer.batchDraw();
  }

  /**
   * Get canvas dimensions
   */
  getWidth(): number {
    return this.stage.width();
  }

  getHeight(): number {
    return this.stage.height();
  }
}


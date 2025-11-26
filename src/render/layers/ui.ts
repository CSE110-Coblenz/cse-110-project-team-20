/**
 * UI layer - for Konva-based UI elements
 * (DOM-based UI handled separately in ui/ directory)
 */
import type Konva from 'konva';

export class UILayer {
  private readonly layer: Konva.Layer;

  constructor(layer: Konva.Layer) {
    this.layer = layer;
  }

  render(): void {
    if (this.layer.getChildren().length > 0) {
      this.layer.batchDraw();
    }
  }
}

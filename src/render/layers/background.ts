/**
 * Background layer rendering
 */
import type Konva from 'konva';

export class BackgroundLayer {
  private layer: Konva.Layer;

  constructor(layer: Konva.Layer) {
    this.layer = layer;
    this.init();
  }

  private init(): void {
    // Placeholder: solid dark background
    // In full implementation, could add stars, nebula, etc.
    this.layer.clear();
    // Background color handled by CSS
  }

  render(): void {
    // Background is static, no updates needed
  }
}

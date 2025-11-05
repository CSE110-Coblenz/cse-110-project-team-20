/**
 * UI layer - for Konva-based UI elements
 * (DOM-based UI handled separately in ui/ directory)
 */
import type Konva from 'konva';

export class UILayer {
  constructor(_layer: Konva.Layer) {
    // Layer stored for future use if needed
  }

  render(): void {
    // UI elements handled via DOM overlay
    // This layer reserved for future Konva-based UI
  }
}


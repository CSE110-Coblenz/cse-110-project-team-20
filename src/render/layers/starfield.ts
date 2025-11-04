/**
 * Starfield Layer - animated scrolling stars background
 */
import Konva from 'konva';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

export class StarfieldLayer {
  private layer: Konva.Layer;
  private stars: Star[] = [];
  private width: number;
  private height: number;
  private starNodes: Konva.Circle[] = [];

  constructor(layer: Konva.Layer, width: number, height: number) {
    this.layer = layer;
    this.width = width;
    this.height = height;
    this.init();
  }

  private init(): void {
    // Clear existing stars
    this.stars = [];
    this.starNodes = [];
    this.layer.destroyChildren();

    // Create stars at different depths (far, medium, near)
    const farStars = 30; // Slow, small, faint
    const mediumStars = 20; // Medium speed, medium size
    const nearStars = 10; // Fast, large, bright

    // Far stars (background layer)
    for (let i = 0; i < farStars; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1,
        speed: 20, // pixels per second
        opacity: 0.6,
      });
    }

    // Medium stars
    for (let i = 0; i < mediumStars; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1.5,
        speed: 40,
        opacity: 0.8,
      });
    }

    // Near stars (foreground layer)
    for (let i = 0; i < nearStars; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 2,
        speed: 60,
        opacity: 1,
      });
    }

    // Create Konva nodes for stars
    this.stars.forEach((star) => {
      const node = new Konva.Circle({
        x: star.x,
        y: star.y,
        radius: star.size,
        fill: '#ffffff',
        opacity: star.opacity,
      });
      this.layer.add(node);
      this.starNodes.push(node);
    });
  }

  /**
   * Update starfield animation (scroll right to left)
   */
  update(dt: number): void {
    const dtSeconds = dt / 1000; // Convert ms to seconds

    this.stars.forEach((star, index) => {
      // Move star left (negative x direction)
      star.x -= star.speed * dtSeconds;

      // Reset star to right side when it goes off-screen
      if (star.x < 0) {
        star.x = this.width + Math.random() * 100;
        star.y = Math.random() * this.height;
      }

      // Update Konva node position
      if (this.starNodes[index]) {
        this.starNodes[index].setAttrs({
          x: star.x,
          y: star.y,
        });
      }
    });
  }

  /**
   * Render starfield (called each frame)
   */
  render(): void {
    // Batch draw handled by stage
  }
}


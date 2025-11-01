/**
 * Sprite component - references a sprite/key for rendering
 */
import type { Component } from '../types.js';

export interface Sprite extends Component {
  type: 'sprite';
  key: string; // e.g., 'ship', 'refuel-station'
}

export function createSprite(key: string): Sprite {
  return {
    type: 'sprite',
    key,
  };
}


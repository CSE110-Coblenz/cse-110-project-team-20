/**
 * Position component
 */
import type { Component } from '../types.js';

export interface Position extends Component {
  type: 'position';
  x: number;
  y: number;
  angle?: number; // in degrees
}

export function createPosition(x: number, y: number, angle = 0): Position {
  return {
    type: 'position',
    x,
    y,
    angle,
  };
}

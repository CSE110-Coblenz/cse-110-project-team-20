/**
 * Velocity component
 */
import type { Component } from '../types.js';

export interface Velocity extends Component {
  type: 'velocity';
  vx: number;
  vy: number;
}

export function createVelocity(vx: number, vy: number): Velocity {
  return {
    type: 'velocity',
    vx,
    vy,
  };
}


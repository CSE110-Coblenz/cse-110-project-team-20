/**
 * Fuel component
 */
import type { Component } from '../types.js';

export interface Fuel extends Component {
  type: 'fuel';
  current: number;
  max: number;
}

export function createFuel(max: number, current?: number): Fuel {
  return {
    type: 'fuel',
    current: current ?? max,
    max,
  };
}

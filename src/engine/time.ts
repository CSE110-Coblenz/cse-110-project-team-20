/**
 * Time utilities for game loop
 */

export function now(): number {
  return performance.now();
}

export function elapsed(start: number, end: number): number {
  return end - start;
}


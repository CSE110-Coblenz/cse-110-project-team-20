/**
 * Data capsule component - stores lunar intel and quiz mapping.
 */
import type { Component } from '../types.js';

export interface CapsuleFact {
  /**
   * Stable identifier for this fact (used for persistence / quiz mapping).
   */
  id: string;
  /**
   * Fact text to display when the capsule is collected.
   */
  text: string;
  /**
   * Quiz question identifier that aligns with this fact.
   * Used to filter the quiz to only the collected intel.
   */
  questionId: string;
}

export interface DataCapsule extends Component {
  type: 'data-capsule';
  /**
   * Unique identifier for the capsule entity (e.g., "copernicus-capsule").
   */
  capsuleId: string;
  /**
   * Array of possible facts; one is chosen at random when collected.
   */
  facts: CapsuleFact[];
}

export function createDataCapsule(
  capsuleId: string,
  facts: CapsuleFact[]
): DataCapsule {
  return {
    type: 'data-capsule',
    capsuleId,
    facts,
  };
}


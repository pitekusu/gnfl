/**
 * Device-independent control axes. Phaser maps keyboard/mouse into this shape.
 * Phase 1 holds the latest input without applying crane control.
 */
export interface PlayerInput {
  /** -1.0 .. 1.0 */
  trolleyAxis: number;
  /** -1.0 .. 1.0 */
  hoistAxis: number;
  fineMode: boolean;
  lockPressed: boolean;
  emergencyStopPressed: boolean;
}

export function createNeutralPlayerInput(): PlayerInput {
  return {
    trolleyAxis: 0,
    hoistAxis: 0,
    fineMode: false,
    lockPressed: false,
    emergencyStopPressed: false,
  };
}

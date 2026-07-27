/**
 * Decide whether a physics tick should emit a render snapshot.
 * physicsHz=120, snapshotHz=60 → emit every 2 ticks.
 */
export function shouldEmitSnapshot(
  tick: number,
  physicsHz: number,
  snapshotHz: number,
): boolean {
  if (tick <= 0) {
    return false;
  }
  const ratio = Math.max(1, Math.round(physicsHz / snapshotHz));
  return tick % ratio === 0;
}

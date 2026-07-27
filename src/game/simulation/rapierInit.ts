import RAPIER from "@dimforge/rapier2d-compat";

let initPromise: Promise<typeof RAPIER> | null = null;

/**
 * Initialize Rapier WASM once per worker. The World stays worker-private.
 */
export async function initRapier(): Promise<typeof RAPIER> {
  if (!initPromise) {
    initPromise = RAPIER.init().then(() => RAPIER);
  }
  return initPromise;
}

export type RapierModule = typeof RAPIER;

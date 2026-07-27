/**
 * Map document visibility to simulation pause/resume.
 * Kept pure for unit tests; SimulationScene wires the client methods.
 */
export type VisibilityAction = "PAUSE" | "RESUME";

export function visibilityToSimulationAction(
  visibilityState: "hidden" | "visible" | "prerender",
): VisibilityAction {
  return visibilityState === "hidden" ? "PAUSE" : "RESUME";
}

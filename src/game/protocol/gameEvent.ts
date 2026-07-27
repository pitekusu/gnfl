/** Low-frequency game events for later UI / SFX hooks. */
export type GameEvent =
  | { type: "INFO"; code: string; message: string }
  | { type: "INTERLOCK"; code: string }
  | { type: "WEATHER_TELEGRAPH"; kind: "gust" | "highWave" };

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import type { StageResult } from "@/game/protocol";
import { createGame } from "@/game/phaser/createGame";
import {
  formatStagePhaseHud,
  isLockEngagedStagePhase,
} from "@/game/unloading/stagePhaseLabels";
import {
  formatStageEndBanner,
  formatStageEndBannerFromPhase,
} from "@/game/unloading/stageEndBanner";
import { formatWaveHud, formatWindHud } from "@/game/unloading/weatherHud";

/**
 * Hosts Phaser. Only low-frequency simulation status crosses into React state.
 * Snapshot positions never enter React.
 */
export function PhaserGame() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [phaserStatus, setPhaserStatus] = useState("initializing");
  const [workerStatus, setWorkerStatus] = useState("idle");
  const [fineMode, setFineMode] = useState(false);
  const [sway, setSway] = useState(0);
  const [cableLoad, setCableLoad] = useState(0);
  const [stagePhase, setStagePhase] = useState("READY");
  const [abortReason, setAbortReason] = useState<string | null>(null);
  const [lockReady, setLockReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [windHint, setWindHint] = useState(0);
  const [waveHint, setWaveHint] = useState(0);
  /** Full terminal payload when worker/stageEnd arrives (score/grade). */
  const [stageResult, setStageResult] = useState<StageResult | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || gameRef.current) {
      return;
    }

    let disposed = false;
    let game: Phaser.Game | null = null;

    const boot = async () => {
      try {
        game = await createGame(host, {
          onSimulationStatus: (payload) => {
            if (disposed) {
              return;
            }
            if (payload.kind === "phaser") {
              setPhaserStatus(payload.status);
              return;
            }
            if (payload.kind === "control") {
              setFineMode(payload.fineMode);
              return;
            }
            if (payload.kind === "hud") {
              setSway(payload.sway);
              setCableLoad(payload.cableLoad);
              setLockReady(Boolean(payload.lockReady));
              setLocked(Boolean(payload.locked));
              setWindHint(typeof payload.windHint === "number" ? payload.windHint : 0);
              setWaveHint(typeof payload.waveHint === "number" ? payload.waveHint : 0);
              setAbortReason(
                payload.abortReason != null && payload.abortReason !== ""
                  ? payload.abortReason
                  : null,
              );
              // Never allow undefined/empty to wipe the phase row.
              setStagePhase(
                payload.stagePhase != null && payload.stagePhase !== ""
                  ? payload.stagePhase
                  : "READY",
              );
              return;
            }
            if (payload.kind === "stageEnd") {
              setStageResult(payload.result);
              setStagePhase(
                payload.result.completed
                  ? "COMPLETED"
                  : payload.result.aborted
                    ? "SAFE_ABORTED"
                    : "READY",
              );
              if (payload.result.abortReason) {
                setAbortReason(payload.result.abortReason);
              }
              return;
            }
            if (payload.status === "error") {
              setWorkerStatus(payload.detail ?? "error");
              return;
            }
            setWorkerStatus(payload.status);
          },
        });
        if (disposed) {
          game.destroy(true);
          return;
        }
        gameRef.current = game;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "unknown error";
        if (!disposed) {
          setPhaserStatus(`error: ${message}`);
        }
      }
    };

    void boot();

    return () => {
      disposed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      game?.destroy(true);
    };
  }, []);

  // Banner must follow HUD phase (proven path). Full StageResult upgrades the text.
  const phaseBanner = formatStageEndBannerFromPhase(stagePhase, abortReason);
  const bannerText = stageResult ? formatStageEndBanner(stageResult) : phaseBanner;
  const bannerVisible = bannerText != null;
  const bannerAborted = stageResult?.aborted === true || stagePhase === "SAFE_ABORTED";

  return (
    <div className="phaser-host" ref={hostRef} data-testid="phaser-host">
      <div className="game-hud" data-testid="game-hud">
        <div className="game-hud-row">
          <span className="game-hud-label">工程</span>
          <span className="game-hud-value game-hud-phase" data-testid="hud-stage-phase">
            {formatStagePhaseHud(stagePhase)}
            {stagePhase === "SAFE_ABORTED" && abortReason ? ` · ${abortReason}` : ""}
          </span>
        </div>
        <div className="game-hud-row">
          <span className="game-hud-label">ロック</span>
          <span
            className={
              locked || isLockEngagedStagePhase(stagePhase)
                ? "game-hud-value game-hud-lock-active"
                : lockReady
                  ? "game-hud-value game-hud-lock-ready"
                  : "game-hud-value game-hud-lock-wait"
            }
            data-testid="hud-lock-ready"
          >
            {locked || isLockEngagedStagePhase(stagePhase)
              ? "ロック中"
              : lockReady
                ? "可"
                : "不可"}
          </span>
        </div>
        <div className="game-hud-row">
          <span className="game-hud-label">振れ</span>
          <span className="game-hud-value" data-testid="hud-sway">
            {sway.toFixed(2)}
          </span>
        </div>
        <div className="game-hud-row">
          <span className="game-hud-label">張力</span>
          <span className="game-hud-value" data-testid="hud-cable-load">
            {cableLoad.toFixed(1)}
          </span>
        </div>
        <div className="game-hud-row">
          <span className="game-hud-label">風</span>
          <span className="game-hud-value game-hud-weather" data-testid="hud-wind">
            {formatWindHud(windHint)}
          </span>
        </div>
        <div className="game-hud-row">
          <span className="game-hud-label">波</span>
          <span className="game-hud-value game-hud-weather" data-testid="hud-wave">
            {formatWaveHud(waveHint)}
          </span>
        </div>
      </div>
      {fineMode ? (
        <div className="fine-mode-badge" data-testid="fine-mode-badge" role="status">
          緩速状態
        </div>
      ) : null}
      {bannerVisible ? (
        <div
          className={
            bannerAborted
              ? "stage-end-banner stage-end-banner-abort"
              : "stage-end-banner stage-end-banner-complete"
          }
          data-testid="stage-end-banner"
          role="status"
        >
          {bannerText}
        </div>
      ) : null}
      <div className="phaser-status" data-testid="phaser-status">
        Phaser: {phaserStatus} · Worker: {workerStatus}
        {fineMode ? " · 緩速状態" : ""}
      </div>
    </div>
  );
}

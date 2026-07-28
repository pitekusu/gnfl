import type { StageResult } from "@/game/protocol";
import {
  SCORE_CATEGORY_IDS,
  SCORE_CATEGORY_LABELS_JA,
  type ScoreCategoryId,
} from "@shared/rulesets/unloadingV1";

export interface ResultScreenProps {
  result: StageResult;
  onRetry: () => void;
  onTitle: () => void;
  /**
   * Local personal-best outcome for this browser profile.
   * true = updated, false = not updated, null = N/A (abort / unavailable).
   */
  personalBestUpdated?: boolean | null;
}

/**
 * Local result screen after COMPLETED / SAFE_ABORTED.
 * No elapsed-time display (directive §11.5).
 */
export function ResultScreen({
  result,
  onRetry,
  onTitle,
  personalBestUpdated = null,
}: ResultScreenProps) {
  const scoring = result.scoring;
  const aborted = result.aborted;

  return (
    <section
      className="screen result-screen"
      aria-label="Result"
      data-testid="result-screen"
    >
      <div className="result-panel">
        <p className="result-kicker">荷揚げ工程 · {result.rulesetVersion}</p>

        {aborted ? (
          <>
            <h2 className="result-title result-title-abort" data-testid="result-title">
              安全中止
            </h2>
            <p className="result-subtitle" data-testid="result-abort-reason">
              {result.abortReason ? `理由: ${result.abortReason}` : "理由未記録"}
            </p>
            <p className="result-note">スコアは登録できません。</p>
          </>
        ) : (
          <>
            <h2
              className="result-title result-title-complete"
              data-testid="result-title"
            >
              工程完了
            </h2>
            {scoring ? (
              <>
                <div className="result-grade-row" data-testid="result-grade">
                  <span className="result-grade-label">総合ランク</span>
                  <span className="result-grade-value">{scoring.grade}</span>
                </div>
                <div className="result-score-row" data-testid="result-score">
                  <span className="result-score-label">総合スコア</span>
                  <span className="result-score-value">
                    {scoring.score.toLocaleString("ja-JP")}
                  </span>
                </div>
                <ul className="result-categories" data-testid="result-categories">
                  {SCORE_CATEGORY_IDS.map((id) => (
                    <CategoryRow
                      key={id}
                      id={id}
                      grade={scoring.categoryGrades[id]}
                      points={scoring.categories[id]}
                    />
                  ))}
                </ul>
              </>
            ) : (
              <p className="result-note">スコア集計がありません。</p>
            )}
            {personalBestUpdated === true ? (
              <p className="result-pb result-pb-yes" data-testid="result-personal-best">
                自己ベスト更新
              </p>
            ) : personalBestUpdated === false ? (
              <p className="result-pb result-pb-no" data-testid="result-personal-best">
                自己ベスト未更新
              </p>
            ) : null}
          </>
        )}

        <div className="result-actions">
          <button
            type="button"
            className="primary-button"
            data-testid="result-retry"
            onClick={onRetry}
          >
            もう一度
          </button>
          <button
            type="button"
            className="secondary-button"
            data-testid="result-title"
            onClick={onTitle}
          >
            タイトルへ
          </button>
        </div>

        <p className="result-seed" data-testid="result-seed">
          seed: {result.seed || "—"}
        </p>
      </div>
    </section>
  );
}

function CategoryRow(props: { id: ScoreCategoryId; grade: string; points: number }) {
  const { id, grade, points } = props;
  return (
    <li className="result-category-row" data-testid={`result-category-${id}`}>
      <span className="result-category-name">{SCORE_CATEGORY_LABELS_JA[id]}</span>
      <span className="result-category-grade">{grade}</span>
      <span className="result-category-points">{Math.round(points)}</span>
    </li>
  );
}

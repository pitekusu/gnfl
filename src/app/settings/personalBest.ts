/**
 * Local personal-best store (this browser profile only).
 * Phase 6 replaces persistence with DynamoDB; scoring rules stay shared.
 */

export const PERSONAL_BEST_STORAGE_PREFIX = "gnfl.personalBest";

export interface PersonalBestRecord {
  score: number;
  grade: string;
  seed: string;
  rulesetVersion: string;
  stageId: string;
  updatedAtMs: number;
}

export function personalBestStorageKey(
  stageId: string,
  rulesetVersion: string,
): string {
  return `${PERSONAL_BEST_STORAGE_PREFIX}.${stageId}.${rulesetVersion}`;
}

/** Pure: true when score should replace the previous best (strictly greater). */
export function isNewPersonalBest(
  previousScore: number | null | undefined,
  candidateScore: number,
): boolean {
  if (!Number.isFinite(candidateScore) || candidateScore < 0) {
    return false;
  }
  if (previousScore == null || !Number.isFinite(previousScore)) {
    return true;
  }
  return candidateScore > previousScore;
}

export function readPersonalBest(
  stageId: string,
  rulesetVersion: string,
  storage: Pick<Storage, "getItem"> = localStorage,
): PersonalBestRecord | null {
  const raw = storage.getItem(personalBestStorageKey(stageId, rulesetVersion));
  if (raw == null || raw === "") {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PersonalBestRecord;
    if (
      typeof parsed.score !== "number" ||
      !Number.isFinite(parsed.score) ||
      typeof parsed.grade !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writePersonalBest(
  record: PersonalBestRecord,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  storage.setItem(
    personalBestStorageKey(record.stageId, record.rulesetVersion),
    JSON.stringify(record),
  );
}

export interface PersonalBestUpdateInput {
  stageId: string;
  rulesetVersion: string;
  score: number;
  grade: string;
  seed: string;
  nowMs?: number;
}

export interface PersonalBestUpdateResult {
  updated: boolean;
  /** Best after this attempt (new or previous). */
  personalBest: PersonalBestRecord | null;
  previousScore: number | null;
}

/**
 * Compare candidate score to local best; write only when improved.
 * Abort / missing score: callers should not invoke this.
 */
export function considerPersonalBest(
  input: PersonalBestUpdateInput,
  storage: Pick<Storage, "getItem" | "setItem"> = localStorage,
): PersonalBestUpdateResult {
  const previous = readPersonalBest(input.stageId, input.rulesetVersion, storage);
  const previousScore = previous?.score ?? null;
  if (!isNewPersonalBest(previousScore, input.score)) {
    return { updated: false, personalBest: previous, previousScore };
  }
  const record: PersonalBestRecord = {
    score: input.score,
    grade: input.grade,
    seed: input.seed,
    rulesetVersion: input.rulesetVersion,
    stageId: input.stageId,
    updatedAtMs: input.nowMs ?? Date.now(),
  };
  writePersonalBest(record, storage);
  return { updated: true, personalBest: record, previousScore };
}

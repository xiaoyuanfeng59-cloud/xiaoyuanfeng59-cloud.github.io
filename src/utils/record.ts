import { eventDefinitions, scoreGroups } from "../lib/framework";
import type { DailyRecord, DailyRecordPatch, TimelineItem } from "../types/record";

export function createEmptyRecord(date: string): DailyRecord {
  const now = new Date().toISOString();
  return {
    id: date,
    date,
    events: {},
    scores: {},
    review: {},
    meta: {
      created_at: now,
      updated_at: now,
      completed_core_count: 0,
    },
  };
}

export function isScoreGroupComplete(record: DailyRecord, groupId: string): boolean {
  const group = scoreGroups.find((item) => item.id === groupId);
  if (!group) return false;
  return group.fields.filter((field) => !field.optional).every((field) => record.scores[field.key] !== undefined);
}

export function isReviewCoreComplete(record: DailyRecord): boolean {
  const hasReviewSignal =
    record.review.water_ml !== undefined ||
    record.review.phone_minutes !== undefined ||
    record.review.phone_level !== undefined ||
    record.review.noise_level !== undefined;
  return Boolean(record.scores.bedtime_satisfaction_score && record.review.diary?.trim() && hasReviewSignal);
}

export function isTimelineItemComplete(record: DailyRecord, item: TimelineItem): boolean {
  if (item.kind === "event") return Boolean(record.events[item.key]);
  if (item.kind === "score") return isScoreGroupComplete(record, item.id);
  return isReviewCoreComplete(record);
}

export function countCompletedCore(record: DailyRecord): number {
  let count = 0;
  for (const event of eventDefinitions) {
    if (record.events[event.key]) count += 1;
  }
  for (const group of scoreGroups) {
    if (isScoreGroupComplete(record, group.id)) count += 1;
  }
  if (isReviewCoreComplete(record)) count += 1;
  return count;
}

export function completionRatio(record: DailyRecord): number {
  const total = eventDefinitions.length + scoreGroups.length + 1;
  return Math.round((countCompletedCore(record) / total) * 100);
}

export function mergeRecord(base: DailyRecord, patch: DailyRecordPatch): DailyRecord {
  const merged: DailyRecord = {
    ...base,
    ...patch,
    events: { ...base.events, ...patch.events },
    scores: { ...base.scores, ...patch.scores },
    review: { ...base.review, ...patch.review },
    meta: {
      ...base.meta,
      ...patch.meta,
      updated_at: new Date().toISOString(),
    },
  };
  merged.meta.completed_core_count = countCompletedCore(merged);
  return merged;
}

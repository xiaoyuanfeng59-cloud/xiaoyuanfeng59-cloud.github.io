import { eventDefinitions, scoreGroups, scoreLabels } from "../lib/framework";
import type { DailyRecord } from "../types/record";
import { formatTime } from "../utils/date";
import { isReviewCoreComplete } from "../utils/record";

const reviewColumns = ["water_ml", "phone_minutes", "phone_level", "noise_level", "diary"] as const;

export function flattenRecord(record: DailyRecord): Record<string, string | number | boolean> {
  const flat: Record<string, string | number | boolean> = {
    date: record.date,
    core_valid: isReviewCoreComplete(record),
    completed_core_count: record.meta.completed_core_count,
    is_backfilled: Boolean(record.meta.is_backfilled),
    created_at: record.meta.created_at,
    updated_at: record.meta.updated_at,
  };

  for (const item of eventDefinitions) {
    flat[item.key] = record.events[item.key] ?? "";
  }
  for (const group of scoreGroups) {
    for (const field of group.fields) {
      flat[field.key] = record.scores[field.key] ?? "";
    }
  }
  flat.bedtime_satisfaction_score = record.scores.bedtime_satisfaction_score ?? "";
  for (const key of reviewColumns) {
    flat[key] = record.review[key] ?? "";
  }
  return flat;
}

export function exportJson(records: DailyRecord[]): void {
  download(
    `self-trace-records-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(records, null, 2),
    "application/json",
  );
}

export function exportCsv(records: DailyRecord[]): void {
  const rows = records.map(flattenRecord);
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const body = [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join(
    "\n",
  );
  download(`self-trace-records-${new Date().toISOString().slice(0, 10)}.csv`, body, "text/csv;charset=utf-8");
}

export function todayMarkdown(record: DailyRecord): string {
  const lines = [`# ${record.date} 自我追溯`, ""];
  lines.push("## 事件");
  for (const item of eventDefinitions) {
    lines.push(`- ${item.label}：${record.events[item.key] ? formatTime(record.events[item.key]) : ""}`);
  }
  lines.push("", "## 评分");
  for (const group of scoreGroups) {
    lines.push(`### ${group.label}`);
    for (const field of group.fields) {
      lines.push(`- ${field.label}：${record.scores[field.key] ?? ""}`);
    }
  }
  lines.push(`- 今日自我满足感：${record.scores.bedtime_satisfaction_score ?? ""}`);
  lines.push("", "## 睡前复盘");
  lines.push(`- 今日喝水多少：${record.review.water_ml ?? ""} ml`);
  lines.push(`- 玩手机多少：${record.review.phone_minutes ?? ""} 分钟 / ${record.review.phone_level ?? ""}`);
  lines.push(`- 噪声暴露多少：${record.review.noise_level ?? ""}`);
  lines.push("", "## 简要日记大事记", record.review.diary ?? "");
  return lines.join("\n");
}

export function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function parseImportedRecords(text: string): DailyRecord[] {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("JSON 须为 DailyRecord 数组。");
  return parsed;
}

function csvCell(value: string | number | boolean | undefined): string {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function download(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const scoreColumnLabels = scoreLabels;

import { useEffect, useMemo, useState } from "react";
import { scoreGroups, timeline } from "../../lib/framework";
import { getRecord, patchRecord } from "../../db/indexedDb";
import type { DailyRecord, DailyRecordPatch, ScoreGroupDefinition, TimelineItem } from "../../types/record";
import { formatDateLabel } from "../../utils/date";
import { createEmptyRecord, isReviewCoreComplete, isScoreGroupComplete } from "../../utils/record";
import { TimelineList } from "../RecordControls";

type StateSectionId = "morning" | "noon" | "evening" | "night" | "review";

interface StateSection {
  id: StateSectionId;
  label: string;
  shortLabel: string;
  item: TimelineItem;
}

const stateSections: StateSection[] = [
  section("morning", "晨间状态", "晨", "morning_scores"),
  section("noon", "午间状态", "午", "noon_scores"),
  section("evening", "晚间状态", "晚", "evening_scores"),
  section("night", "夜间状态", "夜", "night_scores"),
  {
    id: "review",
    label: "睡前复盘",
    shortLabel: "复盘",
    item: timeline.find((item) => item.kind === "review")!,
  },
];

export function StatePage({ date, onDateChange }: { date: string; onDateChange: (date: string) => void }) {
  const [record, setRecord] = useState<DailyRecord>(() => createEmptyRecord(date));
  const [sectionIndex, setSectionIndex] = useState(() => defaultSectionIndex());

  useEffect(() => {
    getRecord(date).then(setRecord);
    const reload = () => getRecord(date).then(setRecord);
    window.addEventListener("records:changed", reload);
    return () => window.removeEventListener("records:changed", reload);
  }, [date]);

  async function onPatch(patch: DailyRecordPatch) {
    setRecord(await patchRecord(date, patch));
  }

  const completed = useMemo(() => {
    const scoreCount = scoreGroups.filter((group) => isScoreGroupComplete(record, group.id)).length;
    return scoreCount + (isReviewCoreComplete(record) ? 1 : 0);
  }, [record]);
  const total = scoreGroups.length + 1;
  const currentSection = stateSections[sectionIndex];

  return (
    <div className="page">
      <header className="hero compact">
        <p>{formatDateLabel(date)}</p>
        <h1>记录状态</h1>
        <label className="date-picker">
          <span>选择日期</span>
          <input className="input" type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
        </label>
        <div className="progress-row">
          <span>
            状态记录 {completed}/{total}
          </span>
          <span className={isReviewCoreComplete(record) ? "status-pill ok" : "status-pill"}>
            {isReviewCoreComplete(record) ? "核心有效" : "可补记"}
          </span>
        </div>
      </header>

      <section className="state-section-nav">
        <div className="section-tabs" aria-label="状态记录分段">
          {stateSections.map((section, index) => (
            <button
              className={[
                "section-tab",
                index === sectionIndex ? "active" : "",
                isSectionComplete(record, section) ? "done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={section.id}
              onClick={() => setSectionIndex(index)}
              type="button"
            >
              <span>{section.shortLabel}</span>
            </button>
          ))}
        </div>
        <div className="section-stepper">
          <button
            disabled={sectionIndex === 0}
            onClick={() => setSectionIndex((current) => Math.max(0, current - 1))}
            type="button"
          >
            上一段
          </button>
          <strong>{currentSection.label}</strong>
          <button
            disabled={sectionIndex === stateSections.length - 1}
            onClick={() => setSectionIndex((current) => Math.min(stateSections.length - 1, current + 1))}
            type="button"
          >
            下一段
          </button>
        </div>
      </section>

      <TimelineList items={[currentSection.item]} record={record} onPatch={onPatch} />
    </div>
  );
}

function section(id: StateSectionId, label: string, shortLabel: string, groupId: string): StateSection {
  return {
    id,
    label,
    shortLabel,
    item: timeline.find((item): item is ScoreGroupDefinition => item.kind === "score" && item.id === groupId)!,
  };
}

function isSectionComplete(record: DailyRecord, section: StateSection): boolean {
  if (section.item.kind === "review") return isReviewCoreComplete(record);
  if (section.item.kind === "score") return isScoreGroupComplete(record, section.item.id);
  return false;
}

function defaultSectionIndex(): number {
  const hour = new Date().getHours();
  if (hour < 11) return 0;
  if (hour < 16) return 1;
  if (hour < 21) return 2;
  if (hour < 23) return 3;
  return 4;
}

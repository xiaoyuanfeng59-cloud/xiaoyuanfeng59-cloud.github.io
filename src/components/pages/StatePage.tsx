import { useEffect, useMemo, useState } from "react";
import { scoreGroups, timeline } from "../../lib/framework";
import { getRecord, patchRecord } from "../../db/indexedDb";
import type { DailyRecord, DailyRecordPatch, TimelineItem } from "../../types/record";
import { formatDateLabel } from "../../utils/date";
import { createEmptyRecord, isReviewCoreComplete, isScoreGroupComplete } from "../../utils/record";
import { TimelineList } from "../RecordControls";

const stateItems = timeline.filter((item): item is TimelineItem => item.kind !== "event");

export function StatePage({ date, onDateChange }: { date: string; onDateChange: (date: string) => void }) {
  const [record, setRecord] = useState<DailyRecord>(() => createEmptyRecord(date));

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

      <TimelineList items={stateItems} record={record} onPatch={onPatch} />
    </div>
  );
}

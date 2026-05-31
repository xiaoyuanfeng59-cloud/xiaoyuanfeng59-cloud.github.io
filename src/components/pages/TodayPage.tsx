import { useEffect, useState } from "react";
import { getRecord, patchRecord } from "../../db/indexedDb";
import type { DailyRecord, DailyRecordPatch, TimelineItem } from "../../types/record";
import { formatDateLabel } from "../../utils/date";
import { completionRatio, createEmptyRecord, isReviewCoreComplete } from "../../utils/record";
import { CurrentItemHint, firstIncompleteItem, TimelineList } from "../RecordControls";

export function TodayPage({ date, items }: { date: string; items: TimelineItem[] }) {
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

  const current = firstIncompleteItem(record, items);
  const coreValid = isReviewCoreComplete(record);

  return (
    <div className="page">
      <header className="hero">
        <p>{formatDateLabel(date)}</p>
        <h1>今日记录</h1>
        <div className="progress-row">
          <span>完成度 {completionRatio(record)}%</span>
          <span className={coreValid ? "status-pill ok" : "status-pill"}>{coreValid ? "核心记录有效" : "可补记"}</span>
        </div>
        <div className="progress-track">
          <div style={{ width: `${completionRatio(record)}%` }} />
        </div>
      </header>

      <CurrentItemHint item={current} />
      <TimelineList items={items} record={record} onPatch={onPatch} />
    </div>
  );
}

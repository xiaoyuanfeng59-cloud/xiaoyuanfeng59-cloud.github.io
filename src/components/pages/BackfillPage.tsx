import { useEffect, useState } from "react";
import { getRecord, patchRecord } from "../../db/indexedDb";
import type { DailyRecord, DailyRecordPatch, TimelineItem } from "../../types/record";
import { toLocalDate, yesterday } from "../../utils/date";
import { completionRatio, createEmptyRecord, isReviewCoreComplete } from "../../utils/record";
import { TimelineList } from "../RecordControls";

export function BackfillPage({ items }: { items: TimelineItem[] }) {
  const [date, setDate] = useState(yesterday());
  const [record, setRecord] = useState<DailyRecord>(() => createEmptyRecord(date));

  useEffect(() => {
    getRecord(date).then(setRecord);
  }, [date]);

  async function onPatch(patch: DailyRecordPatch) {
    const isBackfilled = date !== toLocalDate();
    setRecord(await patchRecord(date, { ...patch, meta: { ...patch.meta, is_backfilled: isBackfilled } }));
  }

  return (
    <div className="page">
      <header className="hero compact">
        <p>错过也没关系</p>
        <h1>补记</h1>
        <label className="date-picker">
          <span>选择日期</span>
          <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <div className="progress-row">
          <span>完成度 {completionRatio(record)}%</span>
          <span className={isReviewCoreComplete(record) ? "status-pill ok" : "status-pill"}>
            {isReviewCoreComplete(record) ? "核心记录有效" : "可以继续补"}
          </span>
        </div>
      </header>
      <TimelineList items={items} record={record} onPatch={onPatch} backfillMode />
    </div>
  );
}

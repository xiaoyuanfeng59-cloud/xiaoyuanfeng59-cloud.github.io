import { useEffect, useMemo, useState } from "react";
import { eventDefinitions } from "../../lib/framework";
import { getRecord, patchRecord } from "../../db/indexedDb";
import type { DailyRecord, DailyRecordPatch } from "../../types/record";
import { formatDateLabel } from "../../utils/date";
import { createEmptyRecord } from "../../utils/record";
import { CurrentItemHint, firstIncompleteItem, TimelineList } from "../RecordControls";

export function TimePage({ date, onDateChange }: { date: string; onDateChange: (date: string) => void }) {
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

  const current = firstIncompleteItem(record, eventDefinitions);
  const completed = useMemo(
    () => eventDefinitions.filter((item) => Boolean(record.events[item.key])).length,
    [record.events],
  );

  return (
    <div className="page">
      <header className="hero compact">
        <p>{formatDateLabel(date)}</p>
        <h1>记录时间</h1>
        <label className="date-picker">
          <span>选择日期</span>
          <input className="input" type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
        </label>
        <div className="progress-row">
          <span>
            时间节点 {completed}/{eventDefinitions.length}
          </span>
          <span className="status-pill">可随时补</span>
        </div>
      </header>

      <CurrentItemHint item={current} />
      <TimelineList items={eventDefinitions} record={record} onPatch={onPatch} backfillMode />
    </div>
  );
}

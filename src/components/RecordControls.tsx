import { useEffect, useRef, useState } from "react";
import type {
  DailyRecord,
  DailyRecordPatch,
  EventDefinition,
  PhoneLevel,
  ReviewDefinition,
  ScoreGroupDefinition,
  TimelineItem,
} from "../types/record";
import { formatTime, fromDateTimeLocalValue, toDateTimeLocalValue } from "../utils/date";
import { isReviewCoreComplete, isScoreGroupComplete, isTimelineItemComplete } from "../utils/record";

interface CommonProps {
  record: DailyRecord;
  onPatch: (patch: DailyRecordPatch) => void;
  backfillMode?: boolean;
}

export function TimelineList({ items, record, onPatch, backfillMode }: CommonProps & { items: TimelineItem[] }) {
  return (
    <div className="timeline-list">
      {items.map((item) => {
        if (item.kind === "event") {
          return <EventButton key={item.key} item={item} record={record} onPatch={onPatch} backfillMode={backfillMode} />;
        }
        if (item.kind === "score") return <ScoreCard key={item.id} group={item} record={record} onPatch={onPatch} />;
        return <ReviewCard key={item.id} item={item} record={record} onPatch={onPatch} />;
      })}
    </div>
  );
}

export function EventButton({ item, record, onPatch, backfillMode }: CommonProps & { item: EventDefinition }) {
  const [editing, setEditing] = useState(false);
  const value = record.events[item.key];
  const done = Boolean(value);
  const editValue = toDateTimeLocalValue(value) || defaultDateTimeLocal(record.date);

  if (backfillMode) {
    return (
      <section className={`event-row ${done ? "done" : ""}`}>
        <div className="event-backfill">
          <div>
            <span>{item.label}</span>
            <strong>{done ? formatTime(value) : "可直接补时间"}</strong>
          </div>
          <div className="event-backfill-actions">
            <button onClick={() => onPatch({ events: { [item.key]: new Date().toISOString() } })} type="button">
              记为现在
            </button>
            <button onClick={() => setEditing((current) => !current)} type="button">
              {editing ? "收起时间" : "选择时间"}
            </button>
            {done && (
              <button onClick={() => onPatch({ events: { [item.key]: undefined } })} type="button">
                撤销
              </button>
            )}
          </div>
          {editing && (
            <input
              className="input"
              type="datetime-local"
              value={editValue}
              onChange={(event) => onPatch({ events: { [item.key]: fromDateTimeLocalValue(event.target.value) } })}
            />
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={`event-row ${done ? "done" : ""}`}>
      <button
        className="event-main"
        onClick={() => onPatch({ events: { [item.key]: new Date().toISOString() } })}
        type="button"
      >
        <span>{item.label}</span>
        <strong>{done ? formatTime(value) : "点一下记录现在"}</strong>
      </button>
      {(done || editing) && (
        <div className="row-actions">
          <button className="ghost-button" onClick={() => setEditing((current) => !current)} type="button">
            {editing ? "收起" : "修改"}
          </button>
          {done && (
            <button className="ghost-button" onClick={() => onPatch({ events: { [item.key]: undefined } })} type="button">
              撤销
            </button>
          )}
        </div>
      )}
      {editing && (
        <input
          className="input"
          type="datetime-local"
          value={editValue}
          onChange={(event) => onPatch({ events: { [item.key]: fromDateTimeLocalValue(event.target.value) } })}
        />
      )}
    </section>
  );
}

export function ScoreCard({ group, record, onPatch }: CommonProps & { group: ScoreGroupDefinition }) {
  const complete = isScoreGroupComplete(record, group.id);

  function saveDefaults() {
    const next: DailyRecord["scores"] = {};
    for (const field of group.fields) {
      if (field.optional) continue;
      next[field.key] = record.scores[field.key] ?? 5;
    }
    onPatch({ scores: next });
  }

  return (
    <section className={`panel score-card ${complete ? "done" : ""}`}>
      <div className="panel-title">
        <h2>{group.label}</h2>
        <button className="small-button" type="button" onClick={saveDefaults}>
          保存本组
        </button>
      </div>
      {group.fields.map((field) => {
        if (field.input === "number") {
          return (
            <label className="field-block" key={field.key}>
              <span className="field-head">
                <span>{field.label}</span>
                <small>{field.anchor}</small>
              </span>
              <input
                className="input"
                inputMode="decimal"
                placeholder="可空"
                type="number"
                value={record.scores[field.key] ?? ""}
                onChange={(event) =>
                  onPatch({
                    scores: {
                      [field.key]: event.target.value === "" ? undefined : Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          );
        }

        const value = record.scores[field.key] ?? 5;
        return (
          <div className="field-block" key={field.key}>
            <div className="field-head">
              <span>{field.label}</span>
            </div>
            <ScorePicker value={value} onChange={(next) => onPatch({ scores: { [field.key]: next } })} />
            <small className="anchor">{field.anchor}</small>
          </div>
        );
      })}
    </section>
  );
}

export function ReviewCard({ item, record, onPatch }: CommonProps & { item: ReviewDefinition }) {
  const complete = isReviewCoreComplete(record);
  const satisfaction = record.scores.bedtime_satisfaction_score ?? 5;

  return (
    <section className={`panel review-card ${complete ? "done" : ""}`}>
      <div className="panel-title">
        <h2>{item.label}</h2>
        <span className={complete ? "status-pill ok" : "status-pill"}>{complete ? "核心有效" : "可补记"}</span>
      </div>

      <div className="field-block">
        <div className="field-head">
          <span>今日喝水多少</span>
          <b>{record.review.water_ml ? `${record.review.water_ml} ml` : "未填"}</b>
        </div>
        <input
          className="input"
          inputMode="numeric"
          placeholder="ml"
          type="number"
          value={record.review.water_ml ?? ""}
          onChange={(event) =>
            onPatch({ review: { water_ml: event.target.value === "" ? undefined : Number(event.target.value) } })
          }
        />
        <div className="quick-grid">
          {[500, 1000, 1500, 2000, 2500, 3000].map((amount) => (
            <button className="chip" key={amount} onClick={() => onPatch({ review: { water_ml: amount } })} type="button">
              {amount}
            </button>
          ))}
        </div>
      </div>

      <div className="field-block">
        <div className="field-head">
          <span>玩手机多少</span>
          <b>{record.review.phone_level ?? "未选"}</b>
        </div>
        <input
          className="input"
          inputMode="numeric"
          placeholder="分钟，可空"
          type="number"
          value={record.review.phone_minutes ?? ""}
          onChange={(event) =>
            onPatch({ review: { phone_minutes: event.target.value === "" ? undefined : Number(event.target.value) } })
          }
        />
        <div className="quick-grid four">
          {(["少", "中", "多", "失控"] as PhoneLevel[]).map((level) => (
            <button
              className={record.review.phone_level === level ? "chip selected" : "chip"}
              key={level}
              onClick={() => onPatch({ review: { phone_level: level } })}
              type="button"
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="field-block">
        <div className="field-head">
          <span>噪声暴露多少</span>
          <b>{record.review.noise_level ?? "未选"}</b>
        </div>
        <div className="quick-grid four">
          {(["少", "中", "多", "严重"] as const).map((level) => (
            <button
              className={record.review.noise_level === level ? "chip selected" : "chip"}
              key={level}
              onClick={() => onPatch({ review: { noise_level: level } })}
              type="button"
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="field-block">
        <div className="field-head">
          <span>今日自我满足感</span>
        </div>
        <ScorePicker value={satisfaction} onChange={(next) => onPatch({ scores: { bedtime_satisfaction_score: next } })} />
        <small className="anchor">1 今天很失败 / 很空耗；5 普通的一天；10 对今天非常认可。</small>
      </div>

      <label className="field-block">
        <span className="field-head">
          <span>简要日记大事记</span>
          <small>1-5 句话即可</small>
        </span>
        <DiaryTextarea value={record.review.diary ?? ""} onSave={(diary) => onPatch({ review: { diary } })} />
      </label>
    </section>
  );
}

export function CurrentItemHint({ item }: { item?: TimelineItem }) {
  if (!item) return <div className="current-hint done">今天的主要节点都记录过了。</div>;
  return (
    <div className="current-hint">
      <span>当前最适合记录</span>
      <strong>{item.label}</strong>
      <small>可以补记，不影响今日数据有效性。</small>
    </div>
  );
}

export function firstIncompleteItem(record: DailyRecord, items: TimelineItem[]): TimelineItem | undefined {
  return items.find((item) => !isTimelineItemComplete(record, item));
}

function ScorePicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const safeValue = Math.min(10, Math.max(1, Math.round(value)));
  return (
    <div className="score-picker">
      <div className="score-stepper">
        <button type="button" onClick={() => onChange(Math.max(1, safeValue - 1))} aria-label="减一分">
          -
        </button>
        <strong>{safeValue}</strong>
        <button type="button" onClick={() => onChange(Math.min(10, safeValue + 1))} aria-label="加一分">
          +
        </button>
      </div>
      <div className="score-grid" role="group" aria-label="选择 1 到 10 分">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
          <button
            className={safeValue === score ? "score-dot selected" : "score-dot"}
            key={score}
            onClick={() => onChange(score)}
            type="button"
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

function defaultDateTimeLocal(date: string): string {
  const now = new Date();
  const hour = `${now.getHours()}`.padStart(2, "0");
  const minute = `${now.getMinutes()}`.padStart(2, "0");
  return `${date}T${hour}:${minute}`;
}

function DiaryTextarea({ value, onSave }: { value: string; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const composingRef = useRef(false);

  useEffect(() => {
    if (!composingRef.current) setDraft(value);
  }, [value]);

  return (
    <textarea
      className="textarea"
      placeholder="今天发生了什么重要事情？"
      rows={5}
      value={draft}
      onBlur={(event) => onSave(event.currentTarget.value)}
      onChange={(event) => {
        setDraft(event.currentTarget.value);
        if (!composingRef.current) onSave(event.currentTarget.value);
      }}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={(event) => {
        composingRef.current = false;
        setDraft(event.currentTarget.value);
        onSave(event.currentTarget.value);
      }}
    />
  );
}

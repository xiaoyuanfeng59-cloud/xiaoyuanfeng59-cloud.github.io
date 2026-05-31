import { useEffect, useMemo, useState } from "react";
import { eventDefinitions, scoreGroups } from "../../lib/framework";
import { listRecords } from "../../db/indexedDb";
import type { DailyRecord, ScoreKey } from "../../types/record";
import { toLocalDate } from "../../utils/date";
import { isReviewCoreComplete } from "../../utils/record";

const studyKeys: ScoreKey[] = ["noon_morning_study_score", "evening_afternoon_study_score", "night_daily_study_score"];
const moodKeys: ScoreKey[] = ["noon_mood_score", "evening_mood_score", "night_mood_score", "morning_mood_score"];

export function DataPage() {
  const [records, setRecords] = useState<DailyRecord[]>([]);

  useEffect(() => {
    const reload = () => listRecords().then(setRecords);
    reload();
    window.addEventListener("records:changed", reload);
    return () => window.removeEventListener("records:changed", reload);
  }, []);

  const stats = useMemo(() => buildStats(records), [records]);
  const recent = records.slice(-7);

  return (
    <div className="page">
      <header className="hero compact">
        <p>轻量趋势</p>
        <h1>数据概览</h1>
      </header>

      <section className="metric-grid">
        <Metric label="连续记录天数" value={`${stats.streak} 天`} />
        <Metric label="已记录总天数" value={`${records.length} 天`} />
        <Metric label="今日核心记录" value={stats.todayCore ? "已完成" : "未完成"} />
        <Metric label="缺失字段" value={`${stats.missingCount} 项`} />
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>最近 7 天自我满足感</h2>
        </div>
        <LineChart records={recent} />
      </section>

      <section className="metric-grid">
        <Metric label="7 天学习均值" value={formatAverage(averageScores(recent, studyKeys))} />
        <Metric label="7 天情绪均值" value={formatAverage(averageScores(recent, moodKeys))} />
        <Metric label="7 天睡眠自评均值" value={formatAverage(averageScores(recent, ["morning_sleep_self_score"]))} />
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>缺失值概览</h2>
        </div>
        <div className="missing-list">
          {stats.missingTop.length === 0 ? (
            <p className="muted">目前没有可统计的缺失项。</p>
          ) : (
            stats.missingTop.map((item) => (
              <div key={item.key}>
                <span>{item.label}</span>
                <b>{item.count}</b>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LineChart({ records }: { records: DailyRecord[] }) {
  const values = records.map((record) => record.scores.bedtime_satisfaction_score ?? null);
  const points = values
    .map((value, index) => {
      if (value === null) return null;
      const x = 18 + index * (264 / Math.max(values.length - 1, 1));
      const y = 122 - ((value - 1) / 9) * 96;
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <div className="chart-wrap">
      <svg viewBox="0 0 300 150" role="img" aria-label="最近 7 天自我满足感折线图">
        {[1, 5, 10].map((tick) => (
          <g key={tick}>
            <line x1="12" x2="288" y1={122 - ((tick - 1) / 9) * 96} y2={122 - ((tick - 1) / 9) * 96} />
            <text x="2" y={126 - ((tick - 1) / 9) * 96}>
              {tick}
            </text>
          </g>
        ))}
        <polyline points={points} />
        {values.map((value, index) => {
          if (value === null) return null;
          const x = 18 + index * (264 / Math.max(values.length - 1, 1));
          const y = 122 - ((value - 1) / 9) * 96;
          return <circle cx={x} cy={y} key={`${records[index].date}-${value}`} r="4" />;
        })}
      </svg>
      <div className="chart-labels">
        {records.map((record) => (
          <span key={record.date}>{record.date.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

function buildStats(records: DailyRecord[]) {
  const today = toLocalDate();
  const byDate = new Map(records.map((record) => [record.date, record]));
  let cursor = new Date(`${today}T00:00:00`);
  let streak = 0;
  while (true) {
    const key = toLocalDate(cursor);
    const record = byDate.get(key);
    if (!record || !isReviewCoreComplete(record)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const missing = new Map<string, { label: string; count: number }>();
  for (const record of records) {
    for (const event of eventDefinitions) {
      if (!record.events[event.key]) addMissing(missing, event.key, event.label);
    }
    for (const group of scoreGroups) {
      for (const field of group.fields) {
        if (!field.optional && record.scores[field.key] === undefined) addMissing(missing, field.key, field.label);
      }
    }
    if (record.scores.bedtime_satisfaction_score === undefined) {
      addMissing(missing, "bedtime_satisfaction_score", "今日自我满足感");
    }
    if (!record.review.diary?.trim()) addMissing(missing, "diary", "简要日记大事记");
  }

  const missingTop = Array.from(missing.entries())
    .map(([key, item]) => ({ key, ...item }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    streak,
    todayCore: Boolean(byDate.get(today) && isReviewCoreComplete(byDate.get(today)!)),
    missingCount: missingTop.reduce((sum, item) => sum + item.count, 0),
    missingTop,
  };
}

function addMissing(map: Map<string, { label: string; count: number }>, key: string, label: string) {
  const current = map.get(key) ?? { label, count: 0 };
  current.count += 1;
  map.set(key, current);
}

function averageScores(records: DailyRecord[], keys: ScoreKey[]): number | null {
  const values = records.flatMap((record) => keys.map((key) => record.scores[key])).filter((value) => value !== undefined);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatAverage(value: number | null): string {
  return value === null ? "暂无" : value.toFixed(1);
}

import { useEffect, useMemo, useState } from "react";
import { getSettings, saveSettings } from "./db/indexedDb";
import type { AppSettings, ReminderSetting } from "./types/record";
import { dismissReminderToday, findDueReminder, skipReminderToday, snoozeReminder } from "./services/notifications";
import { DataPage } from "./components/pages/DataPage";
import { SettingsPage } from "./components/pages/SettingsPage";
import { StatePage } from "./components/pages/StatePage";
import { ThemeDevPanel } from "./components/ThemeDevPanel";
import { TimePage } from "./components/pages/TimePage";
import { toLocalDate } from "./utils/date";

type Tab = "time" | "state" | "data" | "settings";

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "time", label: "时间", icon: "●" },
  { id: "state", label: "状态", icon: "↺" },
  { id: "data", label: "数据", icon: "⌁" },
  { id: "settings", label: "设置", icon: "⚙" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("time");
  const [recordDate, setRecordDate] = useState(toLocalDate());
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [dueReminder, setDueReminder] = useState<ReminderSetting | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!settings) return;
    const check = () => setDueReminder(findDueReminder(settings));
    check();
    const timer = window.setInterval(check, 30_000);
    return () => window.clearInterval(timer);
  }, [settings]);

  async function updateReminder(nextReminder: ReminderSetting) {
    if (!settings) return;
    const next = {
      ...settings,
      reminders: settings.reminders.map((item) => (item.key === nextReminder.key ? nextReminder : item)),
    };
    setSettings(await saveSettings(next));
  }

  const page = useMemo(() => {
    if (activeTab === "time") return <TimePage date={recordDate} onDateChange={setRecordDate} />;
    if (activeTab === "state") return <StatePage date={recordDate} onDateChange={setRecordDate} />;
    if (activeTab === "data") return <DataPage />;
    return <SettingsPage settings={settings} setSettings={setSettings} />;
  }, [activeTab, recordDate, settings]);

  return (
    <div className="app-shell">
      {dueReminder && (
        <div className="reminder-banner">
          <div>
            <strong>{dueReminder.label}</strong>
            <p>{dueReminder.message}</p>
          </div>
          <div className="reminder-actions">
            <button onClick={() => setActiveTab("time")} type="button">
              去记录
            </button>
            <button onClick={() => updateReminder(snoozeReminder(dueReminder, 10))} type="button">
              10 分钟
            </button>
            <button onClick={() => updateReminder(snoozeReminder(dueReminder, 30))} type="button">
              30 分钟
            </button>
            <button onClick={() => updateReminder(snoozeReminder(dueReminder, 60))} type="button">
              1 小时
            </button>
            <button onClick={() => updateReminder(skipReminderToday(dueReminder))} type="button">
              今天跳过
            </button>
            <button onClick={() => updateReminder(dismissReminderToday(dueReminder))} type="button">
              已处理
            </button>
          </div>
        </div>
      )}

      <main className="page-wrap">{page}</main>

      <nav className="bottom-nav" aria-label="主导航">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? "active" : ""}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
      <ThemeDevPanel />
    </div>
  );
}

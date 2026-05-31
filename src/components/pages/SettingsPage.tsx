import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { defaultReminders, scoreGroups } from "../../lib/framework";
import { clearAllRecords, getRecord, getSettings, importRecords, listRecords, saveSettings } from "../../db/indexedDb";
import { copyText, exportCsv, exportJson, parseImportedRecords, todayMarkdown } from "../../services/export";
import {
  detectNotificationSupport,
  downloadIcs,
  requestNotificationPermission,
  sendTestPush,
  skipReminderToday,
  snoozeReminder,
  subscribeToPush,
} from "../../services/notifications";
import type { AppSettings, ReminderSetting } from "../../types/record";
import { toLocalDate } from "../../utils/date";

export function SettingsPage({
  settings,
  setSettings,
}: {
  settings: AppSettings | null;
  setSettings: (settings: AppSettings) => void;
}) {
  const [recordsCount, setRecordsCount] = useState(0);
  const support = useMemo(() => detectNotificationSupport(), []);

  useEffect(() => {
    if (!settings) getSettings().then(setSettings);
    listRecords().then((records) => setRecordsCount(records.length));
  }, [settings, setSettings]);

  async function updateReminder(nextReminder: ReminderSetting) {
    if (!settings) return;
    const saved = await saveSettings({
      ...settings,
      reminders: settings.reminders.map((item) => (item.key === nextReminder.key ? nextReminder : item)),
    });
    setSettings(saved);
    if (saved.notificationPermission === "granted") {
      subscribeToPush(saved.reminders).catch(() => undefined);
    }
  }

  async function enableNotifications() {
    if (!settings) return;
    const permission = await requestNotificationPermission();
    let pushState = "";
    if (permission === "granted") {
      pushState = await subscribeToPush(settings.reminders);
    }
    setSettings(await saveSettings({ ...settings, notificationPermission: permission }));
    if (pushState === "subscribed") window.alert("通知已开启，并已连接 Web Push 后端。");
    if (pushState === "no-server") window.alert("通知权限已处理。当前未配置推送后端，将使用应用内提醒和日历提醒。");
    if (pushState === "unsupported") window.alert("当前环境不支持后台推送，将使用应用内提醒和日历提醒。");
  }

  async function onSendTestPush() {
    const result = await sendTestPush();
    window.alert(result === "sent" ? "已请求发送测试通知。" : "未配置推送后端，将使用应用内提醒和日历提醒。");
  }

  async function onExportJson() {
    exportJson(await listRecords());
  }

  async function onExportCsv() {
    exportCsv(await listRecords());
  }

  async function onCopyMarkdown() {
    const record = await getRecord(toLocalDate());
    await copyText(todayMarkdown(record));
    window.alert("已复制今日 Markdown 日记。");
  }

  async function onImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importRecords(parseImportedRecords(text));
    setRecordsCount((await listRecords()).length);
    window.alert("导入完成。");
  }

  async function onClear() {
    const first = window.confirm("确定要清空本机全部记录吗？请先确认已经导出备份。");
    if (!first) return;
    const second = window.confirm("再次确认：清空后无法从本应用内恢复。");
    if (!second) return;
    await clearAllRecords();
    setRecordsCount(0);
  }

  const actualSettings =
    settings ??
    ({
      id: "settings",
      reminders: defaultReminders,
      updated_at: new Date().toISOString(),
    } satisfies AppSettings);

  return (
    <div className="page">
      <header className="hero compact">
        <p>提醒、备份和说明</p>
        <h1>设置</h1>
      </header>

      <section className="panel">
        <div className="panel-title">
          <h2>通知权限检测</h2>
        </div>
        <div className="support-grid">
          <span>Service Worker</span>
          <b>{support.serviceWorker ? "支持" : "不支持"}</b>
          <span>Notifications API</span>
          <b>{support.notifications ? "支持" : "不支持"}</b>
          <span>PushManager</span>
          <b>{support.pushManager ? "支持" : "不支持"}</b>
          <span>当前权限</span>
          <b>{actualSettings.notificationPermission ?? support.permission}</b>
        </div>
        <p className="soft-note">请先用 Safari 打开网页，并添加到主屏幕，再开启通知。通知不可用时，应用内提醒和日历文件仍可用。</p>
        <div className="button-row">
          <button className="primary-button" onClick={enableNotifications} type="button">
            开启通知
          </button>
          <button className="secondary-button" onClick={onSendTestPush} type="button">
            测试通知
          </button>
          <button className="secondary-button" onClick={() => downloadIcs(actualSettings)} type="button">
            导出日历提醒
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>提醒设置</h2>
        </div>
        <div className="reminder-list">
          {actualSettings.reminders.map((reminder) => (
            <ReminderRow key={reminder.key} reminder={reminder} onUpdate={updateReminder} />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>导出 / 导入</h2>
          <span className="status-pill">{recordsCount} 天</span>
        </div>
        <div className="button-grid">
          <button className="secondary-button" onClick={onExportCsv} type="button">
            导出 CSV
          </button>
          <button className="secondary-button" onClick={onExportJson} type="button">
            导出 JSON
          </button>
          <button className="secondary-button" onClick={onCopyMarkdown} type="button">
            复制今日 Markdown
          </button>
          <label className="file-button">
            导入 JSON
            <input accept="application/json" type="file" onChange={onImport} />
          </label>
        </div>
        <button className="danger-button" onClick={onClear} type="button">
          清空本机数据
        </button>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>评分锚点</h2>
        </div>
        <div className="anchor-list">
          {scoreGroups.flatMap((group) =>
            group.fields.map((field) => (
              <div key={`${group.id}-${field.key}`}>
                <strong>{field.label}</strong>
                <span>{field.anchor}</span>
              </div>
            )),
          )}
          <div>
            <strong>今日自我满足感</strong>
            <span>1 今天很失败 / 很空耗；5 普通的一天；10 对今天非常认可。</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReminderRow({
  reminder,
  onUpdate,
}: {
  reminder: ReminderSetting;
  onUpdate: (reminder: ReminderSetting) => void;
}) {
  return (
    <div className="reminder-row">
      <div className="reminder-head">
        <label className="switch">
          <input
            checked={reminder.enabled}
            type="checkbox"
            onChange={(event) => onUpdate({ ...reminder, enabled: event.target.checked })}
          />
          <span />
        </label>
        <div>
          <strong>{reminder.label}</strong>
          <small>{reminder.required ? "关键提醒" : "可选提醒"}</small>
        </div>
        <input
          className="time-input"
          type="time"
          value={reminder.time}
          onChange={(event) => onUpdate({ ...reminder, time: event.target.value })}
        />
      </div>
      <p>{reminder.message}</p>
      <div className="row-actions">
        <button className="ghost-button" onClick={() => onUpdate(skipReminderToday(reminder))} type="button">
          今天跳过
        </button>
        <button className="ghost-button" onClick={() => onUpdate(snoozeReminder(reminder, 10))} type="button">
          10 分钟
        </button>
        <button className="ghost-button" onClick={() => onUpdate(snoozeReminder(reminder, 30))} type="button">
          30 分钟
        </button>
        <button className="ghost-button" onClick={() => onUpdate(snoozeReminder(reminder, 60))} type="button">
          1 小时
        </button>
      </div>
    </div>
  );
}
